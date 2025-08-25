// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ITask.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../struct/Task.sol";
import "../../struct/Player.sol";
import "../../struct/Inventory.sol";

/**
 * @title TaskLogic
 * @dev Logic contract cho Task System - quản lý proof và claim thưởng
 *
 * Tính năng chính:
 * - Admin tạo proof cho task hoàn thành
 * - User claim thưởng bằng proof ID
 * - Quản lý thời gian hết hạn proof
 * - Thống kê và báo cáo task
 */
contract TaskLogic {
    IWorld public world;
    ITaskComponent public taskProxy;
    IPlayerComponent public playerProxy;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;

    // ============ EVENTS ============

    event TaskProofCreated(
        bytes32 indexed proofId,
        uint256 indexed taskId,
        address indexed player,
        uint256 rewardSunny,
        uint256 rewardExp,
        uint256 expiresAt
    );

    event TaskProofRevoked(bytes32 indexed proofId, address indexed player);

    event TaskProofExtended(
        bytes32 indexed proofId,
        uint256 additionalTime,
        uint256 newExpiresAt
    );

    event TaskRewardClaimed(
        address indexed player,
        bytes32 indexed proofId,
        uint256 rewardSunny,
        uint256 rewardExp,
        uint256[] rewardItems
    );

    // ============ MODIFIERS ============

    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _world,
        address _taskProxy,
        address _playerProxy,
        address _inventoryProxy,
        address _itemProxy
    ) {
        world = IWorld(_world);
        taskProxy = ITaskComponent(_taskProxy);
        playerProxy = IPlayerComponent(_playerProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Admin tạo proof cho task hoàn thành
     * @param _taskId ID của task
     * @param _player Địa chỉ người chơi
     * @param _rewardSunny Phần thưởng sunny
     * @param _rewardExp Phần thưởng kinh nghiệm
     * @param _rewardItems Danh sách item thưởng
     * @param _rewardItemQuantities Số lượng item thưởng
     * @param _expiresIn Thời gian hết hạn (giây)
     */
    function createTaskProof(
        uint256 _taskId,
        address _player,
        uint256 _rewardSunny,
        uint256 _rewardExp,
        uint256[] memory _rewardItems,
        uint256[] memory _rewardItemQuantities,
        uint256 _expiresIn
    ) external onlyAdmin returns (bytes32) {
        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(_player);
        require(playerData.level > 0, "Player not initialized");

        // Validate reward items
        for (uint256 i = 0; i < _rewardItems.length; i++) {
            require(
                itemProxy.exists(_rewardItems[i]),
                "Reward item does not exist"
            );
            require(
                _rewardItemQuantities[i] > 0,
                "Reward item quantity must be greater than 0"
            );
        }

        bytes32 proofId = taskProxy.createTaskProof(
            _taskId,
            _player,
            _rewardSunny,
            _rewardExp,
            _rewardItems,
            _rewardItemQuantities,
            _expiresIn
        );

        emit TaskProofCreated(
            proofId,
            _taskId,
            _player,
            _rewardSunny,
            _rewardExp,
            block.timestamp + _expiresIn
        );

        return proofId;
    }

    /**
     * @dev Admin thu hồi proof
     */
    function revokeTaskProof(bytes32 _proofId) external onlyAdmin {
        TaskProof memory proof = taskProxy.getTaskProof(_proofId);
        require(proof.proofId != 0, "Proof does not exist");
        require(proof.isActive, "Proof is already inactive");
        require(!proof.isClaimed, "Cannot revoke claimed proof");

        taskProxy.revokeTaskProof(_proofId);

        emit TaskProofRevoked(_proofId, proof.player);
    }

    /**
     * @dev Admin gia hạn proof
     */
    function extendTaskProof(
        bytes32 _proofId,
        uint256 _additionalTime
    ) external onlyAdmin {
        TaskProof memory proof = taskProxy.getTaskProof(_proofId);
        require(proof.proofId != 0, "Proof does not exist");
        require(proof.isActive, "Proof is not active");
        require(!proof.isClaimed, "Cannot extend claimed proof");

        taskProxy.extendTaskProof(_proofId, _additionalTime);

        emit TaskProofExtended(
            _proofId,
            _additionalTime,
            proof.expiresAt + _additionalTime
        );
    }

    // ============ PLAYER FUNCTIONS ============

    /**
     * @dev Người chơi claim thưởng task
     * @param _proofId ID của proof
     */
    function claimTaskReward(bytes32 _proofId) external {
        address player = msg.sender;

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");

        // Check if proof exists and can be claimed
        (bool canClaim, string memory message) = taskProxy.canClaimProof(
            player,
            _proofId
        );
        require(canClaim, message);

        // Get proof details
        TaskProof memory proof = taskProxy.getTaskProof(_proofId);

        // Claim the proof
        taskProxy.claimTaskReward(_proofId);

        // Give rewards
        if (proof.rewardSunny > 0) {
            playerProxy.addSunny(player, proof.rewardSunny);
        }

        if (proof.rewardExp > 0) {
            // Note: Using addSunny for exp reward since addExp doesn't exist
            playerProxy.addSunny(player, proof.rewardExp);
        }

        // Give item rewards
        for (uint256 i = 0; i < proof.rewardItems.length; i++) {
            uint256 itemId = proof.rewardItems[i];
            uint256 quantity = proof.rewardItemQuantities[i];

            // Add item to player's inventory
            InventoryItem memory playerItem = inventoryProxy.getItem(
                player,
                itemId
            );
            uint256 newQuantity = playerItem.quantity + quantity;

            inventoryProxy.setItem(
                player,
                itemId,
                newQuantity,
                playerItem.durability,
                playerItem.expiration
            );
        }

        emit TaskRewardClaimed(
            player,
            _proofId,
            proof.rewardSunny,
            proof.rewardExp,
            proof.rewardItems
        );
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Người chơi xem tất cả proof của mình
     */
    function getMyProofs() external view returns (TaskProof[] memory) {
        return taskProxy.getPlayerProofs(msg.sender);
    }

    /**
     * @dev Người chơi xem proof đang hoạt động
     */
    function getMyActiveProofs() external view returns (TaskProof[] memory) {
        return taskProxy.getPlayerActiveProofs(msg.sender);
    }

    /**
     * @dev Người chơi xem proof đã claim
     */
    function getMyClaimedProofs() external view returns (TaskProof[] memory) {
        return taskProxy.getPlayerClaimedProofs(msg.sender);
    }

    /**
     * @dev Xem chi tiết proof
     */
    function getTaskProof(
        bytes32 _proofId
    ) external view returns (TaskProof memory) {
        return taskProxy.getTaskProof(_proofId);
    }

    /**
     * @dev Lấy thống kê task
     */
    function getTaskStatistics() external view returns (TaskStats memory) {
        return taskProxy.getTaskStats();
    }

    /**
     * @dev Kiểm tra xem có thể claim proof không
     */
    function canClaimProof(
        bytes32 _proofId
    ) external view returns (bool, string memory) {
        return taskProxy.canClaimProof(msg.sender, _proofId);
    }

    /**
     * @dev Lấy tổng quan proof của người chơi
     */
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
        )
    {
        TaskProof[] memory allProofs = taskProxy.getPlayerProofs(_player);
        TaskProof[] memory activeProofsArray = taskProxy.getPlayerActiveProofs(
            _player
        );
        TaskProof[] memory claimedProofsArray = taskProxy
            .getPlayerClaimedProofs(_player);

        totalProofs = allProofs.length;
        activeProofs = activeProofsArray.length;
        claimedProofs = claimedProofsArray.length;

        // Calculate total rewards earned
        for (uint256 i = 0; i < claimedProofsArray.length; i++) {
            totalSunnyEarned += claimedProofsArray[i].rewardSunny;
            totalExpEarned += claimedProofsArray[i].rewardExp;
        }
    }

    /**
     * @dev Lấy danh sách proof có thể claim cho người chơi
     */
    function getClaimableProofs(
        address _player
    ) external view returns (TaskProof[] memory) {
        TaskProof[] memory activeProofs = taskProxy.getPlayerActiveProofs(
            _player
        );

        // Count claimable proofs
        uint256 claimableCount = 0;
        for (uint256 i = 0; i < activeProofs.length; i++) {
            (bool canClaim, ) = taskProxy.canClaimProof(
                _player,
                activeProofs[i].proofId
            );
            if (canClaim) {
                claimableCount++;
            }
        }

        // Create filtered array
        TaskProof[] memory claimableProofs = new TaskProof[](claimableCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < activeProofs.length; i++) {
            (bool canClaim, ) = taskProxy.canClaimProof(
                _player,
                activeProofs[i].proofId
            );
            if (canClaim) {
                claimableProofs[currentIndex] = activeProofs[i];
                currentIndex++;
            }
        }

        return claimableProofs;
    }
}
