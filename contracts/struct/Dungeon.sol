// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Item.sol";

/**
 * @title DungeonStructs
 * @notice Library containing data structures related to dungeon
 */
library DungeonStructs {
    /**
     * @notice Enum defining dungeon types
     */
    enum DungeonType {
        Normal,
        Elite,
        Boss,
        Event,
        Raid
    }

    /**
     * @notice Enum defining dungeon difficulty levels
     */
    enum Difficulty {
        Easy,
        Medium,
        Hard,
        Expert,
        Master
    }

    /**
     * @notice Struct representing item requirement to enter dungeon
     */
    struct ItemRequirement {
        uint64 itemId;
        uint32 quantity;
        bool isConsumed;
    }

    /**
     * @notice Struct representing a stage in dungeon
     */
    struct DungeonStage {
        uint16 stageNumber;
        uint32 rewardMultiplier;
        bool isActive;
        uint64 createdAt;
    }

    /**
     * @notice Struct representing a dungeon
     */
    struct Dungeon {
        uint64 id;
        string name;
        string description;
        DungeonType dungeonType;
        Difficulty difficulty;
        uint16 levelRequirement;
        uint32 energyCost;
        uint128 sunlightCost;
        uint128 sunnyCost;
        ItemRequirement[] itemRequirements;
        DungeonStage[] stages;
        uint32 cooldownTime;
        uint256 minBetAmount;
        uint256 maxBetAmount;
        bool isActive;
        bool isPaused;
        uint64 createdAt;
        uint64 updatedAt;
    }

    /**
     * @notice Struct representing player's dungeon progress
     */
    struct PlayerDungeonProgress {
        address player;
        uint64 dungeonId;
        uint64 lastAttemptTime;
        uint32 totalAttempts;
        uint32 successfulAttempts;
        bool isUnlocked;
    }

    /**
     * @notice Struct representing dungeon session
     */
    struct DungeonSession {
        uint64 sessionId;
        address player;
        uint64 dungeonId;
        uint16 stageNumber;
        uint64 startTime;
        uint64 endTime;
        bool isCompleted;
        bool isClaimed;
        bool hasBet;
        uint64[] rewardItemIds;
        uint32[] rewardQuantities;
        uint32 rewardMultiplier;
        uint32[] playerDamages;
        uint32[] monsterHPs;
        uint128 sunlightReward;
        uint128 sunnyReward;
        uint256 betAmount;
        uint64[] equipmentItemIds;
        uint32[] equipmentQuantities;
    }
}
