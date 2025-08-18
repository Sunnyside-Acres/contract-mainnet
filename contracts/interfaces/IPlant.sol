// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Plant.sol";
import "../struct/Weather.sol";

interface IPlantComponent {
    function plantCrop(
        uint256 _plotId,
        uint256 _itemId,
        address _plantOwner,
        uint256 _plotType,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external;

    function plantTended(
        uint256 _plantId,
        WeatherStructs.WeatherState _weatherState
    ) external;

    function plantHarvest(uint256 _plantId) external returns (uint256);

    function getPlantedCrop(
        uint256 plantId
    ) external view returns (Plant memory);

    function getOwnerPlantsWithDetails(
        address owner
    ) external view returns (Plant[] memory);

    function getPlantOwner(uint256 plantId) external view returns (address);

    function getPlots(address owner) external view returns (uint256[] memory);

    function getPlotPlants(uint256 plotId) external view returns (uint256);

    function getOwnerPlants(address owner) external view returns (uint256[] memory);
}
