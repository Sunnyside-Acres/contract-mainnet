// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IRaising.sol";
import "../../interfaces/IWeather.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../struct/Raising.sol";
import "../../struct/Weather.sol";
import "../../struct/Item.sol";
import "../../struct/Inventory.sol";

/**
 * @title RaisingLogic
 * @dev Logic contract for Animal Raising system - handles gameplay mechanics
 * @notice This contract manages all raising-related gameplay including feeding, harvesting, and slaughtering
 *
 * Key Features:
 * - Start raising livestock from inventory items
 * - Feed animals to improve quality (up to 3 times)
 * - Harvest products without killing animals (up to 3 times with cooldown)
 * - Slaughter animals for meat
 * - Quality-based reward system with probabilistic drops
 * - Weather integration for growth modifiers
 * - Comprehensive UI helper functions
 */
contract RaisingLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice Raising component for data storage
    IRaisingComponent public raisingProxy;
    /// @notice Inventory component for item management
    IInventoryComponent public inventoryProxy;
    /// @notice Weather component for environmental effects
    IWeatherComponent public weatherProxy;
    /// @notice Item component for item data and drops
    IItemComponent public itemProxy;

    /**
     * @dev Modifier to restrict access to admin only
     * @notice Reverts if caller is not an admin
     */
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /**
     * @dev Modifier to restrict access to registered logic contracts only
     * @notice Reverts if caller is not a registered logic contract
     */
    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    /// @notice Emitted when a player starts raising a livestock
    event RaisingStarted(
        uint256 indexed raisingId,
        address indexed player,
        uint256 itemId,
        Raising raising
    );

    /// @notice Emitted when a player harvests products from an animal
    event RaisingHarvestedWithCooldown(
        address indexed player,
        uint256 indexed raisingId,
        uint256[] itemIds,
        uint256[] itemAmounts,
        uint256 harvestCount,
        Raising raising
    );

    /// @notice Emitted when a player slaughters an animal for meat
    event RaisingSlaughtered(
        address indexed player,
        uint256 indexed raisingId,
        uint256[] itemIds,
        uint256[] itemAmounts,
        Raising raising
    );

    /// @notice Emitted when a player feeds an animal
    event RaisingFed(
        uint256 indexed raisingId,
        WeatherStructs.WeatherState weatherState,
        Raising raising
    );

    /// @notice Emitted when total harvested items counter is updated
    event TotalHarvestedItemsUpdated(
        uint256 indexed raisingId,
        uint256 totalHarvestedItems,
        Raising raising
    );

    /// @notice Emitted when feeding counter is reset after harvest
    event FeedingReset(
        uint256 indexed raisingId,
        uint256 harvestCount,
        Raising raising
    );

    /**
     * @dev Initializes the RaisingLogic contract with required dependencies
     * @param _world Address of the World contract
     * @param _raisingProxy Address of the RaisingComponent proxy
     * @param _inventoryProxy Address of the InventoryComponent proxy
     * @param _weatherProxy Address of the WeatherComponent proxy
     * @param _itemProxy Address of the ItemComponent proxy
     */
    constructor(
        address _world,
        address _raisingProxy,
        address _inventoryProxy,
        address _weatherProxy,
        address _itemProxy
    ) {
        world = IWorld(_world);
        raisingProxy = IRaisingComponent(_raisingProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        weatherProxy = IWeatherComponent(_weatherProxy);
        itemProxy = IItemComponent(_itemProxy);
    }

    /**
     * @dev Internal helper for pseudo-random number generation
     * @notice Uses block number and sender for randomness (not cryptographically secure)
     * @param max Maximum value (exclusive)
     * @return Random number between 0 and max-1
     */
    function random(uint256 max) private view returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(block.number, msg.sender))) %
            max;
    }

    /**
     * @dev Starts raising a livestock from player's inventory
     * @notice Consumes one livestock item from inventory and creates a new raising
     *
     * Requirements:
     * - Item ID must be valid
     * - Item must be of type Livestock
     * - Player must have at least 1 of the item in inventory
     *
     * Effects:
     * - Removes 1 livestock item from inventory
     * - Creates new raising with weather-adjusted growth time
     * - Emits RaisingStarted event
     *
     * @param _itemId ID of the livestock item to start raising
     */
    function startRaising(uint256 _itemId) external {
        // Validate conditions before starting raising
        require(_itemId > 0, "Invalid item ID");

        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(
            item.itemType == ItemStructs.ItemType.Livestock,
            "Item is not a livestock"
        );

        uint256 growthTime = itemProxy.getItemAttribute(
            _itemId,
            ItemStructs.Attribute.GrowthRate
        );

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        // Verify item exists
        require(
            item.itemType == ItemStructs.ItemType.Livestock,
            "Item is not a livestock"
        );

        InventoryItem memory inventoryItem = inventoryProxy.getItem(
            msg.sender,
            _itemId
        );
        require(inventoryItem.quantity > 0, "Not enough item");

        inventoryProxy.setItem(
            msg.sender,
            _itemId,
            inventoryItem.quantity - 1,
            inventoryItem.durability,
            inventoryItem.expiration
        );

        uint256 raisingId = raisingProxy.startRaising(
            _itemId,
            msg.sender,
            growthTime,
            weatherState
        );

        // Get raising info after creation to emit
        Raising memory raising = raisingProxy.getRaising(raisingId);

        emit RaisingStarted(raisingId, msg.sender, _itemId, raising);
    }

    /**
     * @dev Harvests products from an animal without killing it
     * @notice Allows up to 3 harvests with cooldown periods, rewards based on quality and RNG
     *
     * Requirements:
     * - Caller must be the raising owner
     * - Raising must not be harvested or slaughtered
     * - Animal must have been fed at least once
     * - Animal must be fully grown
     * - Harvest count must be less than 3
     * - Harvest cooldown must have passed (for subsequent harvests)
     *
     * Reward System:
     * - Uses drop system (index 1+ are harvest drops, index 0 is meat)
     * - Quality modifier increases drop probability and yield
     * - Bonus +1 item if fed 3 times
     * - Guaranteed at least 1 item if quality > 0
     *
     * Effects:
     * - Increments harvest count
     * - Resets feeding counter for next cycle
     * - Adds harvested items to player inventory
     * - Updates total harvested items counter
     * - Emits RaisingHarvestedWithCooldown event
     *
     * @param raisingId ID of the raising to harvest
     */
    function harvestRaising(uint256 raisingId) external {
        require(raisingId > 0, "Invalid raising ID");
        require(
            raisingProxy.getRaisingOwner(raisingId) == msg.sender,
            "Not raising owner"
        );

        Raising memory raising = raisingProxy.getRaising(raisingId);
        require(!raising.isHarvested, "Raising already harvested");
        require(!raising.isSlaughtered, "Raising already slaughtered");

        // Check if raising has been fed
        require(raising.feedCount > 0, "Raising must be fed before harvest");

        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            raising.itemId
        );

        // Get cooldown from item attribute
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        uint256 qualityModifier = raisingProxy.harvestRaisingWithCooldown(
            raisingId,
            harvestCooldown
        );

        require(drops.length > 1, "No harvest drops configured"); // Need at least 2 drops (drop[0] is meat, drop[1+] is harvest)

        uint256 qualityMultiplier = qualityModifier;

        uint256 qualityBonus = 0;
        if (qualityMultiplier > 100) {
            qualityBonus = (qualityMultiplier - 100) * 100;
        }

        // Calculate total probability of harvest drops (from index 1 onwards)
        uint256 totalHarvestProbability = 0;
        for (uint256 i = 1; i < drops.length; i++) {
            totalHarvestProbability += drops[i].probability;
        }

        uint256 totalItemAmount = 0;
        uint256[] memory harvestedItemIds = new uint256[](drops.length - 1); // Exclude drop[0] (meat)
        uint256[] memory harvestedItemAmounts = new uint256[](drops.length - 1);
        uint256 harvestedItemCount = 0;

        // Only process from drop[1] onwards (not meat)
        for (uint256 i = 1; i < drops.length; i++) {
            // Recalculate probability based on total 100% minus meat portion
            uint256 adjustedProbability = (drops[i].probability * 10000) /
                totalHarvestProbability;

            uint256 baseRoll = random(10000);
            uint256 adjustedRoll = baseRoll;
            if (baseRoll > qualityBonus) {
                adjustedRoll = baseRoll - qualityBonus;
            } else {
                adjustedRoll = 0;
            }

            if (adjustedRoll < adjustedProbability) {
                uint256 itemAmount;
                if (drops[i].yield == 0) {
                    itemAmount = 1;
                } else {
                    itemAmount = (drops[i].yield * qualityMultiplier) / 100;
                    if (itemAmount == 0) {
                        itemAmount = 1;
                    }
                }

                totalItemAmount += itemAmount;

                harvestedItemIds[harvestedItemCount] = drops[i].itemId;
                harvestedItemAmounts[harvestedItemCount] = itemAmount;
                harvestedItemCount++;

                // Get current item quantity
                InventoryItem memory currentItem = inventoryProxy.getItem(
                    msg.sender,
                    drops[i].itemId
                );

                // Add new quantity (if item doesn't exist, quantity = 0)
                uint256 newQuantity = currentItem.quantity + itemAmount;

                inventoryProxy.setItem(
                    msg.sender,
                    drops[i].itemId,
                    newQuantity,
                    100,
                    0
                );
            }
        }

        // Guarantee at least one item if animal was cared for
        if (totalItemAmount == 0 && qualityModifier > 0 && drops.length > 1) {
            harvestedItemIds[0] = drops[1].itemId;
            harvestedItemAmounts[0] = 1;
            harvestedItemCount = 1;
            totalItemAmount = 1; // FIX: Update totalItemAmount to count correctly

            // Get current item quantity
            InventoryItem memory currentItem = inventoryProxy.getItem(
                msg.sender,
                drops[1].itemId
            );

            // Add new quantity (if item doesn't exist, quantity = 0)
            uint256 newQuantity = currentItem.quantity + 1;

            inventoryProxy.setItem(
                msg.sender,
                drops[1].itemId,
                newQuantity,
                100,
                0
            );
        }

        // BONUS: Add +1 item if fed 3 times
        if (raising.feedCount >= 3 && drops.length > 1) {
            // Add bonus item (using drop[1] as bonus item)
            uint256 bonusItemId = drops[1].itemId;

            // Check if this item is already in harvest list
            bool itemExists = false;
            for (uint256 i = 0; i < harvestedItemCount; i++) {
                if (harvestedItemIds[i] == bonusItemId) {
                    harvestedItemAmounts[i] += 1;
                    itemExists = true;
                    break;
                }
            }

            // If not exists, add new to list
            if (!itemExists) {
                harvestedItemIds[harvestedItemCount] = bonusItemId;
                harvestedItemAmounts[harvestedItemCount] = 1;
                harvestedItemCount++;
            }

            // Update inventory for bonus item
            InventoryItem memory bonusCurrentItem = inventoryProxy.getItem(
                msg.sender,
                bonusItemId
            );
            uint256 bonusNewQuantity = bonusCurrentItem.quantity + 1;
            inventoryProxy.setItem(
                msg.sender,
                bonusItemId,
                bonusNewQuantity,
                100,
                0
            );

            // Update totalItemAmount
            totalItemAmount += 1;
        }

        uint256[] memory finalItemIds = new uint256[](harvestedItemCount);
        uint256[] memory finalItemAmounts = new uint256[](harvestedItemCount);

        for (uint256 i = 0; i < harvestedItemCount; i++) {
            finalItemIds[i] = harvestedItemIds[i];
            finalItemAmounts[i] = harvestedItemAmounts[i];
        }

        // Get raising info after harvest to emit
        Raising memory updatedRaising = raisingProxy.getRaising(raisingId);

        emit RaisingHarvestedWithCooldown(
            msg.sender,
            raisingId,
            finalItemIds,
            finalItemAmounts,
            raising.harvestCount + 1,
            updatedRaising
        );

        // Update total harvested items count
        raisingProxy.updateTotalHarvestedItems(raisingId, totalItemAmount);

        // Emit event to track (get new value from component)
        Raising memory finalRaising = raisingProxy.getRaising(raisingId);
        emit TotalHarvestedItemsUpdated(
            raisingId,
            finalRaising.totalHarvestedItems,
            finalRaising
        );
    }

    /**
     * @dev Slaughters an animal for meat
     * @notice Removes the animal permanently and gives meat drops based on quality
     *
     * Requirements:
     * - Caller must be the raising owner
     * - Raising must not be harvested or slaughtered
     * - Animal must be fully grown
     *
     * Reward System:
     * - Uses drop[0] (meat) with 100% probability
     * - If not fed, no items are dropped (qualityMultiplier = 0)
     * - Quality modifier increases yield
     * - Guaranteed at least 1 meat if quality > 0
     *
     * Effects:
     * - Marks raising as slaughtered
     * - Deletes raising data permanently
     * - Adds meat to player inventory
     * - Emits RaisingSlaughtered event
     *
     * Note: Total harvested items are NOT tracked for slaughter
     *
     * @param raisingId ID of the raising to slaughter
     */
    function slaughterRaising(uint256 raisingId) external {
        require(raisingId > 0, "Invalid raising ID");
        require(
            raisingProxy.getRaisingOwner(raisingId) == msg.sender,
            "Not raising owner"
        );

        Raising memory raising = raisingProxy.getRaising(raisingId);
        require(!raising.isHarvested, "Raising already harvested");
        require(!raising.isSlaughtered, "Raising already slaughtered");

        // Allow slaughter even if not fed, but will yield no items

        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            raising.itemId
        );

        // Get info before deleting the animal
        uint256 feedCount = raising.feedCount;

        // Save raising info before deletion to emit
        Raising memory raisingBeforeSlaughter = raising;

        // Delete the animal and get qualityModifier
        uint256 qualityModifier = raisingProxy.slaughterRaising(raisingId);

        require(drops.length > 0, "No item drops configured");

        uint256 qualityMultiplier = qualityModifier;

        // If not fed (feedCount = 0), no items
        if (feedCount == 0) {
            qualityMultiplier = 0;
        }

        uint256 qualityBonus = 0;
        if (qualityMultiplier > 100) {
            qualityBonus = (qualityMultiplier - 100) * 100;
        }

        uint256 totalItemAmount = 0;
        uint256[] memory harvestedItemIds = new uint256[](1); // Only drop[0] (meat)
        uint256[] memory harvestedItemAmounts = new uint256[](1);
        uint256 harvestedItemCount = 0;

        // Only process drop[0] (meat) with 100% probability
        if (drops.length > 0) {
            uint256 baseRoll = random(10000);
            uint256 adjustedRoll = baseRoll;
            if (baseRoll > qualityBonus) {
                adjustedRoll = baseRoll - qualityBonus;
            } else {
                adjustedRoll = 0;
            }

            // Meat probability is always 100% (10000)
            if (adjustedRoll < 10000) {
                uint256 itemAmount;
                if (drops[0].yield == 0) {
                    itemAmount = 1;
                } else {
                    itemAmount = (drops[0].yield * qualityMultiplier) / 100;
                    if (itemAmount == 0) {
                        itemAmount = 1;
                    }
                }

                totalItemAmount += itemAmount;

                harvestedItemIds[0] = drops[0].itemId;
                harvestedItemAmounts[0] = itemAmount;
                harvestedItemCount = 1;

                // Get current item quantity
                InventoryItem memory currentItem = inventoryProxy.getItem(
                    msg.sender,
                    drops[0].itemId
                );

                // Add new quantity (if item doesn't exist, quantity = 0)
                uint256 newQuantity = currentItem.quantity + itemAmount;

                inventoryProxy.setItem(
                    msg.sender,
                    drops[0].itemId,
                    newQuantity,
                    100,
                    0
                );
            }
        }

        // Guarantee at least one meat if animal was cared for
        if (totalItemAmount == 0 && qualityModifier > 0 && drops.length > 0) {
            harvestedItemIds[0] = drops[0].itemId;
            harvestedItemAmounts[0] = 1;
            harvestedItemCount = 1;

            // Get current item quantity
            InventoryItem memory currentItem = inventoryProxy.getItem(
                msg.sender,
                drops[0].itemId
            );

            // Add new quantity (if item doesn't exist, quantity = 0)
            uint256 newQuantity = currentItem.quantity + 1;

            inventoryProxy.setItem(
                msg.sender,
                drops[0].itemId,
                newQuantity,
                100,
                0
            );
        }

        uint256[] memory finalItemIds = new uint256[](harvestedItemCount);
        uint256[] memory finalItemAmounts = new uint256[](harvestedItemCount);

        for (uint256 i = 0; i < harvestedItemCount; i++) {
            finalItemIds[i] = harvestedItemIds[i];
            finalItemAmounts[i] = harvestedItemAmounts[i];
        }

        emit RaisingSlaughtered(
            msg.sender,
            raisingId,
            finalItemIds,
            finalItemAmounts,
            raisingBeforeSlaughter
        );

        // Note: totalHarvestedItems is NOT updated for slaughter
        // because the animal has been deleted. If meat counting is needed, add separate logic
    }

    /**
     * @dev Feeds an animal to improve its quality
     * @notice Consumes 1 food item (ID 91) from inventory and increases quality modifier
     *
     * Requirements:
     * - Caller must be the raising owner
     * - Raising must not be harvested or slaughtered
     * - Player must have at least 1 food item (ID 91) in inventory
     * - Feeding cooldown must have passed
     * - Feed count must not exceed 3
     *
     * Effects:
     * - Removes 1 food item from inventory
     * - Increases quality modifier by 10%
     * - Updates feeding time and count
     * - Emits RaisingFed event
     *
     * @param raisingId ID of the raising to feed
     */
    function feedRaising(uint256 raisingId) external {
        require(raisingId > 0, "Invalid raising ID");
        require(
            raisingProxy.getRaisingOwner(raisingId) == msg.sender,
            "Not raising owner"
        );

        Raising memory raising = raisingProxy.getRaising(raisingId);
        require(!raising.isHarvested, "Raising already harvested");
        require(!raising.isSlaughtered, "Raising already slaughtered");

        // Check for food (item id 91) in inventory
        InventoryItem memory foodItem = inventoryProxy.getItem(msg.sender, 91);
        require(
            foodItem.quantity > 0,
            "Not enough food (item id 91) in inventory"
        );

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        // Get harvestCooldown from item attribute
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        raisingProxy.feedRaising(raisingId, harvestCooldown);

        // Deduct 1 food from inventory after successful feeding
        inventoryProxy.setItem(
            msg.sender,
            91,
            foodItem.quantity - 1,
            foodItem.durability,
            foodItem.expiration
        );

        // Get raising info after feeding to emit
        Raising memory updatedRaising = raisingProxy.getRaising(raisingId);

        emit RaisingFed(raisingId, weatherState, updatedRaising);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Gets raising data by ID
     * @param raisingId ID of the raising
     * @return Raising struct with all data
     */
    function getRaising(
        uint256 raisingId
    ) external view returns (Raising memory) {
        return raisingProxy.getRaising(raisingId);
    }

    /**
     * @dev Gets all raising IDs owned by a player
     * @param _playerAddress Address of the player
     * @return Array of raising IDs
     */
    function getOwnerRaisings(
        address _playerAddress
    ) external view returns (uint256[] memory) {
        return raisingProxy.getOwnerRaisings(_playerAddress);
    }

    /**
     * @dev Gets detailed information for all active raisings owned by a player
     * @param _playerAddress Address of the player
     * @return Array of Raising structs
     */
    function getOwnerRaisingsWithDetails(
        address _playerAddress
    ) external view returns (Raising[] memory) {
        return raisingProxy.getOwnerRaisingsWithDetails(_playerAddress);
    }

    /**
     * @dev Gets the owner of a raising
     * @param raisingId ID of the raising
     * @return Address of the raising owner
     */
    function getRaisingOwner(
        uint256 raisingId
    ) external view returns (address) {
        return raisingProxy.getRaisingOwner(raisingId);
    }

    // ============ UI HELPER FUNCTIONS ============

    /**
     * @dev Gets the next available feeding time
     * @param raisingId ID of the raising
     * @return Timestamp when next feeding is available
     */
    function getNextFeedingTime(
        uint256 raisingId
    ) external view returns (uint256) {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );
        return raisingProxy.getNextFeedingTime(raisingId, harvestCooldown);
    }

    /**
     * @dev Checks if an animal can be fed now
     * @param raisingId ID of the raising
     * @return True if feeding is allowed now, false otherwise
     */
    function canFeed(uint256 raisingId) external view returns (bool) {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );
        return raisingProxy.canFeed(raisingId, harvestCooldown);
    }

    /**
     * @dev Gets comprehensive feeding information for UI display
     * @param raisingId ID of the raising
     * @return nextFeedingTime Timestamp when next feeding is available
     * @return canFeedNow Whether feeding is allowed now
     * @return feedCount Current feed count
     * @return maxFeeds Maximum feed count (always 3)
     * @return timeUntilNextFeed Seconds until next feeding is available
     */
    function getFeedingInfo(
        uint256 raisingId
    )
        external
        view
        returns (
            uint256 nextFeedingTime,
            bool canFeedNow,
            uint256 feedCount,
            uint256 maxFeeds,
            uint256 timeUntilNextFeed
        )
    {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        nextFeedingTime = raisingProxy.getNextFeedingTime(
            raisingId,
            harvestCooldown
        );
        canFeedNow = raisingProxy.canFeed(raisingId, harvestCooldown);

        feedCount = raising.feedCount;
        maxFeeds = 3; // Maximum 3 feeds

        // Calculate time remaining until next feed
        if (canFeedNow) {
            timeUntilNextFeed = 0;
        } else {
            timeUntilNextFeed = nextFeedingTime - block.timestamp;
        }
    }

    /**
     * @dev Gets detailed feeding cooldown information
     * @param raisingId ID of the raising
     * @return currentTime Current block timestamp
     * @return lastFeedTime Timestamp of last feeding
     * @return cooldownDuration Cooldown duration in seconds
     * @return timeRemaining Seconds remaining until can feed
     * @return isReadyToFeed Whether feeding is available now
     */
    function getFeedingCooldownInfo(
        uint256 raisingId
    )
        external
        view
        returns (
            uint256 currentTime,
            uint256 lastFeedTime,
            uint256 cooldownDuration,
            uint256 timeRemaining,
            bool isReadyToFeed
        )
    {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        currentTime = block.timestamp;
        lastFeedTime = raising.lastFeedTime;

        // Feeding cooldown logic:
        // - Before first harvest: use growthTime/4
        // - After first harvest: use harvestCooldown/4
        if (raising.harvestCount == 0) {
            cooldownDuration = raising.growthTime / 4; // Cooldown = growthTime / 4
        } else {
            cooldownDuration = harvestCooldown / 4; // Cooldown = harvestCooldown / 4
        }

        if (raising.feedCount == 0) {
            // Never fed, can feed immediately
            timeRemaining = 0;
            isReadyToFeed = true;
        } else {
            uint256 nextFeedTime = lastFeedTime + cooldownDuration;
            if (currentTime >= nextFeedTime) {
                timeRemaining = 0;
                isReadyToFeed = true;
            } else {
                timeRemaining = nextFeedTime - currentTime;
                isReadyToFeed = false;
            }
        }
    }

    /**
     * @dev Gets comprehensive raising information for UI display
     * @notice Returns all relevant data for displaying raising status
     * @param raisingId ID of the raising
     */
    function getFullRaisingInfo(
        uint256 raisingId
    )
        external
        view
        returns (
            // Basic raising information
            uint256 id,
            uint256 itemId,
            uint256 raisingTime,
            uint256 qualityModifier,
            uint256 growthTime,
            uint256 lastFeedTime,
            uint256 feedCount,
            bool isHarvested,
            uint256 lastHarvestTime,
            uint256 harvestCount,
            bool isSlaughtered,
            uint256 totalHarvestedItems,
            // Item information
            string memory itemName,
            ItemStructs.ItemType itemType,
            ItemStructs.Rarity itemRarity,
            // Timing information
            uint256 currentTime,
            uint256 timeUntilFullyGrown,
            bool isFullyGrown,
            // Feeding information
            uint256 nextFeedingTime,
            bool canFeedNow,
            uint256 timeUntilNextFeed,
            uint256 maxFeeds,
            // Harvest information
            bool canHarvest,
            uint256 harvestCooldown,
            uint256 timeUntilNextHarvest,
            uint256 maxHarvests,
            // Drop information
            ItemStructs.ItemDrop[] memory itemDrops,
            // Owner information
            address owner
        )
    {
        // Get basic raising information
        Raising memory raising = raisingProxy.getRaising(raisingId);

        // Assign basic values
        id = raising.id;
        itemId = raising.itemId;
        raisingTime = raising.raisingTime;
        qualityModifier = raising.qualityModifier;
        growthTime = raising.growthTime;
        lastFeedTime = raising.lastFeedTime;
        feedCount = raising.feedCount;
        isHarvested = raising.isHarvested;
        lastHarvestTime = raising.lastHarvestTime;
        harvestCount = raising.harvestCount;
        isSlaughtered = raising.isSlaughtered;
        totalHarvestedItems = raising.totalHarvestedItems;

        // Get item information
        ItemStructs.Item memory item = itemProxy.getItem(itemId);
        itemName = item.name;
        itemType = item.itemType;
        itemRarity = item.rarity;

        // Timing information
        currentTime = block.timestamp;
        timeUntilFullyGrown = 0;
        isFullyGrown = false;

        if (raisingTime + growthTime > currentTime) {
            timeUntilFullyGrown = (raisingTime + growthTime) - currentTime;
        } else {
            isFullyGrown = true;
        }

        // Feeding information
        uint256 feedingHarvestCooldown = itemProxy.getItemAttribute(
            itemId,
            ItemStructs.Attribute.HarvestCooldown
        );
        nextFeedingTime = raisingProxy.getNextFeedingTime(
            raisingId,
            feedingHarvestCooldown
        );
        canFeedNow = raisingProxy.canFeed(raisingId, feedingHarvestCooldown);
        maxFeeds = 3;

        if (canFeedNow) {
            timeUntilNextFeed = 0;
        } else {
            timeUntilNextFeed = nextFeedingTime - currentTime;
        }

        // Harvest information
        canHarvest = false;
        harvestCooldown = 0;
        timeUntilNextHarvest = 0;
        maxHarvests = 3;

        if (isFullyGrown && !isHarvested && !isSlaughtered && feedCount > 0) {
            harvestCooldown = itemProxy.getItemAttribute(
                itemId,
                ItemStructs.Attribute.HarvestCooldown
            );

            if (harvestCount == 0) {
                canHarvest = true;
            } else if (harvestCount < maxHarvests) {
                uint256 nextHarvestTime = lastHarvestTime + harvestCooldown;
                if (currentTime >= nextHarvestTime) {
                    canHarvest = true;
                } else {
                    timeUntilNextHarvest = nextHarvestTime - currentTime;
                }
            }
        }

        // Get drop information
        itemDrops = itemProxy.getItemDrops(itemId);

        // Get owner information
        owner = raisingProxy.getRaisingOwner(raisingId);
    }

    /// @notice Struct for returning comprehensive raising information
    struct FullRaisingInfo {
        // Basic information
        uint256 id;
        uint256 itemId;
        string itemName;
        ItemStructs.ItemType itemType;
        ItemStructs.Rarity itemRarity;
        address owner;
        // Timing information
        uint256 raisingTime;
        uint256 growthTime;
        uint256 currentTime;
        uint256 timeUntilFullyGrown;
        bool isFullyGrown;
        // Feeding information
        uint256 lastFeedTime;
        uint256 feedCount;
        uint256 maxFeeds;
        uint256 nextFeedingTime;
        bool canFeedNow;
        uint256 timeUntilNextFeed;
        // Harvest information
        uint256 lastHarvestTime;
        uint256 harvestCount;
        uint256 maxHarvests;
        bool canHarvest;
        uint256 harvestCooldown;
        uint256 timeUntilNextHarvest;
        uint256 totalHarvestedItems;
        // Status information
        bool isHarvested;
        bool isSlaughtered;
        uint256 qualityModifier;
        // Drop information
        ItemStructs.ItemDrop[] itemDrops;
    }

    /**
     * @dev Gets comprehensive raising information as a struct
     * @notice Wrapper function that returns getFullRaisingInfo as a struct for easier consumption
     * @param raisingId ID of the raising
     * @return info FullRaisingInfo struct with all raising data
     */
    function getFullRaisingInfoStruct(
        uint256 raisingId
    ) external view returns (FullRaisingInfo memory) {
        (
            uint256 id,
            uint256 itemId,
            uint256 raisingTime,
            uint256 qualityModifier,
            uint256 growthTime,
            uint256 lastFeedTime,
            uint256 feedCount,
            bool isHarvested,
            uint256 lastHarvestTime,
            uint256 harvestCount,
            bool isSlaughtered,
            uint256 totalHarvestedItems,
            string memory itemName,
            ItemStructs.ItemType itemType,
            ItemStructs.Rarity itemRarity,
            uint256 currentTime,
            uint256 timeUntilFullyGrown,
            bool isFullyGrown,
            uint256 nextFeedingTime,
            bool canFeedNow,
            uint256 timeUntilNextFeed,
            uint256 maxFeeds,
            bool canHarvest,
            uint256 harvestCooldown,
            uint256 timeUntilNextHarvest,
            uint256 maxHarvests,
            ItemStructs.ItemDrop[] memory itemDrops,
            address owner
        ) = this.getFullRaisingInfo(raisingId);

        return
            FullRaisingInfo({
                id: id,
                itemId: itemId,
                itemName: itemName,
                itemType: itemType,
                itemRarity: itemRarity,
                owner: owner,
                raisingTime: raisingTime,
                growthTime: growthTime,
                currentTime: currentTime,
                timeUntilFullyGrown: timeUntilFullyGrown,
                isFullyGrown: isFullyGrown,
                lastFeedTime: lastFeedTime,
                feedCount: feedCount,
                maxFeeds: maxFeeds,
                nextFeedingTime: nextFeedingTime,
                canFeedNow: canFeedNow,
                timeUntilNextFeed: timeUntilNextFeed,
                lastHarvestTime: lastHarvestTime,
                harvestCount: harvestCount,
                maxHarvests: maxHarvests,
                canHarvest: canHarvest,
                harvestCooldown: harvestCooldown,
                timeUntilNextHarvest: timeUntilNextHarvest,
                totalHarvestedItems: totalHarvestedItems,
                isHarvested: isHarvested,
                isSlaughtered: isSlaughtered,
                qualityModifier: qualityModifier,
                itemDrops: itemDrops
            });
    }
}
