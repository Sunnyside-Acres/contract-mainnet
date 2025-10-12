// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Plot.sol";

/**
 * @title IPlotComponent
 * @notice Interface for managing farming plots
 */
interface IPlotComponent {
    /**
     * @notice Creates a new plot for a player
     * @param xCoordinate X coordinate of the plot
     * @param yCoordinate Y coordinate of the plot
     * @param plotType Type of the plot
     * @param plotOwner Address of the plot owner
     * @return uint256 ID of the created plot
     */
    function createPlot(
        int256 xCoordinate,
        int256 yCoordinate,
        uint256 plotType,
        address plotOwner
    ) external returns (uint256);

    /**
     * @notice Deletes a plot owned by a player
     * @param plotId ID of the plot to delete
     * @param _playerAddress Address of the player owner
     */
    function deletePlot(uint256 plotId, address _playerAddress) external;

    /**
     * @notice Gets the owner of a specific plot
     * @param plotId ID of the plot
     * @return address Owner address
     */
    function getPlotOwner(uint256 plotId) external view returns (address);

    /**
     * @notice Gets all plots owned by a player
     * @param _plotOwner Address of the plot owner
     * @return Array of Plot structs
     */
    function getPlots(address _plotOwner) external view returns (Plot[] memory);

    /**
     * @notice Gets details of a specific plot
     * @param _plotId ID of the plot
     * @return Plot struct containing plot details
     */
    function getPlot(uint256 _plotId) external view returns (Plot memory);
}
