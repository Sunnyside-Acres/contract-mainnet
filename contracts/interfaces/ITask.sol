// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Task.sol";

/**
 * @title ITaskComponent
 * @notice Interface for managing player tasks and rewards
 */
interface ITaskComponent {
    /**
     * @notice Creates a task proof for a player (admin only)
     * @param _taskId ID of the task
     * @param _player Address of the player
     * @param _rewardSunny Sunny currency reward
     * @param _rewardSunlight Sunlight currency reward
     * @param _rewardExp Experience points reward
     * @param _rewardItems Array of item IDs as rewards
     * @param _rewardItemQuantities Array of item quantities as rewards
     * @param _expiresIn Time in seconds until proof expires
     * @return bytes32 Unique proof ID
     */
    function createTaskProof(
        uint256 _taskId,
        address _player,
        uint256 _rewardSunny,
        uint256 _rewardSunlight,
        uint256 _rewardExp,
        uint256[] memory _rewardItems,
        uint256[] memory _rewardItemQuantities,
        uint256 _expiresIn
    ) external returns (bytes32);

    /**
     * @notice Revokes a task proof (admin only)
     * @param _proofId ID of the proof to revoke
     */
    function revokeTaskProof(bytes32 _proofId) external;

    /**
     * @notice Extends the expiration time of a task proof (admin only)
     * @param _proofId ID of the proof to extend
     * @param _additionalTime Additional time in seconds
     */
    function extendTaskProof(
        bytes32 _proofId,
        uint256 _additionalTime
    ) external;

    /**
     * @notice Claims task rewards using a valid proof
     * @param _proofId ID of the proof to claim
     */
    function claimTaskReward(bytes32 _proofId) external;

    /**
     * @notice Gets details of a task proof
     * @param _proofId ID of the proof
     * @return TaskProof struct containing proof details
     */
    function getTaskProof(
        bytes32 _proofId
    ) external view returns (TaskProof memory);

    /**
     * @notice Gets all task proofs for a player
     * @param _player Address of the player
     * @return Array of TaskProof structs
     */
    function getPlayerProofs(
        address _player
    ) external view returns (TaskProof[] memory);

    /**
     * @notice Gets active (unclaimed) task proofs for a player
     * @param _player Address of the player
     * @return Array of active TaskProof structs
     */
    function getPlayerActiveProofs(
        address _player
    ) external view returns (TaskProof[] memory);

    /**
     * @notice Gets claimed task proofs for a player
     * @param _player Address of the player
     * @return Array of claimed TaskProof structs
     */
    function getPlayerClaimedProofs(
        address _player
    ) external view returns (TaskProof[] memory);

    /**
     * @notice Gets overall task statistics
     * @return TaskStats struct containing statistics
     */
    function getTaskStats() external view returns (TaskStats memory);

    /**
     * @notice Checks if a task proof exists
     * @param _proofId ID of the proof to check
     * @return bool True if proof exists
     */
    function proofExists(bytes32 _proofId) external view returns (bool);

    /**
     * @notice Checks if a task proof is active
     * @param _proofId ID of the proof to check
     * @return bool True if proof is active
     */
    function isProofActive(bytes32 _proofId) external view returns (bool);

    /**
     * @notice Checks if a task proof has been claimed
     * @param _proofId ID of the proof to check
     * @return bool True if proof has been claimed
     */
    function isProofClaimed(bytes32 _proofId) external view returns (bool);
}
