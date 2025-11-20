// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Raising
 * @notice Struct representing a raised animal
 */
struct Raising {
    uint256 id; /// Unique raising ID
    uint256 itemId; /// ID of the animal item being raised
    uint256 raisingTime; /// Timestamp when raising started
    uint256 qualityModifier; /// Quality modifier from care (0-100)
    uint256 growthTime; /// Time required for animal to grow
    uint256 lastFeedTime; /// Timestamp of last feeding
    uint256 feedCount; /// Number of times animal has been fed
    bool isHarvested; /// Whether animal has been harvested
    uint256 lastHarvestTime; /// Timestamp of last harvest
    uint256 harvestCount; /// Number of harvests completed (max 3)
    bool isSlaughtered; /// Whether animal has been slaughtered
    uint256 totalHarvestedItems; /// Total items harvested from animal
}
