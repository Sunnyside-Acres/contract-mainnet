// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TaskProof
 * @notice Struct representing a task completion proof
 */
struct TaskProof {
    bytes32 proofId; /// Unique proof ID (hash of taskId + player + nonce)
    uint256 taskId; /// ID of the task
    address player; /// Address of the player
    uint256 rewardSunny; /// Sunny currency reward
    uint256 rewardSunlight; /// Sunlight currency reward
    uint256 rewardExp; /// Experience points reward
    uint256[] rewardItems; /// Array of reward item IDs
    uint256[] rewardItemQuantities; /// Array of reward item quantities
    uint256 createdAt; /// Timestamp when proof was created
    uint256 expiresAt; /// Expiration timestamp
    bool isClaimed; /// Whether rewards have been claimed
    bool isActive; /// Whether proof is active
}

/**
 * @title TaskStats
 * @notice Struct containing task system statistics
 */
struct TaskStats {
    uint256 totalProofsCreated; /// Total proofs created
    uint256 totalRewardsClaimed; /// Total rewards claimed
    uint256 totalSunnyRewarded; /// Total sunny rewarded
    uint256 totalSunlightRewarded; /// Total sunlight rewarded
    uint256 totalExpRewarded; /// Total experience rewarded
}
