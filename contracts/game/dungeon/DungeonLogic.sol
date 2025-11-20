// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Dungeon.sol";
import "./DungeonComponent.sol";
import "../inventory/InventoryComponent.sol";
import "../player/PlayerComponent.sol";
import "../../struct/Inventory.sol";
import "../../struct/Player.sol";
import "../../interfaces/IItemPass.sol";
import "../itempass/ItemPassComponent.sol";

/**
 * @title DungeonLogic
 * @author RYG.Labs
 * @notice Logic contract for Dungeon system
 * @dev Handles complex logic and interactions with other systems
 */
contract DungeonLogic {
    /// @notice World contract address
    address public world;
    /// @notice DungeonComponent address
    address public dungeonProxy;
    /// @notice InventoryComponent address
    address public inventoryComponent;
    /// @notice PlayerComponent address
    address public playerComponent;

    /// @notice Contract owner (has withdrawal rights)
    address public owner;

    /// @notice Reentrancy guard
    bool private _locked;

    /// @dev Maximum quantity allowed per item stack
    uint256 constant MAX_QUANTITY = 1000000;

    address public itemPassComponent;

    /// @notice Events
    event DungeonCreated(
        uint256 indexed dungeonId,
        string name,
        DungeonStructs.DungeonType dungeonType,
        DungeonStructs.Difficulty difficulty
    );

    event DungeonStageAdded(
        uint256 indexed dungeonId,
        uint256 stageNumber,
        uint256 rewardMultiplier
    );

    event DungeonSessionStarted(
        uint256 indexed sessionId,
        address indexed player,
        uint256 indexed dungeonId,
        uint256 stageNumber,
        uint256 betAmount
    );

    event DungeonSessionEnded(
        uint256 indexed sessionId,
        address indexed player,
        uint256 indexed dungeonId,
        bool isCompleted,
        uint256[] rewardItemIds,
        uint256[] rewardQuantities,
        uint256[] playerDamages,
        uint256[] monsterHPs,
        uint256 sunlightReward,
        uint256 sunnyReward,
        uint16 stageNumber
    );

    event DungeonRewardsClaimed(
        uint256 indexed sessionId,
        address indexed player,
        uint256[] rewardItemIds,
        uint256[] rewardQuantities
    );

    event BetRewardClaimed(
        uint256 indexed sessionId,
        address indexed player,
        uint256 betAmount,
        uint256 rewardAmount,
        uint256 multiplier
    );

    event EmergencyWithdraw(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    event DungeonDeleted(uint256 indexed dungeonId);

    event ETHReceived(address indexed sender, uint256 amount);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /// @notice Only allows admin access
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Only allows owner access
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized as owner");
        _;
    }

    /// @notice Reentrancy guard modifier
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    /**
     * @notice Constructor
     * @param _world World contract address
     * @param _dungeonProxy DungeonComponent proxy address
     * @param _inventoryComponent InventoryComponent address
     * @param _playerComponent PlayerComponent address
     */
    constructor(
        address _world,
        address _dungeonProxy,
        address _inventoryComponent,
        address _playerComponent,
        address _itemPassComponent
    ) {
        world = _world;
        dungeonProxy = _dungeonProxy;
        inventoryComponent = _inventoryComponent;
        playerComponent = _playerComponent;
        itemPassComponent = _itemPassComponent;
        owner = msg.sender;
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @notice Create new dungeon (admin only)
     * @dev Validates input parameters and creates dungeon in component
     * @param _dungeonId Unique dungeon ID
     * @param _name Dungeon name
     * @param _description Dungeon description
     * @param _dungeonType Dungeon type
     * @param _difficulty Difficulty level
     * @param _levelRequirement Minimum player level
     * @param _energyCost Energy cost to enter
     * @param _sunlightCost Sunlight cost to enter
     * @param _sunnyCost Sunny cost to enter
     * @param _itemRequirements Item requirements to enter
     * @param _cooldownTime Cooldown time between attempts (seconds)
     * @return dungeonId ID of the created dungeon
     */
    function createDungeon(
        uint256 _dungeonId,
        string memory _name,
        string memory _description,
        DungeonStructs.DungeonType _dungeonType,
        DungeonStructs.Difficulty _difficulty,
        uint256 _levelRequirement,
        uint256 _energyCost,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        DungeonStructs.ItemRequirement[] memory _itemRequirements,
        uint256 _cooldownTime,
        uint256 _minBetAmount,
        uint256 _maxBetAmount
    ) external onlyAdmin returns (uint256) {
        require(_dungeonId > 0, "Dungeon ID must be greater than 0");
        require(bytes(_name).length > 0, "Dungeon name cannot be empty");
        require(bytes(_name).length <= 64, "Dungeon name too long");
        require(
            bytes(_description).length <= 256,
            "Dungeon description too long"
        );
        require(
            _levelRequirement > 0,
            "Level requirement must be greater than 0"
        );
        require(_cooldownTime > 0, "Cooldown time must be greater than 0");

        for (uint256 i = 0; i < _itemRequirements.length; i++) {
            require(
                _itemRequirements[i].itemId > 0,
                "Item ID must be greater than 0"
            );
            require(
                _itemRequirements[i].quantity > 0,
                "Item quantity must be greater than 0"
            );
        }

        uint256 dungeonId = DungeonComponent(dungeonProxy).createDungeon(
            _dungeonId,
            _name,
            _description,
            _dungeonType,
            _difficulty,
            _levelRequirement,
            _energyCost,
            _sunlightCost,
            _sunnyCost,
            _itemRequirements,
            _cooldownTime,
            _minBetAmount,
            _maxBetAmount
        );

        emit DungeonCreated(dungeonId, _name, _dungeonType, _difficulty);
        return dungeonId;
    }

    /**
     * @notice Add new stage to dungeon (admin only)
     * @dev Validates input and adds stage to dungeon
     * @param _dungeonId Dungeon ID
     * @param _stageNumber Stage number
     * @param _rewardMultiplier Reward multiplier (basis points, e.g., 2000 = 0.2x)
     * @return success Whether the operation succeeded
     */
    function addDungeonStage(
        uint256 _dungeonId,
        uint256 _stageNumber,
        uint256 _rewardMultiplier
    ) external onlyAdmin returns (bool) {
        require(
            _rewardMultiplier > 0,
            "Reward multiplier must be greater than 0"
        );
        require(
            _rewardMultiplier <= 100000,
            "Reward multiplier too high (max 10x)"
        );

        bool success = DungeonComponent(dungeonProxy).addDungeonStage(
            _dungeonId,
            _stageNumber,
            _rewardMultiplier
        );

        if (success) {
            emit DungeonStageAdded(_dungeonId, _stageNumber, _rewardMultiplier);
        }

        return success;
    }

    /**
     * @notice Enable/disable dungeon (admin only)
     * @param _dungeonId Dungeon ID
     * @param _isActive Whether dungeon is active
     */
    function setDungeonActive(
        uint256 _dungeonId,
        bool _isActive
    ) external onlyAdmin {
        DungeonComponent(dungeonProxy).setDungeonActive(_dungeonId, _isActive);
    }

    /**
     * @notice Pause/resume dungeon (admin only)
     * @param _dungeonId Dungeon ID
     * @param _isPaused Whether dungeon is paused
     */
    function setDungeonPaused(
        uint256 _dungeonId,
        bool _isPaused
    ) external onlyAdmin {
        DungeonComponent(dungeonProxy).setDungeonPaused(_dungeonId, _isPaused);
    }

    /**
     * @notice Delete dungeon (admin only)
     * @param _dungeonId Dungeon ID to delete
     * @return success Whether the operation succeeded
     */
    function deleteDungeon(
        uint256 _dungeonId
    ) external onlyAdmin returns (bool) {
        bool success = DungeonComponent(dungeonProxy).deleteDungeon(_dungeonId);
        if (success) {
            emit DungeonDeleted(_dungeonId);
        }
        return success;
    }

    // ============ READ FUNCTIONS (EXTERNAL) ============

    /**
     * @notice Get dungeon information
     * @param _dungeonId Dungeon ID
     * @return dungeon Dungeon struct
     */
    function getDungeon(
        uint256 _dungeonId
    ) external view returns (DungeonStructs.Dungeon memory) {
        return DungeonComponent(dungeonProxy).getDungeon(_dungeonId);
    }

    /**
     * @notice Get all dungeon IDs
     * @return Array of all dungeon IDs
     */
    function getAllDungeonIds() external view returns (uint256[] memory) {
        return DungeonComponent(dungeonProxy).getAllDungeonIds();
    }

    /**
     * @notice Check if dungeon exists
     * @param _dungeonId Dungeon ID
     * @return exists Whether dungeon exists
     */
    function dungeonExists(uint256 _dungeonId) external view returns (bool) {
        return DungeonComponent(dungeonProxy).exists(_dungeonId);
    }

    /**
     * @notice Check if player has sufficient item requirements to enter dungeon
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     * @return hasRequirements Whether player has sufficient requirements
     */
    function checkItemRequirements(
        address _player,
        uint256 _dungeonId
    ) external view returns (bool) {
        DungeonStructs.Dungeon memory dungeon = DungeonComponent(dungeonProxy)
            .getDungeon(_dungeonId);

        for (uint256 i = 0; i < dungeon.itemRequirements.length; i++) {
            DungeonStructs.ItemRequirement memory requirement = dungeon
                .itemRequirements[i];

            if (
                !InventoryComponent(inventoryComponent).exists(
                    _player,
                    uint256(requirement.itemId)
                )
            ) {
                return false;
            }

            InventoryItem memory playerItem = InventoryComponent(
                inventoryComponent
            ).getItem(_player, uint256(requirement.itemId));

            if (playerItem.quantity < uint256(requirement.quantity)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Check if player has sufficient resources (energy, sunlight, sunny) to enter dungeon
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     * @return hasResources Whether player has sufficient resources
     */
    function checkResourceRequirements(
        address _player,
        uint256 _dungeonId
    ) external view returns (bool) {
        DungeonStructs.Dungeon memory dungeon = DungeonComponent(dungeonProxy)
            .getDungeon(_dungeonId);

        Player memory player = PlayerComponent(playerComponent).getPlayer(
            _player
        );

        if (
            dungeon.energyCost > 0 && player.mana < uint256(dungeon.energyCost)
        ) {
            return false;
        }

        if (
            dungeon.sunlightCost > 0 &&
            player.sunlight < uint256(dungeon.sunlightCost)
        ) {
            return false;
        }

        if (
            dungeon.sunnyCost > 0 && player.sunny < uint256(dungeon.sunnyCost)
        ) {
            return false;
        }

        return true;
    }

    /**
     * @notice Check if player has all requirements (items + resources) to enter dungeon
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     * @return hasAllRequirements Whether player has all requirements
     */
    function checkAllRequirements(
        address _player,
        uint256 _dungeonId
    ) external view returns (bool) {
        bool hasItems = this.checkItemRequirements(_player, _dungeonId);
        if (!hasItems) {
            return false;
        }

        bool hasResources = this.checkResourceRequirements(_player, _dungeonId);
        if (!hasResources) {
            return false;
        }

        return true;
    }

    // ============ DUNGEON SESSION FUNCTIONS ============

    function startDungeon(
        uint256 _dungeonId,
        uint256[] memory _equipmentItemIds,
        uint256[] memory _equipmentQuantities
    ) external payable returns (uint256) {
        require(_dungeonId > 0, "Dungeon ID must be greater than 0");

        DungeonStructs.Dungeon memory dungeon = DungeonComponent(dungeonProxy)
            .getDungeon(_dungeonId);

        if (msg.value > 0) {
            require(
                msg.value >= dungeon.minBetAmount &&
                    msg.value <= dungeon.maxBetAmount,
                "Bet amount out of range"
            );
        }

        bool hasPass = ItemPassComponent(itemPassComponent).checkActiveItemPass(msg.sender);

        _validateEquipmentItems(_equipmentItemIds, _equipmentQuantities);
        if (!hasPass) {
            _checkAndDeductRequirements(dungeon);
            _checkAndDeductResources(dungeon);
        }
        _deductEquipmentItems(_equipmentItemIds, _equipmentQuantities);

        uint256 sessionId = DungeonComponent(dungeonProxy).startDungeonSession(
            msg.sender,
            _dungeonId,
            msg.value,
            _equipmentItemIds,
            _equipmentQuantities
        );

        emit DungeonSessionStarted(
            sessionId,
            msg.sender,
            _dungeonId,
            0,
            msg.value
        );
        return sessionId;
    }

    /**
     * @notice End dungeon session (called by admin)
     * @dev Admin calls this function after client validation
     * @param _sessionId Session ID
     * @param _isCompleted Whether session is completed
     * @param _rewardItemIds Reward item IDs
     * @param _rewardQuantities Reward item quantities
     * @param _playerDamages Player damages in rounds
     * @param _monsterHPs Monster HPs in rounds
     * @param _sunlightReward Sunlight reward
     * @param _sunnyReward Sunny reward
     */
    function endDungeon(
        uint256 _sessionId,
        bool _isCompleted,
        uint256[] memory _rewardItemIds,
        uint256[] memory _rewardQuantities,
        uint256[] memory _playerDamages,
        uint256[] memory _monsterHPs,
        uint256 _sunlightReward,
        uint256 _sunnyReward,
        uint16 _stageNumber
    ) external onlyAdmin {
        require(_sessionId > 0, "Session ID must be greater than 0");
        require(
            _rewardItemIds.length == _rewardQuantities.length,
            "Arrays length mismatch"
        );
        require(
            _playerDamages.length == _monsterHPs.length,
            "Damage and HP arrays length mismatch"
        );

        // Kiểm tra session đã end chưa
        DungeonStructs.DungeonSession memory session = DungeonComponent(
            dungeonProxy
        ).getDungeonSession(_sessionId);
        require(session.sessionId > 0, "Session does not exist");
        require(!session.isCompleted, "Session already ended");
        require(!session.isClaimed, "Session already claimed");

        DungeonComponent(dungeonProxy).endDungeonSession(
            _sessionId,
            _isCompleted,
            _rewardItemIds,
            _rewardQuantities,
            _playerDamages,
            _monsterHPs,
            _sunlightReward,
            _sunnyReward,
            _stageNumber
        );

        emit DungeonSessionEnded(
            _sessionId,
            session.player,
            uint256(session.dungeonId),
            _isCompleted,
            _rewardItemIds,
            _rewardQuantities,
            _playerDamages,
            _monsterHPs,
            _sunlightReward,
            _sunnyReward,
            _stageNumber
        );
    }

    /**
     * @notice Claim rewards from session (called by player)
     * @dev Player calls this function to receive rewards
     * @param _sessionId Session ID
     * @return success Whether the operation succeeded
     */
    function claimRewards(
        uint256 _sessionId
    ) external nonReentrant returns (bool) {
        require(_sessionId > 0, "Session ID must be greater than 0");

        DungeonStructs.DungeonSession memory session = DungeonComponent(
            dungeonProxy
        ).getDungeonSession(_sessionId);

        require(session.sessionId > 0, "Session does not exist");
        require(session.player == msg.sender, "Not the session owner");
        require(!session.isClaimed, "Rewards already claimed");

        require(
            session.isCompleted,
            "Session not completed - no rewards to claim"
        );

        if (session.sunlightReward > 0) {
            PlayerComponent(playerComponent).addSunlight(
                msg.sender,
                uint256(session.sunlightReward)
            );
        }
        if (session.sunnyReward > 0) {
            PlayerComponent(playerComponent).addSunny(
                msg.sender,
                uint256(session.sunnyReward)
            );
        }

        if (session.rewardItemIds.length > 0) {
            InventoryComponent inventory = InventoryComponent(
                inventoryComponent
            );

            for (uint256 i = 0; i < session.rewardItemIds.length; i++) {
                uint256 itemId = uint256(session.rewardItemIds[i]);
                uint256 addQty = uint256(session.rewardQuantities[i]);

                require(addQty > 0, "Invalid reward quantity");
                require(addQty <= MAX_QUANTITY, "Exceeds max quantity");

                bool existsItem = inventory.exists(msg.sender, itemId);

                uint256 newQty;
                uint256 durability;
                uint256 expiration;

                if (existsItem) {
                    InventoryItem memory currentItem = inventory.getItem(
                        msg.sender,
                        itemId
                    );
                    newQty = currentItem.quantity + addQty;

                    require(
                        newQty >= currentItem.quantity,
                        "Quantity overflow"
                    );
                    require(newQty <= MAX_QUANTITY, "Exceeds maximum quantity");

                    durability = currentItem.durability;
                    expiration = currentItem.expiration;
                } else {
                    newQty = addQty;
                    durability = 100;
                    expiration = 0;
                }

                inventory.setItem(
                    msg.sender,
                    itemId,
                    newQty,
                    durability,
                    expiration
                );
            }
        }

        bool claimSuccess = DungeonComponent(dungeonProxy).claimDungeonRewards(
            _sessionId,
            msg.sender
        );
        require(claimSuccess, "Failed to claim dungeon rewards");

        // Xử lý bet rewards nếu có
        if (session.hasBet && session.isCompleted) {
            // Tính toán reward dựa trên rewardMultiplier
            uint256 betReward = (session.betAmount * session.rewardMultiplier) /
                10000;

            if (betReward > 0) {
                require(
                    address(this).balance >= betReward,
                    "Insufficient contract balance"
                );

                (bool transferSuccess, ) = payable(msg.sender).call{
                    value: betReward
                }("");
                require(transferSuccess, "Bet reward transfer failed");

                emit BetRewardClaimed(
                    _sessionId,
                    msg.sender,
                    session.betAmount,
                    betReward,
                    session.rewardMultiplier
                );
            }
        }

        uint256[] memory eventRewardItemIds = new uint256[](
            session.rewardItemIds.length
        );
        uint256[] memory eventRewardQuantities = new uint256[](
            session.rewardQuantities.length
        );

        for (uint256 i = 0; i < session.rewardItemIds.length; i++) {
            eventRewardItemIds[i] = uint256(session.rewardItemIds[i]);
            eventRewardQuantities[i] = uint256(session.rewardQuantities[i]);
        }

        emit DungeonRewardsClaimed(
            _sessionId,
            msg.sender,
            eventRewardItemIds,
            eventRewardQuantities
        );

        return true;
    }

    /**
     * @notice Get session information
     * @param _sessionId Session ID
     * @return session DungeonSession struct
     */
    function getDungeonSession(
        uint256 _sessionId
    ) external view returns (DungeonStructs.DungeonSession memory) {
        return DungeonComponent(dungeonProxy).getDungeonSession(_sessionId);
    }

    /**
     * @notice Get player's session list
     * @param _player Player address
     * @return sessionIds Array of session IDs
     */
    function getPlayerSessions(
        address _player
    ) external view returns (uint256[] memory) {
        return DungeonComponent(dungeonProxy).getPlayerSessions(_player);
    }

    /**
     * @notice Get session damage and HP information
     * @param _sessionId Session ID
     * @return playerDamages Array of player damages
     * @return monsterHPs Array of monster HPs
     */
    function getSessionBattleData(
        uint256 _sessionId
    )
        external
        view
        returns (uint32[] memory playerDamages, uint32[] memory monsterHPs)
    {
        return DungeonComponent(dungeonProxy).getSessionBattleData(_sessionId);
    }

    /**
     * @notice Emergency withdraw (owner only)
     * @dev Allows owner to withdraw all ETH from contract in emergency
     * @param _to Recipient address
     * @return success Whether the operation succeeded
     */
    function emergencyWithdraw(
        address payable _to
    ) external onlyOwner nonReentrant returns (bool) {
        require(_to != address(0), "Invalid recipient address");

        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");

        (bool success, ) = _to.call{value: contractBalance}("");
        require(success, "Transfer failed");

        emit EmergencyWithdraw(msg.sender, contractBalance, block.timestamp);

        return true;
    }

    /**
     * @notice Transfer contract ownership
     * @dev Only current owner can transfer ownership
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        require(_newOwner != owner, "New owner must be different");

        address previousOwner = owner;
        owner = _newOwner;

        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    /**
     * @notice Receive function to receive ETH
     * @dev Allows contract to receive ETH directly for bet rewards
     */
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Check and deduct item requirements
     * @param _dungeon Dungeon struct
     */
    function _checkAndDeductRequirements(
        DungeonStructs.Dungeon memory _dungeon
    ) internal {
        for (uint256 i = 0; i < _dungeon.itemRequirements.length; i++) {
            DungeonStructs.ItemRequirement memory requirement = _dungeon
                .itemRequirements[i];

            require(
                InventoryComponent(inventoryComponent).exists(
                    msg.sender,
                    uint256(requirement.itemId)
                ),
                "Player does not have required item"
            );

            InventoryItem memory playerItem = InventoryComponent(
                inventoryComponent
            ).getItem(msg.sender, uint256(requirement.itemId));

            require(
                playerItem.quantity >= uint256(requirement.quantity),
                "Not enough required items"
            );

            if (requirement.isConsumed) {
                uint256 newQuantity = playerItem.quantity -
                    uint256(requirement.quantity);
                InventoryComponent(inventoryComponent).setItem(
                    msg.sender,
                    uint256(requirement.itemId),
                    newQuantity,
                    playerItem.durability,
                    playerItem.expiration
                );
            }
        }
    }

    /**
     * @notice Check and deduct energy, sunlight, sunny
     * @param _dungeon Dungeon struct
     */
    function _checkAndDeductResources(
        DungeonStructs.Dungeon memory _dungeon
    ) internal {
        Player memory player = PlayerComponent(playerComponent).getPlayer(
            msg.sender
        );

        if (_dungeon.energyCost > 0) {
            require(
                player.mana >= uint256(_dungeon.energyCost),
                "Not enough energy"
            );
            uint256 newMana = player.mana - uint256(_dungeon.energyCost);
            PlayerComponent(playerComponent).setMana(
                msg.sender,
                uint16(newMana)
            );
        }

        if (_dungeon.sunlightCost > 0) {
            require(
                player.sunlight >= uint256(_dungeon.sunlightCost),
                "Not enough sunlight"
            );
            PlayerComponent(playerComponent).subtractSunlight(
                msg.sender,
                uint256(_dungeon.sunlightCost)
            );
        }

        if (_dungeon.sunnyCost > 0) {
            require(
                player.sunny >= uint256(_dungeon.sunnyCost),
                "Not enough sunny"
            );
            PlayerComponent(playerComponent).subtractSunny(
                msg.sender,
                uint256(_dungeon.sunnyCost)
            );
        }
    }

    /**
     * @notice Validate equipment items
     * @param _equipmentItemIds Array of equipment item IDs
     * @param _equipmentQuantities Array of equipment item quantities
     */
    function _validateEquipmentItems(
        uint256[] memory _equipmentItemIds,
        uint256[] memory _equipmentQuantities
    ) internal view {
        require(
            _equipmentItemIds.length == _equipmentQuantities.length,
            "Equipment arrays length mismatch"
        );

        for (uint256 i = 0; i < _equipmentItemIds.length; i++) {
            require(_equipmentItemIds[i] > 0, "Invalid equipment item ID");
            require(_equipmentQuantities[i] > 0, "Invalid equipment quantity");

            require(
                InventoryComponent(inventoryComponent).exists(
                    msg.sender,
                    _equipmentItemIds[i]
                ),
                "Player does not have equipment item"
            );

            InventoryItem memory equipmentItem = InventoryComponent(
                inventoryComponent
            ).getItem(msg.sender, _equipmentItemIds[i]);

            require(
                equipmentItem.quantity >= _equipmentQuantities[i],
                "Not enough equipment items"
            );
        }
    }

    /**
     * @notice Deduct equipment items from player's inventory
     * @dev Assumes validation (existence, quantity) has already been done
     * @param _equipmentItemIds Array of equipment item IDs
     * @param _equipmentQuantities Array of equipment item quantities
     */
    function _deductEquipmentItems(
        uint256[] memory _equipmentItemIds,
        uint256[] memory _equipmentQuantities
    ) internal {
        InventoryComponent inventory = InventoryComponent(inventoryComponent);

        for (uint256 i = 0; i < _equipmentItemIds.length; i++) {
            uint256 itemId = _equipmentItemIds[i];
            uint256 deductQty = _equipmentQuantities[i];

            // If the minus amount is 0, skip it to save gas
            if (deductQty == 0) {
                continue;
            }

            // Get current item
            InventoryItem memory currentItem = inventory.getItem(
                msg.sender,
                itemId
            );

            // Calculate new quantity
            uint256 newQuantity = currentItem.quantity - deductQty;

            // Update items in inventory
            inventory.setItem(
                msg.sender,
                itemId,
                newQuantity,
                currentItem.durability,
                currentItem.expiration
            );
        }
    }
}
