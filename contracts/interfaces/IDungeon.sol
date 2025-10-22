// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Dungeon.sol";

/**
 * @title IDungeonComponent
 * @notice Interface for managing dungeons
 */
interface IDungeonComponent {
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
    ) external;

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
    function getAllDungeons() external view returns (uint256[] memory);

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
}
