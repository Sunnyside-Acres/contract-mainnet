// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Dungeon.sol";
import "./DungeonComponent.sol";
import "../inventory/InventoryComponent.sol";
import "../player/PlayerComponent.sol";
import "../../struct/Inventory.sol";
import "../../struct/Player.sol";

/**
 * @title DungeonLogic
 * @author RYG.Labs
 * @notice Logic contract cho hệ thống Dungeon
 * @dev Xử lý các logic phức tạp và tương tác với các hệ thống khác
 */
contract DungeonLogic {
    /// @notice Address của World contract
    address public world;
    /// @notice Address của DungeonComponent
    address public dungeonProxy;
    /// @notice Address của InventoryComponent
    address public inventoryComponent;
    /// @notice Address của PlayerComponent
    address public playerComponent;

    /// @notice Reentrancy guard
    bool private _locked;

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
        uint256 sunnyReward
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
        address indexed admin,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Chỉ cho phép admin truy cập
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
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
     * @param _world Address của World contract
     * @param _dungeonProxy Address của DungeonComponent proxy
     * @param _inventoryComponent Address của InventoryComponent
     * @param _playerComponent Address của PlayerComponent
     */
    constructor(
        address _world,
        address _dungeonProxy,
        address _inventoryComponent,
        address _playerComponent
    ) {
        world = _world;
        dungeonProxy = _dungeonProxy;
        inventoryComponent = _inventoryComponent;
        playerComponent = _playerComponent;
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @notice Tạo dungeon mới (chỉ admin)
     * @dev Validate input parameters và tạo dungeon trong component
     * @param _dungeonId ID duy nhất của dungeon
     * @param _name Tên dungeon
     * @param _description Mô tả dungeon
     * @param _dungeonType Loại dungeon
     * @param _difficulty Mức độ khó
     * @param _levelRequirement Cấp độ tối thiểu của người chơi
     * @param _energyCost Chi phí năng lượng để vào
     * @param _sunlightCost Chi phí ánh sáng để vào
     * @param _sunnyCost Chi phí sunny để vào
     * @param _itemRequirements Vật phẩm yêu cầu để vào
     * @param _cooldownTime Thời gian chờ giữa các lần thử (giây)
     * @return dungeonId ID của dungeon vừa tạo
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Tạo dungeon trong component
     * 3. Emit DungeonCreated event
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
        // Validate input
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

        // Validate item requirements
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

        // Tạo dungeon thông qua component
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
     * @notice Thêm màn mới vào dungeon (chỉ admin)
     * @dev Validate input và thêm màn vào dungeon
     * @param _dungeonId ID của dungeon
     * @param _stageNumber Số màn
     * @param _rewardMultiplier Hệ số nhân thưởng (basis points, ví dụ: 2000 = 0.2x)
     * @return success Có thành công không
     */
    function addDungeonStage(
        uint256 _dungeonId,
        uint256 _stageNumber,
        uint256 _rewardMultiplier
    ) external onlyAdmin returns (bool) {
        require(_stageNumber > 0, "Stage number must be greater than 0");
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
     * @notice Bật/tắt dungeon (chỉ admin)
     * @param _dungeonId ID của dungeon
     * @param _isActive Có hoạt động không
     */
    function setDungeonActive(
        uint256 _dungeonId,
        bool _isActive
    ) external onlyAdmin {
        DungeonComponent(dungeonProxy).setDungeonActive(_dungeonId, _isActive);
    }

    /**
     * @notice Tạm dừng/tiếp tục dungeon (chỉ admin)
     * @param _dungeonId ID của dungeon
     * @param _isPaused Có bị tạm dừng không
     */
    function setDungeonPaused(
        uint256 _dungeonId,
        bool _isPaused
    ) external onlyAdmin {
        DungeonComponent(dungeonProxy).setDungeonPaused(_dungeonId, _isPaused);
    }

    // ============ READ FUNCTIONS (EXTERNAL) ============

    /**
     * @notice Lấy thông tin dungeon
     * @param _dungeonId ID của dungeon
     * @return dungeon Dungeon struct
     */
    function getDungeon(
        uint256 _dungeonId
    ) external view returns (DungeonStructs.Dungeon memory) {
        return DungeonComponent(dungeonProxy).getDungeon(_dungeonId);
    }

    /**
     * @notice Lấy tất cả dungeon IDs
     * @return Array của tất cả dungeon IDs
     */
    function getAllDungeonIds() external view returns (uint256[] memory) {
        return DungeonComponent(dungeonProxy).getAllDungeonIds();
    }

    /**
     * @notice Kiểm tra dungeon có tồn tại không
     * @param _dungeonId ID của dungeon
     * @return exists Có tồn tại không
     */
    function dungeonExists(uint256 _dungeonId) external view returns (bool) {
        return DungeonComponent(dungeonProxy).exists(_dungeonId);
    }

    /**
     * @notice Kiểm tra người chơi có đủ item requirements để vào dungeon không
     * @param _player Address của người chơi
     * @param _dungeonId ID của dungeon
     * @return hasRequirements Có đủ requirements không
     */
    function checkItemRequirements(
        address _player,
        uint256 _dungeonId
    ) external view returns (bool) {
        // Lấy thông tin dungeon
        DungeonStructs.Dungeon memory dungeon = DungeonComponent(dungeonProxy)
            .getDungeon(_dungeonId);

        // Kiểm tra từng item requirement
        for (uint256 i = 0; i < dungeon.itemRequirements.length; i++) {
            DungeonStructs.ItemRequirement memory requirement = dungeon
                .itemRequirements[i];

            // Kiểm tra người chơi có item không
            if (
                !InventoryComponent(inventoryComponent).exists(
                    _player,
                    requirement.itemId
                )
            ) {
                return false;
            }

            // Lấy thông tin item hiện tại
            InventoryItem memory playerItem = InventoryComponent(
                inventoryComponent
            ).getItem(_player, requirement.itemId);

            // Kiểm tra số lượng
            if (playerItem.quantity < requirement.quantity) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Kiểm tra người chơi có đủ resources (energy, sunlight, sunny) để vào dungeon không
     * @param _player Address của người chơi
     * @param _dungeonId ID của dungeon
     * @return hasResources Có đủ resources không
     */
    function checkResourceRequirements(
        address _player,
        uint256 _dungeonId
    ) external view returns (bool) {
        // Lấy thông tin dungeon
        DungeonStructs.Dungeon memory dungeon = DungeonComponent(dungeonProxy)
            .getDungeon(_dungeonId);

        // Lấy thông tin player
        Player memory player = PlayerComponent(playerComponent).getPlayer(
            _player
        );

        // Kiểm tra energy (mana)
        if (dungeon.energyCost > 0 && player.mana < dungeon.energyCost) {
            return false;
        }

        // Kiểm tra sunlight
        if (
            dungeon.sunlightCost > 0 && player.sunlight < dungeon.sunlightCost
        ) {
            return false;
        }

        // Kiểm tra sunny
        if (dungeon.sunnyCost > 0 && player.sunny < dungeon.sunnyCost) {
            return false;
        }

        return true;
    }

    /**
     * @notice Kiểm tra người chơi có đủ tất cả requirements (items + resources) để vào dungeon không
     * @param _player Address của người chơi
     * @param _dungeonId ID của dungeon
     * @return hasAllRequirements Có đủ tất cả requirements không
     */
    function checkAllRequirements(
        address _player,
        uint256 _dungeonId
    ) external view returns (bool) {
        // Kiểm tra item requirements
        bool hasItems = this.checkItemRequirements(_player, _dungeonId);
        if (!hasItems) {
            return false;
        }

        // Kiểm tra resource requirements
        bool hasResources = this.checkResourceRequirements(_player, _dungeonId);
        if (!hasResources) {
            return false;
        }

        return true;
    }

    // ============ DUNGEON SESSION FUNCTIONS ============

    /**
     * @notice Bắt đầu phiên chơi dungeon (người chơi gọi)
     * @dev Người chơi gọi hàm này để bắt đầu chơi dungeon
     * @param _dungeonId ID của dungeon
     * @param _stageNumber Số màn muốn chơi
     * @return sessionId ID của phiên chơi mới
     */
    function startDungeon(
        uint256 _dungeonId,
        uint256 _stageNumber,
        uint256[] memory _equipmentItemIds,
        uint256[] memory _equipmentQuantities
    ) external payable returns (uint256) {
        require(_dungeonId > 0, "Dungeon ID must be greater than 0");
        require(_stageNumber > 0, "Stage number must be greater than 0");

        // Lấy thông tin dungeon
        DungeonStructs.Dungeon memory dungeon = DungeonComponent(dungeonProxy)
            .getDungeon(_dungeonId);

        require(
            msg.value >= dungeon.minBetAmount &&
                msg.value <= dungeon.maxBetAmount,
            "Bet amount out of range"
        );
        // Kiểm tra equipment items
        _validateEquipmentItems(_equipmentItemIds, _equipmentQuantities);

        // Kiểm tra và trừ item requirements
        _checkAndDeductRequirements(dungeon);

        // Kiểm tra và trừ energy, sunlight, sunny
        _checkAndDeductResources(dungeon);

        uint256 sessionId = DungeonComponent(dungeonProxy).startDungeonSession(
            msg.sender,
            _dungeonId,
            _stageNumber,
            msg.value,
            _equipmentItemIds,
            _equipmentQuantities
        );

        emit DungeonSessionStarted(
            sessionId,
            msg.sender,
            _dungeonId,
            _stageNumber,
            msg.value
        );
        return sessionId;
    }

    /**
     * @notice Kết thúc phiên chơi dungeon (admin gọi)
     * @dev Admin gọi hàm này sau khi client check xong
     * @param _sessionId ID của phiên chơi
     * @param _isCompleted Phiên có hoàn thành không
     * @param _rewardItemIds ID các vật phẩm thưởng
     * @param _rewardQuantities Số lượng các vật phẩm thưởng
     * @param _playerDamages Damage của người chơi trong các vòng
     * @param _monsterHPs Máu của quái trong các vòng
     * @param _sunlightReward Thưởng sunlight
     * @param _sunnyReward Thưởng sunny
     */
    function endDungeon(
        uint256 _sessionId,
        bool _isCompleted,
        uint256[] memory _rewardItemIds,
        uint256[] memory _rewardQuantities,
        uint256[] memory _playerDamages,
        uint256[] memory _monsterHPs,
        uint256 _sunlightReward,
        uint256 _sunnyReward
    ) external onlyAdmin {
        require(
            _rewardItemIds.length == _rewardQuantities.length,
            "Arrays length mismatch"
        );
        require(
            _playerDamages.length == _monsterHPs.length,
            "Damage and HP arrays length mismatch"
        );

        DungeonComponent(dungeonProxy).endDungeonSession(
            _sessionId,
            _isCompleted,
            _rewardItemIds,
            _rewardQuantities,
            _playerDamages,
            _monsterHPs,
            _sunlightReward,
            _sunnyReward
        );

        emit DungeonSessionEnded(
            _sessionId,
            msg.sender,
            0, // dungeonId sẽ được lấy từ session
            _isCompleted,
            _rewardItemIds,
            _rewardQuantities,
            _playerDamages,
            _monsterHPs,
            _sunlightReward,
            _sunnyReward
        );
    }

    /**
     * @notice Claim phần thưởng từ phiên chơi (người chơi gọi)
     * @dev Người chơi gọi hàm này để nhận phần thưởng
     * @param _sessionId ID của phiên chơi
     * @return success Có thành công không
     */
    function claimRewards(
        uint256 _sessionId
    ) external nonReentrant returns (bool) {
        require(_sessionId > 0, "Session ID must be greater than 0");

        DungeonStructs.DungeonSession memory session = DungeonComponent(
            dungeonProxy
        ).getDungeonSession(_sessionId);

        // Kiểm tra session tồn tại
        require(session.sessionId > 0, "Session does not exist");

        // Kiểm tra người chơi có phải chủ sở hữu session không
        require(session.player == msg.sender, "Not the session owner");

        // Kiểm tra session đã được claim chưa
        require(!session.isClaimed, "Rewards already claimed");

        // Kiểm tra session có hoàn thành không (chỉ claim được khi hoàn thành)
        require(
            session.isCompleted,
            "Session not completed - no rewards to claim"
        );

        // Cộng sunlight và sunny nếu có
        if (session.sunlightReward > 0) {
            PlayerComponent(playerComponent).addSunlight(
                msg.sender,
                session.sunlightReward
            );
        }
        if (session.sunnyReward > 0) {
            PlayerComponent(playerComponent).addSunny(
                msg.sender,
                session.sunnyReward
            );
        }

        // Xử lý bet rewards nếu có
        if (session.hasBet && session.isCompleted) {
            // Tính toán reward dựa trên rewardMultiplier
            uint256 betReward = (session.betAmount * session.rewardMultiplier) /
                10000;

            // Chuyển tiền thưởng cho người chơi (sử dụng call() thay vì transfer())
            if (betReward > 0) {
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

        bool claimSuccess = DungeonComponent(dungeonProxy).claimDungeonRewards(
            _sessionId,
            msg.sender
        );

        if (claimSuccess) {
            emit DungeonRewardsClaimed(
                _sessionId,
                msg.sender,
                session.rewardItemIds,
                session.rewardQuantities
            );
        }

        return claimSuccess;
    }

    /**
     * @notice Lấy thông tin phiên chơi
     * @param _sessionId ID của phiên chơi
     * @return session DungeonSession struct
     */
    function getDungeonSession(
        uint256 _sessionId
    ) external view returns (DungeonStructs.DungeonSession memory) {
        return DungeonComponent(dungeonProxy).getDungeonSession(_sessionId);
    }

    /**
     * @notice Lấy danh sách phiên chơi của người chơi
     * @param _player Address của người chơi
     * @return sessionIds Array của session IDs
     */
    function getPlayerSessions(
        address _player
    ) external view returns (uint256[] memory) {
        return DungeonComponent(dungeonProxy).getPlayerSessions(_player);
    }

    /**
     * @notice Lấy thông tin damage và HP của phiên chơi
     * @param _sessionId ID của phiên chơi
     * @return playerDamages Array damage của người chơi
     * @return monsterHPs Array máu của quái
     */
    function getSessionBattleData(
        uint256 _sessionId
    )
        external
        view
        returns (uint256[] memory playerDamages, uint256[] memory monsterHPs)
    {
        return DungeonComponent(dungeonProxy).getSessionBattleData(_sessionId);
    }

    /**
     * @notice Rút tiền khẩn cấp (chỉ admin)
     * @dev Hàm này cho phép admin rút toàn bộ ETH trong contract trong trường hợp khẩn cấp
     * @param _to Address nhận tiền
     * @return success Có thành công không
     */
    function emergencyWithdraw(
        address payable _to
    ) external onlyAdmin nonReentrant returns (bool) {
        require(_to != address(0), "Invalid recipient address");

        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");

        // Chuyển toàn bộ ETH trong contract (sử dụng call() thay vì transfer())
        (bool success, ) = _to.call{value: contractBalance}("");
        require(success, "Transfer failed");

        emit EmergencyWithdraw(msg.sender, contractBalance, block.timestamp);

        return true;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Kiểm tra và trừ item requirements
     * @param _dungeon Dungeon struct
     */
    function _checkAndDeductRequirements(
        DungeonStructs.Dungeon memory _dungeon
    ) internal {
        for (uint256 i = 0; i < _dungeon.itemRequirements.length; i++) {
            DungeonStructs.ItemRequirement memory requirement = _dungeon
                .itemRequirements[i];

            // Kiểm tra người chơi có item không
            require(
                InventoryComponent(inventoryComponent).exists(
                    msg.sender,
                    requirement.itemId
                ),
                "Player does not have required item"
            );

            // Lấy thông tin item hiện tại
            InventoryItem memory playerItem = InventoryComponent(
                inventoryComponent
            ).getItem(msg.sender, requirement.itemId);

            // Kiểm tra số lượng
            require(
                playerItem.quantity >= requirement.quantity,
                "Not enough required items"
            );

            // Trừ item nếu isConsumed = true
            if (requirement.isConsumed) {
                uint256 newQuantity = playerItem.quantity -
                    requirement.quantity;
                InventoryComponent(inventoryComponent).setItem(
                    msg.sender,
                    requirement.itemId,
                    newQuantity,
                    playerItem.durability,
                    playerItem.expiration
                );
            }
        }
    }

    /**
     * @notice Kiểm tra và trừ energy, sunlight, sunny
     * @param _dungeon Dungeon struct
     */
    function _checkAndDeductResources(
        DungeonStructs.Dungeon memory _dungeon
    ) internal {
        // Lấy thông tin player
        Player memory player = PlayerComponent(playerComponent).getPlayer(
            msg.sender
        );

        // Kiểm tra và trừ energy (nếu có)
        if (_dungeon.energyCost > 0) {
            require(player.mana >= _dungeon.energyCost, "Not enough energy");
            // Trừ energy thông qua PlayerComponent
            uint256 newMana = player.mana - _dungeon.energyCost;
            PlayerComponent(playerComponent).setMana(
                msg.sender,
                uint16(newMana)
            );
        }

        // Kiểm tra và trừ sunlight
        if (_dungeon.sunlightCost > 0) {
            require(
                player.sunlight >= _dungeon.sunlightCost,
                "Not enough sunlight"
            );
            PlayerComponent(playerComponent).subtractSunlight(
                msg.sender,
                _dungeon.sunlightCost
            );
        }

        // Kiểm tra và trừ sunny
        if (_dungeon.sunnyCost > 0) {
            require(player.sunny >= _dungeon.sunnyCost, "Not enough sunny");
            PlayerComponent(playerComponent).subtractSunny(
                msg.sender,
                _dungeon.sunnyCost
            );
        }
    }

    /**
     * @notice Kiểm tra equipment items
     * @param _equipmentItemIds Array ID các equipment items
     * @param _equipmentQuantities Array số lượng các equipment items
     */
    function _validateEquipmentItems(
        uint256[] memory _equipmentItemIds,
        uint256[] memory _equipmentQuantities
    ) internal view {
        require(
            _equipmentItemIds.length == _equipmentQuantities.length,
            "Equipment arrays length mismatch"
        );

        // Kiểm tra từng equipment item
        for (uint256 i = 0; i < _equipmentItemIds.length; i++) {
            require(_equipmentItemIds[i] > 0, "Invalid equipment item ID");
            require(_equipmentQuantities[i] > 0, "Invalid equipment quantity");

            // Kiểm tra player có equipment item không
            require(
                InventoryComponent(inventoryComponent).exists(
                    msg.sender,
                    _equipmentItemIds[i]
                ),
                "Player does not have equipment item"
            );

            // Lấy thông tin equipment item
            InventoryItem memory equipmentItem = InventoryComponent(
                inventoryComponent
            ).getItem(msg.sender, _equipmentItemIds[i]);

            // Kiểm tra số lượng
            require(
                equipmentItem.quantity >= _equipmentQuantities[i],
                "Not enough equipment items"
            );
        }
    }
}
