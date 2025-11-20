// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Plant
 * @notice Struct representing a planted crop
 * @dev Optimized for storage packing: 3 slots (96 bytes) instead of 4 slots (128 bytes)
 *      - Slot 1: id (uint256) - 32 bytes
 *      - Slot 2: plotId (uint128) + itemId (uint128) - 32 bytes (packed)
 *      - Slot 3: plantedTime (uint64) + lastTendedTime (uint64) + growthTime (uint32) +
 *                qualityModifier (uint8) + tendCount (uint8) + isHarvested (bool) + padding (15 bytes)
 *      Total: 3 slots = 96 bytes (saving 32 bytes = 1 slot per plant)
 */
struct Plant {
    uint256 id; /// Unique plant ID (keccak256 hash, requires full uint256)
    uint128 plotId; /// ID of the plot where crop is planted (max 2^128-1)
    uint128 itemId; /// ID of the crop item (max 2^128-1)
    uint64 plantedTime; /// Timestamp when crop was planted (sufficient until year 584 billion)
    uint64 lastTendedTime; /// Timestamp of last tending action
    uint32 growthTime; /// Time required for crop to grow (in seconds, sufficient for ~136 years)
    uint8 qualityModifier; /// Quality modifier from care (0-255, typically 0-140)
    uint8 tendCount; /// Number of times crop has been tended (max 3, uint8 sufficient)
    bool isHarvested; /// Whether crop has been harvested
}
