// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Dungeon.sol";

/**
 * @title DungeonComponent
 * @author RYG.Labs
 * @notice Component contract cho hệ thống Dungeon
 * @dev Chứa logic cơ bản để quản lý dungeons và player progress
 */
contract DungeonComponent {
    /// @notice Mapping từ dungeon ID đến Dungeon struct
    mapping(uint256 => DungeonStructs.Dungeon) public dungeons;
    /// @notice Array của tất cả dungeon IDs
    uint256[] public dungeonIds;
    /// @notice Mapping để kiểm tra dungeon có tồn tại không
    mapping(uint256 => bool) public dungeonExists;
    /// @notice Tổng số dungeon đã tạo
    uint256 public dungeonCount;

    /// @notice Mapping từ player address đến dungeon progress
    mapping(address => mapping(uint256 => DungeonStructs.PlayerDungeonProgress))
        public playerDungeonProgress;

    /// @notice Mapping từ session ID đến DungeonSession
    mapping(uint256 => DungeonStructs.DungeonSession) public dungeonSessions;
    /// @notice Mapping từ player address đến session IDs
    mapping(address => uint256[]) public playerSessions;
    /// @notice Tổng số session đã tạo
    uint256 public sessionCount;

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
        uint256 stageNumber
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

    /**
     * @notice Tạo dungeon mới
     * @param _dungeonId ID duy nhất của dungeon
     * @param _name Tên dungeon
     * @param _description Mô tả dungeon
     * @param _dungeonType Loại dungeon
     * @param _difficulty Mức độ khó
     * @param _levelRequirement Cấp độ tối thiểu
     * @param _energyCost Chi phí năng lượng
     * @param _sunlightCost Chi phí ánh sáng
     * @param _sunnyCost Chi phí sunny
     * @param _itemRequirements Vật phẩm yêu cầu
     * @param _cooldownTime Thời gian chờ giữa các lần thử
     * @return dungeonId ID của dungeon vừa tạo
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
        uint256 _cooldownTime
    ) external returns (uint256) {
        require(_dungeonId > 0, "Dungeon ID must be greater than 0");
        require(!dungeonExists[_dungeonId], "Dungeon already exists");
        require(bytes(_name).length > 0, "Dungeon name cannot be empty");
        require(
            _levelRequirement > 0,
            "Level requirement must be greater than 0"
        );
        require(_cooldownTime > 0, "Cooldown time must be greater than 0");

        DungeonStructs.Dungeon memory newDungeon = DungeonStructs.Dungeon({
            id: _dungeonId,
            name: _name,
            description: _description,
            dungeonType: _dungeonType,
            difficulty: _difficulty,
            levelRequirement: _levelRequirement,
            energyCost: _energyCost,
            sunlightCost: _sunlightCost,
            sunnyCost: _sunnyCost,
            itemRequirements: _itemRequirements,
            stages: new DungeonStructs.DungeonStage[](0), // Bắt đầu với mảng rỗng
            cooldownTime: _cooldownTime,
            isActive: true,
            isPaused: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        dungeons[_dungeonId] = newDungeon;
        dungeonIds.push(_dungeonId);
        dungeonExists[_dungeonId] = true;
        dungeonCount++;

        emit DungeonCreated(_dungeonId, _name, _dungeonType, _difficulty);
        return _dungeonId;
    }

    /**
     * @notice Thêm màn mới vào dungeon
     * @param _dungeonId ID của dungeon
     * @param _stageNumber Số màn
     * @param _rewardMultiplier Hệ số nhân thưởng (basis points)
     * @return success Có thành công không
     */
    function addDungeonStage(
        uint256 _dungeonId,
        uint256 _stageNumber,
        uint256 _rewardMultiplier
    ) external returns (bool) {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        require(_stageNumber > 0, "Stage number must be greater than 0");
        require(
            _rewardMultiplier > 0,
            "Reward multiplier must be greater than 0"
        );

        DungeonStructs.Dungeon storage dungeon = dungeons[_dungeonId];

        // Kiểm tra màn đã tồn tại chưa
        for (uint256 i = 0; i < dungeon.stages.length; i++) {
            require(
                dungeon.stages[i].stageNumber != _stageNumber,
                "Stage already exists"
            );
        }

        DungeonStructs.DungeonStage memory newStage = DungeonStructs
            .DungeonStage({
                stageNumber: _stageNumber,
                rewardMultiplier: _rewardMultiplier,
                isActive: true,
                createdAt: block.timestamp
            });

        dungeon.stages.push(newStage);
        dungeon.updatedAt = block.timestamp;

        emit DungeonStageAdded(_dungeonId, _stageNumber, _rewardMultiplier);
        return true;
    }

    /**
     * @notice Lấy thông tin dungeon
     * @param _dungeonId ID của dungeon
     * @return dungeon Dungeon struct
     */
    function getDungeon(
        uint256 _dungeonId
    ) external view returns (DungeonStructs.Dungeon memory) {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        return dungeons[_dungeonId];
    }

    /**
     * @notice Lấy tất cả dungeon IDs
     * @return Array của tất cả dungeon IDs
     */
    function getAllDungeonIds() external view returns (uint256[] memory) {
        return dungeonIds;
    }

    /**
     * @notice Kiểm tra dungeon có tồn tại không
     * @param _dungeonId ID của dungeon
     * @return exists Có tồn tại không
     */
    function exists(uint256 _dungeonId) external view returns (bool) {
        return dungeonExists[_dungeonId];
    }

    /**
     * @notice Bật/tắt dungeon
     * @param _dungeonId ID của dungeon
     * @param _isActive Có hoạt động không
     */
    function setDungeonActive(uint256 _dungeonId, bool _isActive) external {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        dungeons[_dungeonId].isActive = _isActive;
        dungeons[_dungeonId].updatedAt = block.timestamp;
    }

    /**
     * @notice Tạm dừng/tiếp tục dungeon
     * @param _dungeonId ID của dungeon
     * @param _isPaused Có bị tạm dừng không
     */
    function setDungeonPaused(uint256 _dungeonId, bool _isPaused) external {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        dungeons[_dungeonId].isPaused = _isPaused;
        dungeons[_dungeonId].updatedAt = block.timestamp;
    }

    // ============ DUNGEON SESSION FUNCTIONS ============

    /**
     * @notice Bắt đầu phiên chơi dungeon (người chơi gọi)
     * @param _player Address của người chơi
     * @param _dungeonId ID của dungeon
     * @param _stageNumber Số màn muốn chơi
     * @return sessionId ID của phiên chơi mới
     */
    function startDungeonSession(
        address _player,
        uint256 _dungeonId,
        uint256 _stageNumber,
        uint256 _betAmount
    ) external returns (uint256) {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        require(_stageNumber > 0, "Stage number must be greater than 0");

        DungeonStructs.Dungeon storage dungeon = dungeons[_dungeonId];
        require(dungeon.isActive, "Dungeon is not active");
        require(!dungeon.isPaused, "Dungeon is paused");

        // Kiểm tra màn có tồn tại không
        bool stageExists = false;
        uint256 rewardMultiplier = 0;
        for (uint256 i = 0; i < dungeon.stages.length; i++) {
            if (dungeon.stages[i].stageNumber == _stageNumber) {
                stageExists = true;
                rewardMultiplier = dungeon.stages[i].rewardMultiplier;
                break;
            }
        }
        require(stageExists, "Stage does not exist");

        // Tạo session mới
        sessionCount++;
        uint256 sessionId = sessionCount;

        DungeonStructs.DungeonSession memory newSession = DungeonStructs
            .DungeonSession({
                sessionId: sessionId,
                player: _player,
                dungeonId: _dungeonId,
                stageNumber: _stageNumber,
                startTime: block.timestamp,
                endTime: 0,
                isCompleted: false,
                isClaimed: false,
                rewardItemIds: new uint256[](0),
                rewardQuantities: new uint256[](0),
                rewardMultiplier: rewardMultiplier,
                playerDamages: new uint256[](0),
                monsterHPs: new uint256[](0),
                sunlightReward: 0,
                sunnyReward: 0,
                betAmount: _betAmount,
                hasBet: _betAmount > 0
            });

        dungeonSessions[sessionId] = newSession;
        playerSessions[_player].push(sessionId);

        emit DungeonSessionStarted(
            sessionId,
            _player,
            _dungeonId,
            _stageNumber
        );
        return sessionId;
    }

    /**
     * @notice Kết thúc phiên chơi dungeon (admin gọi)
     * @param _sessionId ID của phiên chơi
     * @param _isCompleted Phiên có hoàn thành không
     * @param _rewardItemIds ID các vật phẩm thưởng
     * @param _rewardQuantities Số lượng các vật phẩm thưởng
     * @param _playerDamages Damage của người chơi trong các vòng
     * @param _monsterHPs Máu của quái trong các vòng
     * @param _sunlightReward Thưởng sunlight
     * @param _sunnyReward Thưởng sunny
     */
    function endDungeonSession(
        uint256 _sessionId,
        bool _isCompleted,
        uint256[] memory _rewardItemIds,
        uint256[] memory _rewardQuantities,
        uint256[] memory _playerDamages,
        uint256[] memory _monsterHPs,
        uint256 _sunlightReward,
        uint256 _sunnyReward
    ) external {
        require(
            dungeonSessions[_sessionId].sessionId > 0,
            "Session does not exist"
        );
        require(
            !dungeonSessions[_sessionId].isCompleted,
            "Session already ended"
        );

        DungeonStructs.DungeonSession storage session = dungeonSessions[
            _sessionId
        ];
        session.endTime = block.timestamp;
        session.isCompleted = _isCompleted;
        session.rewardItemIds = _rewardItemIds;
        session.rewardQuantities = _rewardQuantities;
        session.playerDamages = _playerDamages;
        session.monsterHPs = _monsterHPs;
        session.sunlightReward = _sunlightReward;
        session.sunnyReward = _sunnyReward;

        // Cập nhật tiến độ người chơi
        DungeonStructs.PlayerDungeonProgress
            storage progress = playerDungeonProgress[session.player][
                session.dungeonId
            ];
        progress.totalAttempts++;
        if (_isCompleted) {
            progress.successfulAttempts++;
        }
        progress.lastAttemptTime = block.timestamp;

        emit DungeonSessionEnded(
            _sessionId,
            session.player,
            session.dungeonId,
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
     * @param _sessionId ID của phiên chơi
     * @return success Có thành công không
     */
    function claimDungeonRewards(uint256 _sessionId) external returns (bool) {
        require(
            dungeonSessions[_sessionId].sessionId > 0,
            "Session does not exist"
        );
        require(
            dungeonSessions[_sessionId].isCompleted,
            "Session not completed"
        );
        require(
            !dungeonSessions[_sessionId].isClaimed,
            "Rewards already claimed"
        );
        require(
            dungeonSessions[_sessionId].player == msg.sender,
            "Not your session"
        );

        DungeonStructs.DungeonSession storage session = dungeonSessions[
            _sessionId
        ];
        session.isClaimed = true;

        emit DungeonRewardsClaimed(
            _sessionId,
            msg.sender,
            session.rewardItemIds,
            session.rewardQuantities
        );

        return true;
    }

    /**
     * @notice Lấy thông tin phiên chơi
     * @param _sessionId ID của phiên chơi
     * @return session DungeonSession struct
     */
    function getDungeonSession(
        uint256 _sessionId
    ) external view returns (DungeonStructs.DungeonSession memory) {
        require(
            dungeonSessions[_sessionId].sessionId > 0,
            "Session does not exist"
        );
        return dungeonSessions[_sessionId];
    }

    /**
     * @notice Lấy danh sách phiên chơi của người chơi
     * @param _player Address của người chơi
     * @return sessionIds Array của session IDs
     */
    function getPlayerSessions(
        address _player
    ) external view returns (uint256[] memory) {
        return playerSessions[_player];
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
        require(
            dungeonSessions[_sessionId].sessionId > 0,
            "Session does not exist"
        );

        DungeonStructs.DungeonSession memory session = dungeonSessions[
            _sessionId
        ];
        return (session.playerDamages, session.monsterHPs);
    }
}
