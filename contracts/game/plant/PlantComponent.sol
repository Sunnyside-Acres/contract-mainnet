// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Plant.sol";
import "../../struct/Weather.sol";

/**
 * @title PlantComponent
 * @dev Component contract for Plant/Crop system - manages crop planting data
 * @notice This contract stores and manages all plant-related data and state
 *
 * Key Features:
 * - Tracks crop lifecycle (plant, tend, harvest)
 * - Weather and plot type-based growth time and quality adjustments
 * - Tending mechanics with quality modifiers (up to 3 times)
 * - Plot-based crop management
 */
contract PlantComponent {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping to store plant information by plant ID
    mapping(uint256 => Plant) public plants;

    /// @notice Mapping from plot ID to plant ID
    mapping(uint256 => uint256) public plotPlants;

    /// @notice Mapping from owner address to their plant IDs
    mapping(address => uint256[]) public ownerPlants;

    /// @notice Mapping from plant ID to owner address
    mapping(uint256 => address) public plantOwners;

    /// @notice Emitted when a seed is planted on a plot
    event PlantPlanted(
        uint256 indexed plantId,
        address indexed plantOwner,
        uint256 indexed plotId,
        uint256 itemId
    );

    /// @notice Emitted when a crop is tended
    event PlantTended(uint256 indexed plantId, uint256 qualityModifier);

    /// @notice Emitted when a crop is harvested
    event PlantHarvested(uint256 indexed plantId);

    /**
     * @dev Modifier to restrict access to authorized logic contracts only
     * @notice Reverts if caller is not a registered logic contract
     */
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    /**
     * @dev Plants a seed on a plot with modifiers
     * @notice Creates a new plant with plot type and weather-adjusted growth time and quality
     *
     * Requirements:
     * - Caller must be authorized logic contract
     * - Plant ID must not already exist
     * - Growth time must be greater than 0
     * - Plot type must be valid (0, 1, or 2)
     *
     * Plot Type Modifiers:
     * - Type 0 (Basic): No bonus
     * - Type 1 (Medium): -5% time, +5 quality
     * - Type 2 (Premium): -10% time, +10 quality
     *
     * Weather Modifiers:
     * - Sunny: -5% time, +5 quality
     * - Cloudy: -10% time, +10 quality
     * - Rainy: -15% time, +15 quality
     * - Stormy: -20% time, +20 quality
     *
     * @param _plotId ID of the plot to plant on
     * @param _itemId ID of the seed item
     * @param _plantOwner Address of the plant owner
     * @param _plotType Type of the plot (0, 1, or 2)
     * @param _growthTime Base growth time in seconds
     * @param _weatherState Current weather state for modifiers
     */
    function plantCrop(
        uint256 _plotId,
        uint256 _itemId,
        address _plantOwner,
        uint256 _plotType,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external onlyAuthorized {
        uint256 plantId = uint256(
            keccak256(
                abi.encodePacked(_plantOwner, _plotId, _itemId, block.timestamp)
            )
        );

        require(plants[plantId].id == 0, "[COMPONENT] Plant already exists");
        require(_growthTime > 0, "[COMPONENT] Invalid growth time");
        require(_plotType <= 2, "[COMPONENT] Invalid plot type");

        uint256 adjustedGrowthTime = _growthTime;
        uint256 adjustedQuality = 100;

        if (_plotType == 1) {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // -5%
            adjustedQuality += 5;
        } else if (_plotType == 2) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // -10%
            adjustedQuality += 10;
        }

        if (_weatherState == WeatherStructs.WeatherState.Cloudy) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // -10%
            adjustedQuality += 10;
        } else if (_weatherState == WeatherStructs.WeatherState.Rainy) {
            adjustedGrowthTime = (adjustedGrowthTime * 85) / 100; // -15%
            adjustedQuality += 15;
        } else if (_weatherState == WeatherStructs.WeatherState.Stormy) {
            adjustedGrowthTime = (adjustedGrowthTime * 80) / 100; // -20%
            adjustedQuality += 20;
        } else {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // -5%
            adjustedQuality += 5;
        }

        plants[plantId] = Plant(
            plantId,
            uint128(_plotId),
            uint128(_itemId),
            uint64(block.timestamp),
            uint64(block.timestamp),
            uint32(adjustedGrowthTime),
            uint8(adjustedQuality),
            0,
            false
        );

        plotPlants[_plotId] = plantId;
        ownerPlants[_plantOwner].push(plantId);
        plantOwners[plantId] = _plantOwner;

        emit PlantPlanted(plantId, _plantOwner, _plotId, _itemId);
    }

    /**
     * @dev Tends to a crop to improve its quality
     * @notice Reduces growth time and increases quality modifier, up to 3 times
     *
     * Requirements:
     * - Caller must be authorized logic contract
     * - Plant must not be harvested
     * - Tend count must not exceed 3
     * - Tending cooldown must have passed (growthTime / 3)
     *
     * Weather Effects:
     * - Sunny: -5% time, +5 quality
     * - Cloudy: -10% time, +10 quality
     * - Rainy: -15% time, +15 quality
     * - Stormy: -20% time, +20 quality
     *
     * Effects:
     * - Reduces growth time based on weather
     * - Increases quality modifier
     * - Updates last tended time
     * - Increments tend count
     *
     * @param _plantId ID of the plant to tend
     * @param _weatherState Current weather state for modifiers
     */
    function plantTended(
        uint256 _plantId,
        WeatherStructs.WeatherState _weatherState
    ) external onlyAuthorized {
        Plant storage plant = plants[_plantId];
        require(!plant.isHarvested, "[COMPONENT] Plant already harvested");

        require(plant.tendCount <= 3, "[COMPONENT] Too many tend");

        require(
            block.timestamp >= plant.lastTendedTime + (plant.growthTime / 3),
            "Too early to tend"
        );

        uint256 adjustedGrowthTime = plant.growthTime;
        uint256 adjustedQuality = plant.qualityModifier;

        if (_weatherState == WeatherStructs.WeatherState.Cloudy) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // -10%
            adjustedQuality += 10;
        } else if (_weatherState == WeatherStructs.WeatherState.Rainy) {
            adjustedGrowthTime = (adjustedGrowthTime * 85) / 100; // -15%
            adjustedQuality += 15;
        } else if (_weatherState == WeatherStructs.WeatherState.Stormy) {
            adjustedGrowthTime = (adjustedGrowthTime * 80) / 100; // -20%
            adjustedQuality += 20;
        } else {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // -5%
            adjustedQuality += 5;
        }

        plant.qualityModifier = uint8(adjustedQuality);
        plant.growthTime = uint32(adjustedGrowthTime);
        plant.lastTendedTime = uint64(block.timestamp);
        plant.tendCount++;

        emit PlantTended(_plantId, adjustedQuality);
    }

    /**
     * @dev Harvests a fully grown crop
     * @notice Removes the plant and returns quality modifier for reward calculation
     *
     * Requirements:
     * - Caller must be authorized logic contract
     * - Plant must not be already harvested
     * - Plant must be fully grown
     *
     * Effects:
     * - Removes plant from owner's list
     * - Deletes plant data
     * - Removes plant from plot mapping
     * - Deletes owner mapping
     *
     * @param _plantId ID of the plant to harvest
     * @return qualityModifier Quality modifier for reward calculation
     */
    function plantHarvest(
        uint256 _plantId
    ) external onlyAuthorized returns (uint256) {
        Plant storage plant = plants[_plantId];
        require(!plant.isHarvested, "[COMPONENT] Plant already harvested");
        require(
            plant.plantedTime + plant.growthTime <= block.timestamp,
            "Plant not fully grown"
        );

        // Save necessary information before deletion
        address owner = plantOwners[_plantId];
        uint256 plotId = plant.plotId;
        uint256 qualityModifier = plant.qualityModifier;

        // Remove from owner list first
        removePlantFromOwnerList(owner, _plantId);

        // Then delete mappings
        delete plantOwners[_plantId];
        delete plants[_plantId];
        delete plotPlants[plotId];

        emit PlantHarvested(_plantId);
        return qualityModifier;
    }

    /**
     * @dev Internal helper to remove a plant from owner's list
     * @notice Uses swap-and-pop pattern for gas efficiency
     * @param owner Address of the plant owner
     * @param plantId ID of the plant to remove
     */
    function removePlantFromOwnerList(address owner, uint256 plantId) internal {
        uint256[] storage ownerPlantList = ownerPlants[owner];
        uint256 length = ownerPlantList.length;

        for (uint256 i = 0; i < length; i++) {
            if (ownerPlantList[i] == plantId) {
                // Move last element to current position (if not already last)
                if (i < length - 1) {
                    ownerPlantList[i] = ownerPlantList[length - 1];
                }

                // Remove last element
                ownerPlantList.pop();
                return; // Exit immediately when found and removed
            }
        }
    }

    /**
     * @dev Gets plant data by ID
     * @param plantId ID of the plant
     * @return Plant struct with all data
     */
    function getPlantedCrop(
        uint256 plantId
    ) external view onlyAuthorized returns (Plant memory) {
        return plants[plantId];
    }

    /**
     * @dev Gets the plant ID on a specific plot
     * @param plotId ID of the plot
     * @return Plant ID (0 if no plant)
     */
    function getPlotPlants(
        uint256 plotId
    ) external view onlyAuthorized returns (uint256) {
        return plotPlants[plotId];
    }

    /**
     * @dev Gets all plant IDs owned by an address
     * @param owner Address of the owner
     * @return Array of plant IDs
     */
    function getOwnerPlants(
        address owner
    ) external view onlyAuthorized returns (uint256[] memory) {
        return ownerPlants[owner];
    }

    /**
     * @dev Gets detailed information for all active plants owned by an address
     * @notice Only returns plants that are not harvested and still exist
     * @param owner Address of the owner
     * @return Array of Plant structs with full details
     */
    function getOwnerPlantsWithDetails(
        address owner
    ) external view onlyAuthorized returns (Plant[] memory) {
        require(owner != address(0), "Invalid owner address");

        uint256[] memory allPlants = ownerPlants[owner];
        uint256 count = 0;

        // Count valid plants (exist in mapping and not harvested)
        for (uint256 i = 0; i < allPlants.length; i++) {
            uint256 plantId = allPlants[i];
            if (
                plantOwners[plantId] == owner && // Verify ownership
                plants[plantId].id != 0 && // Verify plant exists
                !plants[plantId].isHarvested // Verify not harvested
            ) {
                count++;
            }
        }

        // Create result array with appropriate size
        Plant[] memory result = new Plant[](count);
        uint256 index = 0;

        // Get details for valid plants
        for (uint256 i = 0; i < allPlants.length; i++) {
            uint256 plantId = allPlants[i];
            if (
                plantOwners[plantId] == owner &&
                plants[plantId].id != 0 &&
                !plants[plantId].isHarvested
            ) {
                Plant memory plant = plants[plantId];
                result[index] = plant;
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Gets the owner of a plant
     * @param plantId ID of the plant
     * @return Address of the plant owner
     */
    function getPlantOwner(
        uint256 plantId
    ) external view onlyAuthorized returns (address) {
        return plantOwners[plantId];
    }

    /**
     * @dev Cleans up invalid entries from owner's plant list
     * @notice Removes plants that no longer exist or are harvested
     * @param owner Address of the owner to clean up
     */
    function cleanupOwnerPlants(address owner) external onlyAuthorized {
        uint256[] storage ownerPlantList = ownerPlants[owner];
        uint256 length = ownerPlantList.length;

        for (uint256 i = length; i > 0; i--) {
            uint256 plantId = ownerPlantList[i - 1];
            // Check if plant still exists
            if (plants[plantId].id == 0 || plantOwners[plantId] != owner) {
                // Move last element to current position (if not already last)
                if (i - 1 < length - 1) {
                    ownerPlantList[i - 1] = ownerPlantList[length - 1];
                }
                // Remove last element
                ownerPlantList.pop();
                length--;
            }
        }
    }
}
