// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IWeather.sol";
import "../../struct/Weather.sol";
import "../../struct/Item.sol";

/**
 * @title FishingLogic
 * @author RYG.Labs
 * @notice Logic contract for the Fishing system
 * @dev Implements fishing mechanics with weather effects and chest rewards
 */
contract FishingLogic {
    /// @notice World contract for access control
    IWorld public world;

    /// @notice Inventory component contract
    IInventoryComponent public inventoryComponent;

    /// @notice Item component contract
    IItemComponent public itemComponent;

    /// @notice Player component contract
    IPlayerComponent public playerComponent;

    /// @notice Weather component contract
    IWeatherComponent public weatherComponent;

    /// @notice Cooldown period between fishing attempts
    uint256 public fishingCooldown = 30 seconds;

    /// @notice ID of the fishing rod item
    uint256 public constant FISHING_ROD_ID = 9;

    /// @notice ID of the fishing chest item
    uint256 public constant FISHING_CHEST_ID = 33;

    /// @notice Stores the last fishing time for each player
    mapping(address => uint256) public lastFishingTime;

    /// @notice Nonce variable for generating random numbers
    uint256 private nonce;

    /**
     * @notice Constructor to initialize the fishing logic contract
     * @param _world The address of the World contract
     * @param _inventoryComponent The address of the Inventory component
     * @param _itemComponent The address of the Item component
     * @param _playerComponent The address of the Player component
     * @param _weatherComponent The address of the Weather component
     */
    constructor(
        address _world,
        address _inventoryComponent,
        address _itemComponent,
        address _playerComponent,
        address _weatherComponent
    ) {
        world = IWorld(_world);
        inventoryComponent = IInventoryComponent(_inventoryComponent);
        itemComponent = IItemComponent(_itemComponent);
        playerComponent = IPlayerComponent(_playerComponent);
        weatherComponent = IWeatherComponent(_weatherComponent);
    }

    /// @notice Restricts access to admin only
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Emitted when a player starts fishing
    /// @param player The address of the player
    /// @param timestamp The timestamp when fishing started
    event FishingStarted(address indexed player, uint256 timestamp);

    /// @notice Emitted when fishing is completed
    /// @param player The address of the player
    /// @param itemId The ID of the item received
    /// @param quantity The quantity received
    event FishingCompleted(
        address indexed player,
        uint256 itemId,
        uint256 quantity
    );

    /// @notice Emitted when a chest is opened
    /// @param player The address of the player
    /// @param chestId The ID of the chest
    /// @param itemIds The IDs of items received
    /// @param amounts The amounts of each item received
    event ChestOpened(
        address indexed player,
        uint256 chestId,
        uint256[] itemIds,
        uint256[] amounts
    );

    /// @notice Struct to represent a reward
    /// @param itemId The ID of the reward item
    /// @param amount The amount of the reward
    struct Reward {
        uint256 itemId;
        uint256 amount;
    }

    /**
     * @notice Perform fishing action
     * @dev Checks cooldown, player level, fishing rod availability, and weather conditions
     */
    function fishing() external {
        // Check cooldown
        require(
            block.timestamp >= lastFishingTime[msg.sender] + fishingCooldown,
            "Fishing cooldown has not expired"
        );

        // Check player level
        Player memory player = playerComponent.getPlayer(msg.sender);
        require(player.level >= 1, "Player level must be at least 1");

        // Check if player has fishing rod
        InventoryItem memory fishingRod = inventoryComponent.getItem(
            msg.sender,
            FISHING_ROD_ID
        );
        require(
            fishingRod.quantity > 0,
            "Player must have at least 1 fishing rod"
        );

        // Emit fishing started event
        emit FishingStarted(msg.sender, block.timestamp);

        // Get current weather information
        WeatherStructs.Weather memory currentWeather = weatherComponent
            .getCurrentWeather();

        // Determine chest probability based on weather
        uint256 chestProbability = _getChestProbabilityByWeather(
            currentWeather.state
        );

        // Generate random number from 1-100
        uint256 randomNum = _generateRandomNumber(100) + 1;
        InventoryItem memory fishingChest = inventoryComponent.getItem(
            msg.sender,
            FISHING_CHEST_ID
        );

        // Check if player receives a chest
        if (randomNum <= chestProbability) {
            // Add chest to player's inventory
            inventoryComponent.setItem(
                msg.sender,
                FISHING_CHEST_ID, // Chest ID
                fishingChest.quantity + 1, // Quantity
                fishingChest.durability, // Durability
                0 // Expiration time
            );

            emit FishingCompleted(msg.sender, FISHING_CHEST_ID, 1);
        } else {
            // No reward
            emit FishingCompleted(msg.sender, 0, 0);
        }

        // Reduce fishing rod durability
        _reduceFishingRodDurability(msg.sender);

        // Update last fishing time
        lastFishingTime[msg.sender] = block.timestamp;
    }

    /**
     * @notice Open a fishing chest
     * @dev Randomly selects up to 3 items from the chest's drop table
     * @param _chestId The ID of the chest to open
     */
    function openChest(uint256 _chestId) external {
        // Check if chest exists in inventory
        InventoryItem memory chest = inventoryComponent.getItem(
            msg.sender,
            _chestId
        );
        require(chest.quantity > 0, "Chest not found");

        // Get list of items that can drop from chest
        ItemStructs.ItemDrop[] memory drops = itemComponent.getItemDrops(
            _chestId
        );
        require(drops.length > 0, "No item drops configured");
        require(drops.length <= 20, "Too many item drops"); // Gas limit

        // Check and calculate total probability
        uint256 totalProbability = 0;
        for (uint256 i = 0; i < drops.length; i++) {
            require(drops[i].probability > 0, "Invalid probability");
            require(drops[i].yield > 0, "Invalid yield");
            totalProbability += drops[i].probability;
        }

        // Select up to 3 items
        Reward[] memory rewards = new Reward[](3);
        uint256 rewardCount = 0;

        // Generate random number for each selection
        for (uint256 i = 0; i < 3 && rewardCount < drops.length; i++) {
            uint256 random = _generateRandomNumber(totalProbability);
            uint256 roll = random + 1;

            // Select item based on cumulative probability
            uint256 cumulativeProbability = 0;
            bool selected = false;

            for (uint256 j = 0; j < drops.length; j++) {
                cumulativeProbability += drops[j].probability;
                if (roll <= cumulativeProbability) {
                    // Check if item has already been selected
                    bool alreadySelected = false;
                    for (uint256 k = 0; k < rewardCount; k++) {
                        if (rewards[k].itemId == drops[j].itemId) {
                            alreadySelected = true;
                            break;
                        }
                    }

                    if (!alreadySelected) {
                        uint256 itemAmount = drops[j].yield;
                        if (itemAmount > 3) {
                            itemAmount = 3; // Limit quantity per item
                        }
                        if (itemAmount == 0) {
                            itemAmount = 1;
                        }

                        rewards[rewardCount] = Reward(
                            drops[j].itemId,
                            itemAmount
                        );
                        rewardCount++;
                        selected = true;
                        break;
                    }
                }
            }

            if (!selected) {
                break; // No more items to select
            }
        }

        // Ensure at least 1 item if none was selected
        if (rewardCount == 0) {
            rewards[0] = Reward(drops[0].itemId, 1);
            rewardCount = 1;
        }

        // Remove chest from inventory
        inventoryComponent.setItem(
            msg.sender,
            _chestId,
            chest.quantity - 1,
            chest.durability,
            chest.expiration
        );

        // Add items to inventory
        uint256[] memory itemIds = new uint256[](rewardCount);
        uint256[] memory amounts = new uint256[](rewardCount);

        for (uint256 i = 0; i < rewardCount; i++) {
            // Check if item already exists in inventory
            InventoryItem memory existingItem = inventoryComponent.getItem(
                msg.sender,
                rewards[i].itemId
            );

            uint256 newQuantity;
            uint256 durability;
            uint256 expiration;

            if (existingItem.quantity > 0) {
                // Item exists, add to quantity with overflow check
                newQuantity = existingItem.quantity + rewards[i].amount;
                require(
                    newQuantity >= existingItem.quantity,
                    "Quantity overflow"
                );
                durability = existingItem.durability;
                expiration = existingItem.expiration;
            } else {
                // Item doesn't exist, create new
                newQuantity = rewards[i].amount;
                durability = 100;
                expiration = 0;
            }

            inventoryComponent.setItem(
                msg.sender,
                rewards[i].itemId,
                newQuantity,
                durability,
                expiration
            );
            itemIds[i] = rewards[i].itemId;
            amounts[i] = rewards[i].amount;
        }

        // Emit event
        emit ChestOpened(msg.sender, _chestId, itemIds, amounts);
    }

    /**
     * @notice Get remaining cooldown time for a player
     * @param _player The player's address
     * @return The remaining cooldown time (timestamp)
     */
    function getFishingCooldown(
        address _player
    ) external view returns (uint256) {
        uint256 nextFishingTime = lastFishingTime[_player] + fishingCooldown;
        if (block.timestamp >= nextFishingTime) {
            return 0;
        }
        return nextFishingTime;
    }

    /**
     * @notice Set fishing cooldown period (admin only)
     * @param _fishingCooldown The new cooldown period (in seconds)
     */
    function setFishingCooldown(uint256 _fishingCooldown) external onlyAdmin {
        fishingCooldown = _fishingCooldown;
    }

    /**
     * @dev Get chest probability based on weather
     * @param weatherState The weather state
     * @return Percentage (0-100)
     */
    function _getChestProbabilityByWeather(
        WeatherStructs.WeatherState weatherState
    ) internal pure returns (uint256) {
        if (weatherState == WeatherStructs.WeatherState.Sunny) {
            return 70; // 70% chance
        } else if (weatherState == WeatherStructs.WeatherState.Rainy) {
            return 80; // 80% chance
        } else if (weatherState == WeatherStructs.WeatherState.Stormy) {
            return 90; // 90% chance
        } else {
            return 50; // 50% chance (Cloudy or other)
        }
    }

    /**
     * @dev Generate a random number
     * @param max The maximum value (exclusive)
     * @return A random number from 0 to max-1
     */
    function _generateRandomNumber(uint256 max) internal returns (uint256) {
        uint256 random = uint256(
            keccak256(abi.encodePacked(block.number, msg.sender, nonce))
        );
        nonce++;
        return random % max;
    }

    /**
     * @dev Reduce fishing rod durability by consuming one rod
     * @param player The player's address
     */
    function _reduceFishingRodDurability(address player) internal {
        InventoryItem memory fishingRod = inventoryComponent.getItem(
            player,
            FISHING_ROD_ID
        );

        // Always consume 1 fishing rod when fishing
        inventoryComponent.setItem(
            player,
            FISHING_ROD_ID,
            fishingRod.quantity - 1,
            fishingRod.durability,
            fishingRod.expiration
        );
    }
}
