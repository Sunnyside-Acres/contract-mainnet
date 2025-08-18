// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Plot.sol";

interface IPlotComponent {
    function createPlot(
        int256 xCoordinate,
        int256 yCoordinate,
        uint256 plotType,
        address plotOwner
    ) external returns (uint256);

    function deletePlot(uint256 plotId, address _playerAddress) external;

    function getPlotOwner(uint256 plotId) external view returns (address);

    function getPlots(address _plotOwner) external view returns (Plot[] memory);

    function getPlot(uint256 _plotId) external view returns (Plot memory);
}
