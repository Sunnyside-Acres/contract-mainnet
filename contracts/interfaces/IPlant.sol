// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Plant.sol";
import "../struct/Weather.sol";

/**
 * @title IPlantComponent
 * @notice Interface for managing crop planting and harvesting
 */
interface IPlantComponent {
    /**
     * @notice Plants a crop on a plot
     * @param _plotId ID of the plot
     * @param _itemId ID of the crop item
     * @param _plantOwner Address of the plant owner
     * @param _plotType Type of the plot
     * @param _growthTime Time required for crop to grow
     * @param _weatherState Current weather state
     */
    function plantCrop(
        uint256 _plotId,
        uint256 _itemId,
        address _plantOwner,
        uint256 _plotType,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external;

    /**
     * @notice Tends to a planted crop
     * @param _plantId ID of the plant
     * @param _weatherState Current weather state
     */
    function plantTended(
        uint256 _plantId,
        WeatherStructs.WeatherState _weatherState
    ) external;

    /**
     * @notice Harvests a planted crop
     * @param _plantId ID of the plant to harvest
     * @return uint256 Amount harvested
     */
    function plantHarvest(uint256 _plantId) external returns (uint256);

    /**
     * @notice Gets details of a planted crop
     * @param plantId ID of the plant
     * @return Plant struct containing plant details
     */
    function getPlantedCrop(
        uint256 plantId
    ) external view returns (Plant memory);

    /**
     * @notice Gets all plants owned by an address with details
     * @param owner Address of the owner
     * @return Array of Plant structs
     */
    function getOwnerPlantsWithDetails(
        address owner
    ) external view returns (Plant[] memory);

    /**
     * @notice Gets the owner of a plant
     * @param plantId ID of the plant
     * @return address Owner address
     */
    function getPlantOwner(uint256 plantId) external view returns (address);

    /**
     * @notice Gets all plot IDs owned by an address
     * @param owner Address of the owner
     * @return Array of plot IDs
     */
    function getPlots(address owner) external view returns (uint256[] memory);

    /**
     * @notice Gets the plant ID on a specific plot
     * @param plotId ID of the plot
     * @return uint256 Plant ID
     */
    function getPlotPlants(uint256 plotId) external view returns (uint256);

    /**
     * @notice Gets all plant IDs owned by an address
     * @param owner Address of the owner
     * @return Array of plant IDs
     */
    function getOwnerPlants(
        address owner
    ) external view returns (uint256[] memory);
}
