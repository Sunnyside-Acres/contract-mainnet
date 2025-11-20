// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Dungeon.sol";

/**
 * @title IDungeon
 * @notice Interface for managing dungeons
 */
interface IDungeon {
    /**
     * @notice Creates a new dungeon
     * @param _dungeonId ID of the dungeon
     * @param _name Name of the dungeon
     * @param _description Description of the dungeon
     * @param _dungeonType Type of the dungeon
     * @param _difficulty Difficulty level
     * @param _levelRequirement Minimum player level required
     * @param _energyCost Energy cost to enter
     * @param _sunlightCost Sunlight cost to enter
     * @param _sunnyCost Sunny cost to enter
     * @param _itemRequirements Required items for entry
     * @param _cooldownTime Cooldown time between attempts
     * @param _minBetAmount Minimum bet amount
     * @param _maxBetAmount Maximum bet amount
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
    ) external returns (uint256);

    /**
     * @notice Updates an existing dungeon
     * @param _dungeonId ID of the dungeon
     * @param _name New name
     * @param _description New description
     * @param _isActive Whether dungeon is active
     * @param _isPaused Whether dungeon is paused
     */
    function updateDungeon(
        uint256 _dungeonId,
        string memory _name,
        string memory _description,
        bool _isActive,
        bool _isPaused
    ) external;

    /**
     * @notice Records a dungeon attempt
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     * @param _isCompleted Whether attempt was successful
     * @param _rewards Rewards received
     * @param _quantities Quantities of rewards
     */
    function recordAttempt(
        address _player,
        uint256 _dungeonId,
        bool _isCompleted,
        uint256[] memory _rewards,
        uint256[] memory _quantities
    ) external;

    /**
     * @notice Gets dungeon information
     * @param _dungeonId ID of the dungeon
     * @return Dungeon struct
     */
    function getDungeon(
        uint256 _dungeonId
    ) external view returns (DungeonStructs.Dungeon memory);

    /**
     * @notice Gets all dungeon IDs
     * @return Array of dungeon IDs
     */
    function getAllDungeonIds() external view returns (uint256[] memory);

    /**
     * @notice Check if dungeon exists
     * @param _dungeonId Dungeon ID
     * @return exists Whether dungeon exists
     */
    function exists(uint256 _dungeonId) external view returns (bool);

    /**
     * @notice Gets player's dungeon progress
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     * @return PlayerDungeonProgress struct
     */
    function getPlayerProgress(
        address _player,
        uint256 _dungeonId
    ) external view returns (DungeonStructs.PlayerDungeonProgress memory);

    /**
     * @notice Checks if player can enter dungeon
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     * @return True if player can enter
     */
    function canEnterDungeon(
        address _player,
        uint256 _dungeonId
    ) external view returns (bool);

    /**
     * @notice Unlocks dungeon for player
     * @param _player Player address
     * @param _dungeonId Dungeon ID
     */
    function unlockDungeon(address _player, uint256 _dungeonId) external;

    // ============ DUNGEON STAGE FUNCTIONS ============

    /**
     * @notice Adds a new stage to dungeon
     * @param _dungeonId ID of the dungeon
     * @param _stageNumber Stage number
     * @param _rewardMultiplier Reward multiplier (basis points)
     */
    function addDungeonStage(
        uint256 _dungeonId,
        uint256 _stageNumber,
        uint256 _rewardMultiplier
    ) external;

    // ============ DUNGEON MANAGEMENT FUNCTIONS ============

    /**
     * @notice Sets dungeon active status
     * @param _dungeonId ID of the dungeon
     * @param _isActive Whether dungeon is active
     */
    function setDungeonActive(uint256 _dungeonId, bool _isActive) external;

    /**
     * @notice Sets dungeon paused status
     * @param _dungeonId ID of the dungeon
     * @param _isPaused Whether dungeon is paused
     */
    function setDungeonPaused(uint256 _dungeonId, bool _isPaused) external;

    /**
     * @notice Deletes a dungeon
     * @param _dungeonId ID of the dungeon to delete
     */
    function deleteDungeon(uint256 _dungeonId) external;

    // ============ DUNGEON SESSION FUNCTIONS ============

    /**
     * @notice Starts a dungeon session
     * @param _player Player address
     * @param _dungeonId ID of the dungeon
     * @param _betAmount Bet amount (0 if no bet)
     * @param _equipmentItemIds Equipment item IDs
     * @param _equipmentQuantities Equipment item quantities
     * @return sessionId ID of the new session
     */
    function startDungeonSession(
        address _player,
        uint256 _dungeonId,
        uint256 _betAmount,
        uint256[] memory _equipmentItemIds,
        uint256[] memory _equipmentQuantities
    ) external returns (uint256);

    /**
     * @notice Ends a dungeon session
     * @param _sessionId ID of the session
     * @param _isCompleted Whether session was completed
     * @param _rewardItemIds Reward item IDs
     * @param _rewardQuantities Reward quantities
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
    ) external;

    /**
     * @notice Claims dungeon rewards
     * @param _sessionId ID of the session
     * @param playerAddress Player address
     * @return success Whether claim was successful
     */
    function claimDungeonRewards(
        uint256 _sessionId,
        address playerAddress
    ) external returns (bool);

    // ============ SESSION QUERY FUNCTIONS ============

    /**
     * @notice Gets dungeon session information
     * @param _sessionId ID of the session
     * @return session DungeonSession struct
     */
    function getDungeonSession(
        uint256 _sessionId
    ) external view returns (DungeonStructs.DungeonSession memory);

    /**
     * @notice Gets player's session IDs
     * @param _player Player address
     * @return sessionIds Array of session IDs
     */
    function getPlayerSessions(
        address _player
    ) external view returns (uint256[] memory);

    /**
     * @notice Gets session battle data
     * @param _sessionId ID of the session
     * @return playerDamages Player damages array
     * @return monsterHPs Monster HPs array
     */
    function getSessionBattleData(
        uint256 _sessionId
    )
        external
        view
        returns (uint32[] memory playerDamages, uint32[] memory monsterHPs);

    // ============ BETTING FUNCTIONS ============

    /**
     * @notice Sets min/max bet amounts
     * @param _minBetAmount Minimum bet amount
     * @param _maxBetAmount Maximum bet amount
     */
    function setMinMaxBetAmount(
        uint256 _minBetAmount,
        uint256 _maxBetAmount
    ) external;

    /**
     * @notice Gets min/max bet amounts
     * @return _minBetAmount Minimum bet amount
     * @return _maxBetAmount Maximum bet amount
     */
    function getMinMaxBetAmount()
        external
        view
        returns (uint256 _minBetAmount, uint256 _maxBetAmount);

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @notice Emergency withdraw function
     * @param _to Address to withdraw to
     * @return success Whether withdrawal was successful
     */
    function emergencyWithdraw(address payable _to) external returns (bool);
}
