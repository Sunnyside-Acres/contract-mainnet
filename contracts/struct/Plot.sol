// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Plot
 * @notice Struct representing a farming plot
 */
struct Plot {
    uint256 id; /// Unique plot ID
    address owner; /// Address of the plot owner
    uint256 plotType; /// Plot type (0=Normal, 1=Fertile, 2=Magic)
    uint256 fertility; /// Fertility level (0-100, affects crop growth rate)
    bool isActive; /// Whether plot is available for planting
    int256 xCoordinate; /// X coordinate on 2D grid
    int256 yCoordinate; /// Y coordinate on 2D grid
    uint256 creationTime; /// Timestamp when plot was created
    bool isLocked; /// Whether plot is locked (due to events or rules)
}
