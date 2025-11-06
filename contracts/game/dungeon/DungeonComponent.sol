// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Dungeon.sol";
import "../../interfaces/IWorld.sol";

/**
 * @title DungeonComponent
 * @author RYG.Labs
 * @notice Component contract for Dungeon system
 * @dev Contains basic logic for managing dungeons and player progress
 */
contract DungeonComponent {
    /// @notice World contract address for access control
    address public world;

    /// @notice Admin address
    address public admin;
    /// @notice Implementation logic contract address
    address public implementation;

    /// @notice Mapping from dungeon ID to Dungeon struct
    mapping(uint256 => DungeonStructs.Dungeon) public dungeons;
    /// @notice Array of all dungeon IDs
    uint256[] public dungeonIds;
    /// @notice Mapping to check if dungeon exists
    mapping(uint256 => bool) public dungeonExists;
    /// @notice Total number of dungeons created
    uint256 public dungeonCount;

    /// @notice Mapping from player address to dungeon progress
    mapping(address => mapping(uint256 => DungeonStructs.PlayerDungeonProgress))
        public playerDungeonProgress;

    /// @notice Mapping from session ID to DungeonSession
    mapping(uint256 => DungeonStructs.DungeonSession) public dungeonSessions;
    /// @notice Mapping from player address to session IDs
    mapping(address => uint256[]) public playerSessions;
    /// @notice Total number of sessions created
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

    event DungeonDeleted(uint256 indexed dungeonId);

    /// @notice Only allows authorized logic contracts to access
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @notice Create new dungeon
     * @param _dungeonId Unique dungeon ID
     * @param _name Dungeon name
     * @param _description Dungeon description
     * @param _dungeonType Dungeon type
     * @param _difficulty Difficulty level
     * @param _levelRequirement Minimum level
     * @param _energyCost Energy cost
     * @param _sunlightCost Sunlight cost
     * @param _sunnyCost Sunny cost
     * @param _itemRequirements Item requirements
     * @param _cooldownTime Cooldown time between attempts
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
    ) external onlyAuthorized returns (uint256) {
        require(_dungeonId > 0, "Dungeon ID must be greater than 0");
        require(!dungeonExists[_dungeonId], "Dungeon already exists");
        require(bytes(_name).length > 0, "Dungeon name cannot be empty");
        require(
            _levelRequirement > 0,
            "Level requirement must be greater than 0"
        );
        require(_cooldownTime > 0, "Cooldown time must be greater than 0");
        require(_minBetAmount >= 0, "Min bet amount must be >= 0");
        require(_maxBetAmount > 0, "Max bet amount must be > 0");
        require(
            _minBetAmount <= _maxBetAmount,
            "Min bet amount must be <= max bet amount"
        );

        DungeonStructs.ItemRequirement[]
            memory convertedItemRequirements = new DungeonStructs.ItemRequirement[](
                _itemRequirements.length
            );
        for (uint256 i = 0; i < _itemRequirements.length; i++) {
            convertedItemRequirements[i] = DungeonStructs.ItemRequirement({
                itemId: uint64(_itemRequirements[i].itemId),
                quantity: uint32(_itemRequirements[i].quantity),
                isConsumed: _itemRequirements[i].isConsumed
            });
        }

        DungeonStructs.Dungeon memory newDungeon = DungeonStructs.Dungeon({
            id: uint64(_dungeonId),
            name: _name,
            description: _description,
            dungeonType: _dungeonType,
            difficulty: _difficulty,
            levelRequirement: uint16(_levelRequirement),
            energyCost: uint32(_energyCost),
            sunlightCost: uint128(_sunlightCost),
            sunnyCost: uint128(_sunnyCost),
            itemRequirements: convertedItemRequirements,
            stages: new DungeonStructs.DungeonStage[](0),
            cooldownTime: uint32(_cooldownTime),
            minBetAmount: _minBetAmount,
            maxBetAmount: _maxBetAmount,
            isActive: true,
            isPaused: false,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        dungeons[_dungeonId] = newDungeon;
        dungeonIds.push(_dungeonId);
        dungeonExists[_dungeonId] = true;
        dungeonCount++;

        emit DungeonCreated(_dungeonId, _name, _dungeonType, _difficulty);
        return _dungeonId;
    }

    /**
     * @notice Add new stage to dungeon
     * @param _dungeonId Dungeon ID
     * @param _stageNumber Stage number
     * @param _rewardMultiplier Reward multiplier (basis points)
     * @return success Whether the operation succeeded
     */
    function addDungeonStage(
        uint256 _dungeonId,
        uint256 _stageNumber,
        uint256 _rewardMultiplier
    ) external onlyAuthorized returns (bool) {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        require(
            _rewardMultiplier > 0,
            "Reward multiplier must be greater than 0"
        );

        DungeonStructs.Dungeon storage dungeon = dungeons[_dungeonId];

        for (uint256 i = 0; i < dungeon.stages.length; i++) {
            require(
                dungeon.stages[i].stageNumber != _stageNumber,
                "Stage already exists"
            );
        }

        DungeonStructs.DungeonStage memory newStage = DungeonStructs
            .DungeonStage({
                stageNumber: uint16(_stageNumber),
                rewardMultiplier: uint32(_rewardMultiplier),
                isActive: true,
                createdAt: uint64(block.timestamp)
            });

        dungeon.stages.push(newStage);
        dungeon.updatedAt = uint64(block.timestamp);

        emit DungeonStageAdded(_dungeonId, _stageNumber, _rewardMultiplier);
        return true;
    }

    /**
     * @notice Get dungeon information
     * @param _dungeonId Dungeon ID
     * @return dungeon Dungeon struct
     */
    function getDungeon(
        uint256 _dungeonId
    ) external view returns (DungeonStructs.Dungeon memory) {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        return dungeons[_dungeonId];
    }

    /**
     * @notice Get all dungeon IDs
     * @return Array of all dungeon IDs
     */
    function getAllDungeonIds() external view returns (uint256[] memory) {
        return dungeonIds;
    }

    /**
     * @notice Check if dungeon exists
     * @param _dungeonId Dungeon ID
     * @return exists Whether dungeon exists
     */
    function exists(uint256 _dungeonId) external view returns (bool) {
        return dungeonExists[_dungeonId];
    }

    /**
     * @notice Enable/disable dungeon
     * @param _dungeonId Dungeon ID
     * @param _isActive Whether dungeon is active
     */
    function setDungeonActive(
        uint256 _dungeonId,
        bool _isActive
    ) external onlyAuthorized {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        dungeons[_dungeonId].isActive = _isActive;
        dungeons[_dungeonId].updatedAt = uint64(block.timestamp);
    }

    /**
     * @notice Pause/resume dungeon
     * @param _dungeonId Dungeon ID
     * @param _isPaused Whether dungeon is paused
     */
    function setDungeonPaused(
        uint256 _dungeonId,
        bool _isPaused
    ) external onlyAuthorized {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");
        dungeons[_dungeonId].isPaused = _isPaused;
        dungeons[_dungeonId].updatedAt = uint64(block.timestamp);
    }

    /**
     * @notice Delete dungeon
     * @param _dungeonId Dungeon ID to delete
     * @return success Whether the operation succeeded
     */
    function deleteDungeon(
        uint256 _dungeonId
    ) external onlyAuthorized returns (bool) {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");

        uint256[] storage ids = dungeonIds;
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == _dungeonId) {
                if (i < ids.length - 1) {
                    ids[i] = ids[ids.length - 1];
                }
                ids.pop();
                break;
            }
        }

        delete dungeons[_dungeonId];
        dungeonExists[_dungeonId] = false;
        dungeonCount--;

        emit DungeonDeleted(_dungeonId);
        return true;
    }

    // ============ DUNGEON SESSION FUNCTIONS ============

    /**
     * @notice Start dungeon session (called by player)
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     * @return sessionId ID of the new session
     */
    function startDungeonSession(
        address _player,
        uint256 _dungeonId,
        uint256 _betAmount,
        uint256[] memory _equipmentItemIds,
        uint256[] memory _equipmentQuantities
    ) external onlyAuthorized returns (uint256) {
        require(dungeonExists[_dungeonId], "Dungeon does not exist");

        DungeonStructs.Dungeon storage dungeon = dungeons[_dungeonId];
        require(dungeon.isActive, "Dungeon is not active");
        require(!dungeon.isPaused, "Dungeon is paused");

        sessionCount++;
        uint256 sessionId = sessionCount;

        uint64[] memory convertedEquipmentItemIds = new uint64[](
            _equipmentItemIds.length
        );
        uint32[] memory convertedEquipmentQuantities = new uint32[](
            _equipmentQuantities.length
        );
        for (uint256 i = 0; i < _equipmentItemIds.length; i++) {
            convertedEquipmentItemIds[i] = uint64(_equipmentItemIds[i]);
            convertedEquipmentQuantities[i] = uint32(_equipmentQuantities[i]);
        }

        DungeonStructs.DungeonSession memory newSession = DungeonStructs
            .DungeonSession({
                sessionId: uint64(sessionId),
                player: _player,
                dungeonId: uint64(_dungeonId),
                stageNumber: uint16(0),
                startTime: uint64(block.timestamp),
                endTime: uint64(0),
                isCompleted: false,
                isClaimed: false,
                hasBet: _betAmount > 0,
                rewardItemIds: new uint64[](0),
                rewardQuantities: new uint32[](0),
                rewardMultiplier: 0,
                playerDamages: new uint32[](0),
                monsterHPs: new uint32[](0),
                sunlightReward: uint128(0),
                sunnyReward: uint128(0),
                betAmount: _betAmount,
                equipmentItemIds: convertedEquipmentItemIds,
                equipmentQuantities: convertedEquipmentQuantities
            });

        dungeonSessions[sessionId] = newSession;
        playerSessions[_player].push(sessionId);

        emit DungeonSessionStarted(
            sessionId,
            _player,
            _dungeonId,
            0
        );
        return sessionId;
    }

    /**
     * @notice End dungeon session (called by admin)
     * @param _sessionId Session ID
     * @param _isCompleted Whether session is completed
     * @param _rewardItemIds Reward item IDs
     * @param _rewardQuantities Reward item quantities
     * @param _playerDamages Player damages in rounds
     * @param _monsterHPs Monster HPs in rounds
     * @param _sunlightReward Sunlight reward
     * @param _sunnyReward Sunny reward
     * @param _stageNumber Stage number
     */
    function endDungeonSession(
        uint256 _sessionId,
        bool _isCompleted,
        uint256[] memory _rewardItemIds,
        uint256[] memory _rewardQuantities,
        uint256[] memory _playerDamages,
        uint256[] memory _monsterHPs,
        uint256 _sunlightReward,
        uint256 _sunnyReward,
        uint32 _stageNumber
    ) external onlyAuthorized {
        require(
            dungeonSessions[_sessionId].sessionId > 0,
            "Session does not exist"
        );
        require(
            !dungeonSessions[_sessionId].isCompleted,
            "Session already ended"
        );
        require(
            !dungeonSessions[_sessionId].isClaimed,
            "Session already claimed"
        );

        require(
            _rewardItemIds.length == _rewardQuantities.length,
            "Reward arrays length mismatch"
        );
        require(
            _playerDamages.length == _monsterHPs.length,
            "Battle data arrays length mismatch"
        );

        DungeonStructs.DungeonSession storage session = dungeonSessions[
            _sessionId
        ];

        uint32 rewardMultiplier = 0;
        
        if (_stageNumber > 0) {
            DungeonStructs.Dungeon storage dungeon = dungeons[uint256(session.dungeonId)];
            bool stageExists = false;
            for (uint256 i = 0; i < dungeon.stages.length; i++) {
                if (dungeon.stages[i].stageNumber == uint16(_stageNumber)) {
                    stageExists = true;
                    rewardMultiplier = dungeon.stages[i].rewardMultiplier;
                    break;
                }
            }
            require(stageExists, "Stage does not exist");
        }
        
        session.endTime = uint64(block.timestamp);
        session.isCompleted = _isCompleted;
        session.rewardMultiplier = rewardMultiplier;

        uint64[] memory convertedRewardItemIds = new uint64[](
            _rewardItemIds.length
        );
        uint32[] memory convertedRewardQuantities = new uint32[](
            _rewardQuantities.length
        );
        uint32[] memory convertedPlayerDamages = new uint32[](
            _playerDamages.length
        );
        uint32[] memory convertedMonsterHPs = new uint32[](_monsterHPs.length);

        for (uint256 i = 0; i < _rewardItemIds.length; i++) {
            convertedRewardItemIds[i] = uint64(_rewardItemIds[i]);
            convertedRewardQuantities[i] = uint32(_rewardQuantities[i]);
        }
        for (uint256 i = 0; i < _playerDamages.length; i++) {
            convertedPlayerDamages[i] = uint32(_playerDamages[i]);
            convertedMonsterHPs[i] = uint32(_monsterHPs[i]);
        }

        session.rewardItemIds = convertedRewardItemIds;
        session.rewardQuantities = convertedRewardQuantities;
        session.playerDamages = convertedPlayerDamages;
        session.monsterHPs = convertedMonsterHPs;
        session.sunlightReward = uint128(_sunlightReward);
        session.sunnyReward = uint128(_sunnyReward);
        session.stageNumber = uint16(_stageNumber);

        DungeonStructs.PlayerDungeonProgress
            storage progress = playerDungeonProgress[session.player][
                uint256(session.dungeonId)
            ];
        progress.totalAttempts++;
        if (_isCompleted) {
            progress.successfulAttempts++;
        }
        progress.lastAttemptTime = uint64(block.timestamp);

        uint256[] memory eventRewardItemIds = new uint256[](
            session.rewardItemIds.length
        );
        uint256[] memory eventRewardQuantities = new uint256[](
            session.rewardQuantities.length
        );
        uint256[] memory eventPlayerDamages = new uint256[](
            session.playerDamages.length
        );
        uint256[] memory eventMonsterHPs = new uint256[](
            session.monsterHPs.length
        );

        for (uint256 i = 0; i < session.rewardItemIds.length; i++) {
            eventRewardItemIds[i] = uint256(session.rewardItemIds[i]);
            eventRewardQuantities[i] = uint256(session.rewardQuantities[i]);
        }
        for (uint256 i = 0; i < session.playerDamages.length; i++) {
            eventPlayerDamages[i] = uint256(session.playerDamages[i]);
            eventMonsterHPs[i] = uint256(session.monsterHPs[i]);
        }

        emit DungeonSessionEnded(
            _sessionId,
            session.player,
            uint256(session.dungeonId),
            _isCompleted,
            eventRewardItemIds,
            eventRewardQuantities,
            eventPlayerDamages,
            eventMonsterHPs,
            uint256(session.sunlightReward),
            uint256(session.sunnyReward)
        );
    }

    /**
     * @notice Claim rewards from session (called by player)
     * @param _sessionId Session ID
     * @return success Whether the operation succeeded
     */
    function claimDungeonRewards(
        uint256 _sessionId,
        address playerAddress
    ) external onlyAuthorized returns (bool) {
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
            dungeonSessions[_sessionId].player == playerAddress,
            "Not your session"
        );

        DungeonStructs.DungeonSession storage session = dungeonSessions[
            _sessionId
        ];
        session.isClaimed = true;

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
        require(
            dungeonSessions[_sessionId].sessionId > 0,
            "Session does not exist"
        );
        return dungeonSessions[_sessionId];
    }

    /**
     * @notice Get player's session list
     * @param _player Player address
     * @return sessionIds Array of session IDs
     */
    function getPlayerSessions(
        address _player
    ) external view returns (uint256[] memory) {
        return playerSessions[_player];
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
