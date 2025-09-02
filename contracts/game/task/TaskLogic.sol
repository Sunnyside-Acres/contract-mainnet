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

    // ============ ADMIN FUNCTIONS (WRITE) ============

    /**
     * @dev Admin tạo proof cho task hoàn thành
     *
     * Chức năng:
     * - Tạo proof mới cho người chơi đã hoàn thành task
     * - Kiểm tra người chơi có tồn tại và được khởi tạo
     * - Validate các item reward có tồn tại và số lượng hợp lệ
     * - Tạo proof với thời gian hết hạn
     * - Emit event TaskProofCreated
     *
     * @param _taskId ID của task đã hoàn thành
     * @param _player Địa chỉ người chơi nhận proof
     * @param _rewardSunny Phần thưởng sunny
     * @param _rewardExp Phần thưởng kinh nghiệm
     * @param _rewardItems Danh sách ID item thưởng
     * @param _rewardItemQuantities Số lượng tương ứng của từng item
     * @param _expiresIn Thời gian hết hạn proof (giây)
     * @return bytes32 ID của proof vừa tạo
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
     *
     * Chức năng:
     * - Thu hồi proof đang active và chưa claim
     * - Kiểm tra proof có tồn tại và có thể thu hồi
     * - Cập nhật trạng thái proof thành inactive
     * - Emit event TaskProofRevoked
     *
     * @param _proofId ID của proof cần thu hồi
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
     * @dev Admin gia hạn thời gian proof
     *
     * Chức năng:
     * - Gia hạn thời gian hết hạn của proof đang active
     * - Kiểm tra proof có tồn tại và có thể gia hạn
     * - Cộng thêm thời gian vào thời gian hết hạn hiện tại
     * - Emit event TaskProofExtended
     *
     * @param _proofId ID của proof cần gia hạn
     * @param _additionalTime Thời gian gia hạn thêm (giây)
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

    // ============ PLAYER FUNCTIONS (WRITE) ============

    /**
     * @dev Người chơi claim thưởng task
     *
     * Chức năng:
     * - Kiểm tra proof có hợp lệ và có thể claim không
     * - Cập nhật trạng thái proof thành đã claim
     * - Cộng thêm sunny và exp cho người chơi
     * - Thêm items vào inventory của người chơi
     * - Emit event TaskRewardClaimed
     *
     * @param _proofId ID của proof cần claim
     */
    function claimTaskReward(bytes32 _proofId) external {
        address player = msg.sender;

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");

        // Get proof details
        TaskProof memory proof = taskProxy.getTaskProof(_proofId);

        // Claim the proof
        taskProxy.claimTaskReward(_proofId);

        // Give rewards
        if (proof.rewardSunny > 0) {
            playerProxy.addSunny(player, proof.rewardSunny);
        }

        if (proof.rewardExp > 0) {
            playerProxy.addXP(player, proof.rewardExp);
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

    // ============ VIEW FUNCTIONS (READ) ============
    /**
     * @dev Người chơi xem proof đang hoạt động
     *
     * Chức năng:
     * - Lấy các proof còn hiệu lực (chưa hết hạn và chưa claim) của người chơi hiện tại
     * - Trả về mảng TaskProof[] chứa các proof active
     *
     * @return TaskProof[] Mảng chứa các proof đang hoạt động
     */
    function getMyActiveProofs() external view returns (TaskProof[] memory) {
        return taskProxy.getPlayerActiveProofs(msg.sender);
    }

    /**
     * @dev Người chơi xem proof đã claim
     *
     * Chức năng:
     * - Lấy các proof đã được claim thành công của người chơi hiện tại
     * - Trả về mảng TaskProof[] chứa các proof đã claim
     *
     * @return TaskProof[] Mảng chứa các proof đã claim
     */
    function getMyClaimedProofs() external view returns (TaskProof[] memory) {
        return taskProxy.getPlayerClaimedProofs(msg.sender);
    }

    /**
     * @dev Xem chi tiết proof theo ID
     *
     * Chức năng:
     * - Lấy thông tin chi tiết của một proof cụ thể theo proofId
     * - Trả về struct TaskProof chứa đầy đủ thông tin proof
     *
     * @param _proofId ID của proof cần xem chi tiết
     * @return TaskProof Struct chứa thông tin chi tiết của proof
     */
    function getTaskProof(
        bytes32 _proofId
    ) external view returns (TaskProof memory) {
        return taskProxy.getTaskProof(_proofId);
    }

    /**
     * @dev Lấy thống kê tổng quan về task system
     *
     * Chức năng:
     * - Lấy thống kê tổng quan về toàn bộ hệ thống task
     * - Bao gồm số lượng proof đã tạo, đã claim, tổng reward đã phát
     * - Trả về struct TaskStats chứa các thông số thống kê
     *
     * @return TaskStats Struct chứa thống kê tổng quan task system
     */
    function getTaskStatistics() external view returns (TaskStats memory) {
        return taskProxy.getTaskStats();
    }

    /**
     * @dev Lấy tổng quan proof của người chơi
     *
     * Chức năng:
     * - Lấy thống kê tổng quan về proof của một người chơi cụ thể
     * - Tính toán số lượng proof theo từng trạng thái (tổng, active, claimed)
     * - Tính tổng reward đã nhận (sunny và exp)
     * - Trả về tuple chứa các thông số thống kê
     *
     * @param _player Địa chỉ người chơi cần xem thống kê
     * @return totalProofs Tổng số proof của người chơi
     * @return activeProofs Số proof đang hoạt động
     * @return claimedProofs Số proof đã claim
     * @return totalSunnyEarned Tổng sunny đã nhận từ task
     * @return totalExpEarned Tổng exp đã nhận từ task
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
}
