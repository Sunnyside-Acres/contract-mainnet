// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Plant
 * @notice Struct representing a planted crop
 */
struct Plant {
    uint256 id; /// Unique plant ID
    uint256 plotId; /// ID of the plot where crop is planted
    uint256 itemId; /// ID of the crop item
    uint256 plantedTime; /// Timestamp when crop was planted
    uint256 lastTendedTime; /// Timestamp of last tending action
    uint256 qualityModifier; /// Quality modifier from care (0-100)
    uint256 growthTime; /// Time required for crop to grow
    uint256 tendCount; /// Number of times crop has been tended
    bool isHarvested; /// Whether crop has been harvested
}
