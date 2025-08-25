// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Task.sol";

interface ITaskComponent {
    // Admin Functions
    function createTaskProof(
        uint256 _taskId,
        address _player,
        uint256 _rewardSunny,
        uint256 _rewardExp,
        uint256[] memory _rewardItems,
        uint256[] memory _rewardItemQuantities,
        uint256 _expiresIn
    ) external returns (bytes32);

    function revokeTaskProof(bytes32 _proofId) external;

    function extendTaskProof(
        bytes32 _proofId,
        uint256 _additionalTime
    ) external;

    // Player Functions
    function claimTaskReward(bytes32 _proofId) external;

    function getTaskProof(
        bytes32 _proofId
    ) external view returns (TaskProof memory);

    function getPlayerProofs(
        address _player
    ) external view returns (TaskProof[] memory);

    function getPlayerActiveProofs(
        address _player
    ) external view returns (TaskProof[] memory);

    function getPlayerClaimedProofs(
        address _player
    ) external view returns (TaskProof[] memory);

    // Stats and Queries
    function getTaskStats() external view returns (TaskStats memory);

    function proofExists(bytes32 _proofId) external view returns (bool);

    function isProofActive(bytes32 _proofId) external view returns (bool);

    function isProofClaimed(bytes32 _proofId) external view returns (bool);

    function canClaimProof(
        address _player,
        bytes32 _proofId
    ) external view returns (bool, string memory);
}

interface ITaskLogic {
    // Admin Functions
    function createTaskProof(
        uint256 _taskId,
        address _player,
        uint256 _rewardSunny,
        uint256 _rewardExp,
        uint256[] memory _rewardItems,
        uint256[] memory _rewardItemQuantities,
        uint256 _expiresIn
    ) external returns (bytes32);

    function revokeTaskProof(bytes32 _proofId) external;

    function extendTaskProof(
        bytes32 _proofId,
        uint256 _additionalTime
    ) external;

    // Player Functions
    function claimTaskReward(bytes32 _proofId) external;

    function getMyProofs() external view returns (TaskProof[] memory);

    function getMyActiveProofs() external view returns (TaskProof[] memory);

    function getMyClaimedProofs() external view returns (TaskProof[] memory);

    // View Functions
    function getTaskProof(
        bytes32 _proofId
    ) external view returns (TaskProof memory);

    function getTaskStatistics() external view returns (TaskStats memory);

    function canClaimProof(
        bytes32 _proofId
    ) external view returns (bool, string memory);

    function getPlayerProofOverview(
        address _player
    )
        external
        view
        returns (
            uint256 totalProofs,
            uint256 activeProofs,
            uint256 claimedProofs,
            uint256 totalSunnyEarned,
            uint256 totalExpEarned
        );
}
