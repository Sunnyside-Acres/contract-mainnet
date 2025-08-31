// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Task.sol";

contract TaskComponent {
    address public world;
    address public admin;
    address public implementation;

    // Mapping từ proof ID đến TaskProof
    mapping(bytes32 => TaskProof) public taskProofs;

    // Mapping từ player address đến danh sách proof IDs
    mapping(address => bytes32[]) public playerProofIds;

    // Mapping từ task ID đến danh sách proof IDs
    mapping(uint256 => bytes32[]) public taskProofIds;

    // Thống kê task
    TaskStats public taskStats;

    // ============ ADMIN FUNCTIONS ============

    function createTaskProof(
        uint256 _taskId,
        address _player,
        uint256 _rewardSunny,
        uint256 _rewardExp,
        uint256[] memory _rewardItems,
        uint256[] memory _rewardItemQuantities,
        uint256 _expiresIn
    ) external returns (bytes32) {
        require(_player != address(0), "Invalid player address");
        require(_expiresIn > 0, "Expiration time must be greater than 0");
        require(
            _rewardItems.length == _rewardItemQuantities.length,
            "Reward arrays length mismatch"
        );

        // Tạo proof ID bằng cách hash taskId + player + timestamp + nonce
        bytes32 proofId = keccak256(
            abi.encodePacked(
                _taskId,
                _player,
                block.timestamp,
                taskStats.totalProofsCreated
            )
        );

        // Kiểm tra proof ID không trùng lặp
        require(taskProofs[proofId].proofId == 0, "Proof ID already exists");

        TaskProof storage proof = taskProofs[proofId];
        proof.proofId = proofId;
        proof.taskId = _taskId;
        proof.player = _player;
        proof.rewardSunny = _rewardSunny;
        proof.rewardExp = _rewardExp;
        proof.rewardItems = _rewardItems;
        proof.rewardItemQuantities = _rewardItemQuantities;
        proof.createdAt = block.timestamp;
        proof.expiresAt = block.timestamp + _expiresIn;
        proof.isClaimed = false;
        proof.isActive = true;

        // Add to player's proof list
        playerProofIds[_player].push(proofId);

        // Add to task's proof list
        taskProofIds[_taskId].push(proofId);

        // Update stats
        taskStats.totalProofsCreated++;

        return proofId;
    }

    function revokeTaskProof(bytes32 _proofId) external {
        require(taskProofs[_proofId].proofId != 0, "Proof does not exist");
        require(taskProofs[_proofId].isActive, "Proof is already inactive");
        require(!taskProofs[_proofId].isClaimed, "Cannot revoke claimed proof");

        taskProofs[_proofId].isActive = false;
    }

    function extendTaskProof(
        bytes32 _proofId,
        uint256 _additionalTime
    ) external {
        require(taskProofs[_proofId].proofId != 0, "Proof does not exist");
        require(taskProofs[_proofId].isActive, "Proof is not active");
        require(!taskProofs[_proofId].isClaimed, "Cannot extend claimed proof");
        require(_additionalTime > 0, "Additional time must be greater than 0");

        taskProofs[_proofId].expiresAt += _additionalTime;
    }

    // ============ PLAYER FUNCTIONS ============

    function claimTaskReward(bytes32 _proofId) external {
        require(taskProofs[_proofId].proofId != 0, "Proof does not exist");
        require(taskProofs[_proofId].isActive, "Proof is not active");
        require(!taskProofs[_proofId].isClaimed, "Proof already claimed");
        require(
            taskProofs[_proofId].expiresAt > block.timestamp,
            "Proof has expired"
        );

        taskProofs[_proofId].isClaimed = true;
        taskStats.totalRewardsClaimed++;
        taskStats.totalSunnyRewarded += taskProofs[_proofId].rewardSunny;
        taskStats.totalExpRewarded += taskProofs[_proofId].rewardExp;
    }

    // ============ VIEW FUNCTIONS ============

    function getTaskProof(
        bytes32 _proofId
    ) external view returns (TaskProof memory) {
        require(taskProofs[_proofId].proofId != 0, "Proof does not exist");
        return taskProofs[_proofId];
    }

    function getPlayerProofs(
        address _player
    ) external view returns (TaskProof[] memory) {
        bytes32[] memory playerProofIdList = playerProofIds[_player];
        TaskProof[] memory playerProofArray = new TaskProof[](
            playerProofIdList.length
        );

        for (uint256 i = 0; i < playerProofIdList.length; i++) {
            playerProofArray[i] = taskProofs[playerProofIdList[i]];
        }

        return playerProofArray;
    }

    function getPlayerActiveProofs(
        address _player
    ) external view returns (TaskProof[] memory) {
        bytes32[] memory playerProofIdList = playerProofIds[_player];

        // Count active proofs first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < playerProofIdList.length; i++) {
            TaskProof memory proof = taskProofs[playerProofIdList[i]];
            if (
                proof.isActive &&
                !proof.isClaimed &&
                proof.expiresAt > block.timestamp
            ) {
                activeCount++;
            }
        }

        TaskProof[] memory activeProofArray = new TaskProof[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < playerProofIdList.length; i++) {
            TaskProof memory proof = taskProofs[playerProofIdList[i]];
            if (
                proof.isActive &&
                !proof.isClaimed &&
                proof.expiresAt > block.timestamp
            ) {
                activeProofArray[currentIndex] = proof;
                currentIndex++;
            }
        }

        return activeProofArray;
    }

    function getPlayerClaimedProofs(
        address _player
    ) external view returns (TaskProof[] memory) {
        bytes32[] memory playerProofIdList = playerProofIds[_player];

        // Count claimed proofs first
        uint256 claimedCount = 0;
        for (uint256 i = 0; i < playerProofIdList.length; i++) {
            if (taskProofs[playerProofIdList[i]].isClaimed) {
                claimedCount++;
            }
        }

        TaskProof[] memory claimedProofArray = new TaskProof[](claimedCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < playerProofIdList.length; i++) {
            if (taskProofs[playerProofIdList[i]].isClaimed) {
                claimedProofArray[currentIndex] = taskProofs[
                    playerProofIdList[i]
                ];
                currentIndex++;
            }
        }

        return claimedProofArray;
    }

    // ============ STATS AND QUERIES ============

    function getTaskStats() external view returns (TaskStats memory) {
        return taskStats;
    }

    function proofExists(bytes32 _proofId) external view returns (bool) {
        return taskProofs[_proofId].proofId != 0;
    }

    function isProofActive(bytes32 _proofId) external view returns (bool) {
        TaskProof memory proof = taskProofs[_proofId];
        return
            proof.isActive &&
            !proof.isClaimed &&
            proof.expiresAt > block.timestamp;
    }

    function isProofClaimed(bytes32 _proofId) external view returns (bool) {
        return taskProofs[_proofId].isClaimed;
    }
}
