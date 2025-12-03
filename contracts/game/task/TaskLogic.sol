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
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TaskLogic
 * @dev Logic contract for Task System - manages proof and reward claims
 * @notice This contract handles task completion verification and reward distribution
 *
 * Key Features:
 * - Admin creates proof for completed tasks
 * - Users claim rewards using proof ID
 * - Manages proof expiration time
 * - Task statistics and reporting
 */
contract TaskLogic {
    IWorld public world;
    ITaskComponent public taskProxy;
    IPlayerComponent public playerProxy;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    mapping(address => uint256) public nonces;
    // ============ EVENTS ============

    event TaskProofCreated(
        bytes32 indexed proofId,
        uint256 indexed taskId,
        address indexed player,
        uint256 rewardSunny,
        uint256 rewardSunlight,
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
        uint256 rewardSunlight,
        uint256 rewardExp,
        uint256[] rewardItems
    );

    // ============ MODIFIERS ============

    /**
     * @dev Modifier to restrict access to admin only
     * @notice Reverts if caller is not an admin in the World contract
     */
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    // ============ CONSTRUCTOR ============

    /**
     * @dev Initializes the TaskLogic contract with required dependencies
     * @param _world Address of the World contract
     * @param _taskProxy Address of the TaskComponent proxy contract
     * @param _playerProxy Address of the PlayerComponent proxy contract
     * @param _inventoryProxy Address of the InventoryComponent proxy contract
     * @param _itemProxy Address of the ItemComponent proxy contract
     */
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
     * @dev Admin creates proof for completed task
     * @notice Creates a new proof for a player who has completed a task
     *
     * Requirements:
     * - Caller must be admin
     * - Player must exist and be initialized
     * - Reward items must exist and have valid quantities
     *
     * Effects:
     * - Creates proof with expiration time
     * - Emits TaskProofCreated event
     *
     * @param _taskId ID of the completed task
     * @param _rewardSunny Sunny token reward amount
     * @param _rewardSunlight Sunlight token reward amount
     * @param _rewardExp Experience points reward
     * @param _rewardItems Array of reward item IDs
     * @param _rewardItemQuantities Array of quantities corresponding to each item
     * @param _expiresIn Proof expiration time in seconds
     * @param proof Off-chain generated proof signed by an admin
     * @return proofId The ID of the newly created proof
     */
    function createTaskProof(
        uint256 _taskId,
        uint256 _rewardSunny,
        uint256 _rewardSunlight,
        uint256 _rewardExp,
        uint256[] memory _rewardItems,
        uint256[] memory _rewardItemQuantities,
        uint256 _expiresIn,
        bytes memory proof
    ) external returns (bytes32) {
        bytes32 message = keccak256(
            abi.encodePacked(
                _taskId,
                msg.sender,
                _rewardSunny,
                _rewardSunlight,
                _rewardExp,
                _rewardItems,
                _rewardItemQuantities,
                _expiresIn,
                nonces[msg.sender]
            )
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            message
        );
        address signer = ECDSA.recover(ethSignedMessageHash, proof);
        require(
            IWorld(world).isAdmin(signer),
            "Invalid proof: not signed by admin"
        );
        nonces[msg.sender]++;

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(msg.sender);
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
            msg.sender,
            _rewardSunny,
            _rewardSunlight,
            _rewardExp,
            _rewardItems,
            _rewardItemQuantities,
            _expiresIn
        );

        emit TaskProofCreated(
            proofId,
            _taskId,
            msg.sender,
            _rewardSunny,
            _rewardSunlight,
            _rewardExp,
            block.timestamp + _expiresIn
        );

        return proofId;
    }

    /**
     * @dev Admin revokes an active proof
     * @notice Revokes an active and unclaimed proof
     *
     * Requirements:
     * - Caller must be admin
     * - Proof must exist
     * - Proof must be active
     * - Proof must not be claimed
     *
     * Effects:
     * - Sets proof status to inactive
     * - Emits TaskProofRevoked event
     *
     * @param _proofId ID of the proof to revoke
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
     * @dev Admin extends proof expiration time
     * @notice Extends the expiration time of an active proof
     *
     * Requirements:
     * - Caller must be admin
     * - Proof must exist
     * - Proof must be active
     * - Proof must not be claimed
     *
     * Effects:
     * - Adds additional time to current expiration time
     * - Emits TaskProofExtended event
     *
     * @param _proofId ID of the proof to extend
     * @param _additionalTime Additional time to add in seconds
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
     * @dev Player claims task rewards
     * @notice Claims rewards for a completed task using proof ID
     *
     * Requirements:
     * - Caller must be initialized player
     * - Proof must be valid and claimable
     *
     * Effects:
     * - Marks proof as claimed
     * - Adds Sunny and Sunlight tokens to player
     * - Adds experience points to player
     * - Adds reward items to player's inventory
     * - Emits TaskRewardClaimed event
     *
     * @param _proofId ID of the proof to claim
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

        if (proof.rewardSunlight > 0) {
            playerProxy.addSunlight(player, proof.rewardSunlight);
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
            proof.rewardSunlight,
            proof.rewardExp,
            proof.rewardItems
        );
    }

    // ============ VIEW FUNCTIONS (READ) ============

    /**
     * @dev Gets active proofs for the caller
     * @notice Returns all valid proofs (not expired and not claimed) for the current player
     * @return activeProofs Array of active TaskProof structs
     */
    function getMyActiveProofs() external view returns (TaskProof[] memory) {
        return taskProxy.getPlayerActiveProofs(msg.sender);
    }

    /**
     * @dev Gets proof nonce for the caller
     * @notice Returns the current nonce for a given player address
     * @param player Address of the player to query
     * @return nonce Current nonce value for the player
     */
    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
    }

    /**
     * @dev Gets claimed proofs for the caller
     * @notice Returns all successfully claimed proofs for the current player
     * @return claimedProofs Array of claimed TaskProof structs
     */
    function getMyClaimedProofs() external view returns (TaskProof[] memory) {
        return taskProxy.getPlayerClaimedProofs(msg.sender);
    }

    /**
     * @dev Gets detailed information for a specific proof
     * @notice Returns complete information about a proof by its ID
     * @param _proofId ID of the proof to query
     * @return proof TaskProof struct containing detailed proof information
     */
    function getTaskProof(
        bytes32 _proofId
    ) external view returns (TaskProof memory) {
        return taskProxy.getTaskProof(_proofId);
    }

    /**
     * @dev Gets overall task system statistics
     * @notice Returns comprehensive statistics about the entire task system
     * @return stats TaskStats struct containing:
     *         - Total number of proofs created
     *         - Number of claimed proofs
     *         - Total rewards distributed
     */
    function getTaskStatistics() external view returns (TaskStats memory) {
        return taskProxy.getTaskStats();
    }

    /**
     * @dev Gets player proof overview and statistics
     * @notice Returns comprehensive statistics about a specific player's proofs
     *
     * Calculates:
     * - Number of proofs by status (total, active, claimed)
     * - Total rewards earned (Sunny, Sunlight, and experience points)
     *
     * @param _player Address of the player to query
     * @return totalProofs Total number of proofs for the player
     * @return activeProofs Number of active proofs
     * @return claimedProofs Number of claimed proofs
     * @return totalSunnyEarned Total Sunny tokens earned from tasks
     * @return totalSunlightEarned Total Sunlight tokens earned from tasks
     * @return totalExpEarned Total experience points earned from tasks
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
            uint256 totalSunlightEarned,
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
            totalSunlightEarned += claimedProofsArray[i].rewardSunlight;
            totalExpEarned += claimedProofsArray[i].rewardExp;
        }

        return (
            totalProofs,
            activeProofs,
            claimedProofs,
            totalSunnyEarned,
            totalSunlightEarned,
            totalExpEarned
        );
    }
}
