// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlant.sol";
import "../../interfaces/IWeather.sol";
import "../../interfaces/IPlot.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";

/**
 * @title PlantLogic
 * @dev Logic contract for Plant/Crop system - handles crop planting and harvesting gameplay
 * @notice This contract manages all planting-related gameplay including planting seeds, tending crops, and harvesting
 *
 * Key Features:
 * - Plant seeds on plots
 * - Tend crops to improve quality (up to 3 times)
 * - Harvest crops with quality-based rewards
 * - Weather integration for growth modifiers
 * - Quality-based reward system with probabilistic drops
 */
contract PlantLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice Plant component for crop data storage
    IPlantComponent public plantProxy;
    /// @notice Plot component for land plot management
    IPlotComponent public plotProxy;
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

    /// @notice Emitted when a player plants a seed on a plot
    event PlantCreated(
        uint256 indexed plantId,
        address indexed player,
        uint256 plotId,
        uint256 itemId,
        uint256 plantedTime,
        uint256 lastTendedTime,
        uint256 qualityModifier,
        uint256 growthTime,
        uint256 tendCount,
        bool isHarvested
    );

    /// @notice Emitted when a player harvests a crop
    event PlantHarvested(
        address indexed player,
        uint256 indexed plantId,
        uint256 plotId,
        uint256[] itemIds,
        uint256[] itemAmounts
    );

    /// @notice Emitted when a player tends to a crop
    event PlantTended(
        uint256 indexed plantId,
        WeatherStructs.WeatherState weatherState
    );

    /**
     * @dev Initializes the PlantLogic contract with required dependencies
     * @param _world Address of the World contract
     * @param _plantProxy Address of the PlantComponent proxy
     * @param _plotProxy Address of the PlotComponent proxy
     * @param _inventoryProxy Address of the InventoryComponent proxy
     * @param _weatherProxy Address of the WeatherComponent proxy
     * @param _itemProxy Address of the ItemComponent proxy
     */
    constructor(
        address _world,
        address _plantProxy,
        address _plotProxy,
        address _inventoryProxy,
        address _weatherProxy,
        address _itemProxy
    ) {
        world = IWorld(_world);
        plantProxy = IPlantComponent(_plantProxy);
        plotProxy = IPlotComponent(_plotProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        weatherProxy = IWeatherComponent(_weatherProxy);
        itemProxy = IItemComponent(_itemProxy);
    }

    /**
     * @dev Internal helper for pseudo-random number generation
     * @notice Uses sender address and block number for randomness (not cryptographically secure)
     * @param max Maximum value (exclusive)
     * @return Random number between 0 and max-1
     */
    function random(uint256 max) private view returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(msg.sender, block.number))) %
            max;
    }

    /**
     * @dev Plants a seed on a plot
     * @notice Consumes one seed item from inventory and creates a crop on the specified plot
     *
     * Requirements:
     * - Plot ID and item ID must be valid
     * - Caller must own the plot
     * - Plot must be active
     * - Plot must not already have a plant
     * - Item must be of type Seed
     * - Player must have at least 1 of the seed in inventory
     *
     * Effects:
     * - Removes 1 seed from inventory
     * - Creates new plant with weather-adjusted growth time
     * - Associates plant with plot
     * - Emits PlantCreated event
     *
     * @param _plotId ID of the plot to plant on
     * @param _itemId ID of the seed item to plant
     */
    function plantCrop(uint256 _plotId, uint256 _itemId) external {
        // Validate conditions before planting
        require(_plotId > 0, "Invalid plot ID");
        require(_itemId > 0, "Invalid item ID");

        // Check if plot exists
        require(
            plotProxy.getPlotOwner(_plotId) == msg.sender,
            "Plot not owned"
        );

        require(plotProxy.getPlot(_plotId).isActive, "Plot is not active");

        // Check if plot already has a plant
        require(
            plantProxy.getPlotPlants(_plotId) == 0,
            "Plot already has a plant"
        );

        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(
            item.itemType == ItemStructs.ItemType.Seed,
            "Item is not a seed"
        );

        uint256 growthTime = itemProxy.getItemAttribute(
            _itemId,
            ItemStructs.Attribute.GrowthRate
        );

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        Plot memory plot = plotProxy.getPlot(_plotId);
        // Verify item exists
        require(
            item.itemType == ItemStructs.ItemType.Seed,
            "Item is not a seed"
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

        plantProxy.plantCrop(
            _plotId,
            _itemId,
            msg.sender,
            uint256(plot.plotType),
            growthTime,
            weatherState
        );

        // Get plant info after creation to emit event
        uint256 plantId = uint256(
            keccak256(
                abi.encodePacked(msg.sender, _plotId, _itemId, block.timestamp)
            )
        );

        Plant memory plant = plantProxy.getPlantedCrop(plantId);

        emit PlantCreated(
            plant.id,
            msg.sender,
            uint256(plant.plotId),
            uint256(plant.itemId),
            uint256(plant.plantedTime),
            uint256(plant.lastTendedTime),
            uint256(plant.qualityModifier),
            uint256(plant.growthTime),
            uint256(plant.tendCount),
            plant.isHarvested
        );
    }

    /**
     * @dev Harvests a fully grown crop
     * @notice Removes the crop and plot, gives rewards based on quality and RNG
     *
     * Requirements:
     * - Caller must be the plant owner
     * - Plant must not be already harvested
     * - Plant must be fully grown (checked in component)
     *
     * Reward System:
     * - Uses drop system with probability and yield
     * - Quality modifier increases drop probability and yield
     * - Minimum quality is 100 (no penalty)
     * - Guaranteed at least 1 item of the first drop
     *
     * Effects:
     * - Marks plant as harvested
     * - Deletes plant data
     * - Deletes associated plot
     * - Adds harvested items to player inventory
     * - Emits PlantHarvested event
     *
     * @param plantId ID of the plant to harvest
     */
    function plantHarvest(uint256 plantId) external {
        require(plantId > 0, "Invalid plant ID");
        require(
            plantProxy.getPlantOwner(plantId) == msg.sender,
            "Not plant owner"
        );

        Plant memory plant = plantProxy.getPlantedCrop(plantId);
        require(!plant.isHarvested, "Plant already harvested");

        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            uint256(plant.itemId)
        );

        require(drops.length > 0, "No item drops configured");

        uint256 qualityMultiplier = plant.qualityModifier;
        if (qualityMultiplier < 100) {
            qualityMultiplier = 100;
        }

        uint256 qualityBonus = (qualityMultiplier - 100) * 100;

        uint256 totalItemAmount = 0;
        uint256[] memory harvestedItemIds = new uint256[](drops.length);
        uint256[] memory harvestedItemAmounts = new uint256[](drops.length);
        uint256 harvestedItemCount = 0;

        // If only 1 drop, skip random and guarantee it
        if (drops.length == 1) {
            uint256 itemAmount;
            if (drops[0].yield == 0) {
                itemAmount = 1;
            } else {
                // Use yield as base quantity, qualityModifier as multiplier
                itemAmount = (drops[0].yield * qualityMultiplier) / 100;
                if (itemAmount == 0) {
                    itemAmount = 1;
                }
            }

            totalItemAmount += itemAmount;

            // Store harvested item information
            harvestedItemIds[0] = drops[0].itemId;
            harvestedItemAmounts[0] = itemAmount;
            harvestedItemCount = 1;

            // Add item to inventory
            InventoryItem memory currentItem = inventoryProxy.getItem(
                msg.sender,
                drops[0].itemId
            );
            uint256 newQuantity = currentItem.quantity + itemAmount;
            inventoryProxy.setItem(
                msg.sender,
                drops[0].itemId,
                newQuantity,
                100,
                0
            );
        } else {
            // Multiple drops: use random for each drop
            for (uint256 i = 0; i < drops.length; i++) {
                uint256 baseRoll = random(10000);
                uint256 adjustedRoll = baseRoll;
                if (baseRoll > qualityBonus) {
                    adjustedRoll = baseRoll - qualityBonus;
                } else {
                    adjustedRoll = 0;
                }

                if (adjustedRoll < drops[i].probability) {
                    uint256 itemAmount;
                    if (drops[i].yield == 0) {
                        itemAmount = 1;
                    } else {
                        // Use yield as base quantity, qualityModifier as multiplier
                        itemAmount = (drops[i].yield * qualityMultiplier) / 100;
                        if (itemAmount == 0) {
                            itemAmount = 1;
                        }
                    }

                    totalItemAmount += itemAmount;

                    // Store harvested item information
                    harvestedItemIds[harvestedItemCount] = drops[i].itemId;
                    harvestedItemAmounts[harvestedItemCount] = itemAmount;
                    harvestedItemCount++;

                    // Add item to inventory
                    InventoryItem memory currentItem = inventoryProxy.getItem(
                        msg.sender,
                        drops[i].itemId
                    );
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
        }

        // Guarantee at least one item
        if (totalItemAmount == 0) {
            harvestedItemIds[0] = drops[0].itemId;
            harvestedItemAmounts[0] = 1;
            harvestedItemCount = 1;

            InventoryItem memory currentItem = inventoryProxy.getItem(
                msg.sender,
                drops[0].itemId
            );
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

        // Call plantHarvest to delete plant after processing logic
        plantProxy.plantHarvest(plantId);

        plotProxy.deletePlot(uint256(plant.plotId), msg.sender);

        emit PlantHarvested(
            msg.sender,
            plantId,
            uint256(plant.plotId),
            harvestedItemIds,
            harvestedItemAmounts
        );
    }

    /**
     * @dev Tends to a crop to improve its quality
     * @notice Increases quality modifier by 10% per tending, up to 3 times
     *
     * Requirements:
     * - Caller must be the plant owner
     * - Plant must not be already harvested
     * - Tending cooldown must have passed (checked in component)
     * - Tend count must not exceed 3 (checked in component)
     *
     * Effects:
     * - Increases quality modifier by 10%
     * - Increments tend count
     * - Updates last tended time
     * - Emits PlantTended event
     *
     * @param plantId ID of the plant to tend
     */
    function plantTended(uint256 plantId) external {
        require(plantId > 0, "Invalid plant ID");
        require(
            plantProxy.getPlantOwner(plantId) == msg.sender,
            "Not plant owner"
        );

        Plant memory plant = plantProxy.getPlantedCrop(plantId);
        require(!plant.isHarvested, "Plant already harvested");

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        plantProxy.plantTended(plantId, weatherState);

        emit PlantTended(plantId, weatherState);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Gets plant data by ID
     * @param plantId ID of the plant
     * @return Plant struct with all data
     */
    function getPlantedCrop(
        uint256 plantId
    ) external view returns (Plant memory) {
        return plantProxy.getPlantedCrop(plantId);
    }

    /**
     * @dev Gets the plant ID on a specific plot
     * @param plotId ID of the plot
     * @return Plant ID (0 if no plant)
     */
    function getPlotPlants(uint256 plotId) external view returns (uint256) {
        return plantProxy.getPlotPlants(plotId);
    }

    /**
     * @dev Gets all plant IDs owned by a player
     * @param _playerAddress Address of the player
     * @return Array of plant IDs
     */
    function getOwnerPlants(
        address _playerAddress
    ) external view returns (uint256[] memory) {
        return plantProxy.getOwnerPlants(_playerAddress);
    }

    /**
     * @dev Gets detailed information for all plants owned by a player
     * @param _playerAddress Address of the player
     * @return Array of Plant structs
     */
    function getOwnerPlantsWithDetails(
        address _playerAddress
    ) external view returns (Plant[] memory) {
        return plantProxy.getOwnerPlantsWithDetails(_playerAddress);
    }

    /**
     * @dev Gets the owner of a plant
     * @param plantId ID of the plant
     * @return Address of the plant owner
     */
    function getPlantOwner(uint256 plantId) external view returns (address) {
        return plantProxy.getPlantOwner(plantId);
    }
}
