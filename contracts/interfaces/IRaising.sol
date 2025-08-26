// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Raising.sol";
import "../struct/Weather.sol";

interface IRaisingComponent {
    function startRaising(
        uint256 _itemId,
        address _raisingOwner,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external;

    function feedRaising(
        uint256 _raisingId,
        WeatherStructs.WeatherState _weatherState
    ) external;

    function harvestRaisingWithCooldown(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external returns (uint256);

    function slaughterRaising(uint256 _raisingId) external returns (uint256);

    function getRaising(
        uint256 raisingId
    ) external view returns (Raising memory);

    function getOwnerRaisingsWithDetails(
        address owner
    ) external view returns (Raising[] memory);

    function getRaisingOwner(uint256 raisingId) external view returns (address);

    function getOwnerRaisings(
        address owner
    ) external view returns (uint256[] memory);
}
