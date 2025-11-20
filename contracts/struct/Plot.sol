// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Plot
 * @notice Struct representing a farming plot
 * @dev Optimized for storage packing: 3 slots (96 bytes) instead of 9 slots (288 bytes)
 *      - Slot 1: id (uint256) - 32 bytes
 *      - Slot 2: owner (address) + plotType (uint8) + fertility (uint8) + isActive (bool) +
 *                isLocked (bool) + xCoordinate (int32) + yCoordinate (int32) - 32 bytes (packed)
 *      - Slot 3: creationTime (uint64) + padding - 32 bytes
 *      Total: 3 slots = 96 bytes (saving 192 bytes = 6 slots per plot)
 */
struct Plot {
    uint256 id; /// Unique plot ID
    address owner; /// Address of the plot owner
    uint8 plotType; /// Plot type (0=Normal, 1=Fertile, 2=Magic)
    uint8 fertility; /// Fertility level (0-100, affects crop growth rate)
    bool isActive; /// Whether plot is available for planting
    bool isLocked; /// Whether plot is locked (due to events or rules)
    int32 xCoordinate; /// X coordinate on 2D grid (int32 sufficient for ±2.1 billion)
    int32 yCoordinate; /// Y coordinate on 2D grid (int32 sufficient for ±2.1 billion)
    uint64 creationTime; /// Timestamp when plot was created (sufficient until year 584 billion)
}
