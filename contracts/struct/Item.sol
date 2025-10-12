// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ItemStructs
 * @notice Library containing item-related data structures and enums
 */
library ItemStructs {
    /**
     * @notice Enum defining item types
     */
    enum ItemType {
        Weapon, /// Weapon
        Consumable, /// Consumable item
        Material, /// Material/ingredient
        Seed, /// Seed for planting
        Crop, /// Harvested crop
        Livestock, /// Livestock/poultry
        AnimalFeed, /// Animal feed
        Tool, /// Tool/equipment
        Quest, /// Quest item
        Other /// Other type
    }

    /**
     * @notice Enum defining item rarity levels
     */
    enum Rarity {
        Common, /// Common rarity
        Uncommon, /// Uncommon rarity
        Rare, /// Rare rarity
        Epic, /// Epic rarity
        Legendary /// Legendary rarity
    }

    /**
     * @notice Struct representing an item's core properties
     */
    struct Item {
        uint256 id; /// Unique item ID
        string name; /// Item name
        ItemType itemType; /// Type of the item
        Rarity rarity; /// Rarity level
        uint256 maxStacked; /// Maximum stack size
        bool isStacked; /// Whether item can be stacked
        bool isTradable; /// Whether item can be traded
        bool isBanned; /// Whether item is banned
    }

    /**
     * @notice Struct defining item drop properties
     */
    struct ItemDrop {
        uint256 itemId; /// ID of the item to drop
        uint256 probability; /// Drop probability
        uint256 yield; /// Quantity of items dropped
    }

    /**
     * @notice Enum defining item attributes
     */
    enum Attribute {
        Damage, /// Damage value
        Durability, /// Durability/endurance
        GrowthRate, /// Growth rate for crops
        YieldBonus, /// Harvest yield bonus
        Health, /// Health points
        Speed, /// Speed value
        Resistance, /// Resistance value
        Strength, /// Strength value
        Agility, /// Agility value
        Stamina, /// Stamina/endurance
        Fertility, /// Soil fertility
        WaterUsage, /// Water consumption rate
        FeedEfficiency, /// Feed efficiency for livestock
        Quality, /// Quality modifier
        HarvestCooldown /// Cooldown between harvests
    }
}
