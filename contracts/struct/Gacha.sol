// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Item.sol";

/**
 * @title GachaStructs
 * @notice Library containing gacha-related data structures
 */
library GachaStructs {
    /**
     * @notice Enum defining gacha types
     */
    enum GachaType {
        Normal, /// Normal gacha
        Premium, /// Premium gacha
        Limited, /// Limited-time gacha
        Event /// Event gacha
    }

    /**
     * @notice Enum defining payment methods for gacha
     */
    enum PaymentType {
        Sunny, /// Pay with Sunny currency
        Sunlight, /// Pay with Sunlight currency
        ERC20 /// Pay with ERC20 token
    }

    /**
     * @notice Struct representing a gacha pool
     */
    struct GachaPool {
        uint256 id; /// Unique pool ID
        string name; /// Name of the gacha pool
        string description; /// Description of the pool
        GachaType gachaType; /// Type of gacha
        PaymentType paymentType; /// Payment method
        uint256 price; /// Cost per pull
        address erc20Token; /// ERC20 token address (if payment type is ERC20)
        uint256 maxPulls; /// Maximum pulls allowed
        uint256 currentPulls; /// Current number of pulls
        uint256 startTime; /// Start timestamp
        uint256 endTime; /// End timestamp
        bool isActive; /// Whether pool is active
        bool isPaused; /// Whether pool is paused
    }

    /**
     * @notice Struct representing an item in a gacha pool
     */
    struct GachaItem {
        uint256 itemId; /// ID of the item
        ItemStructs.Rarity rarity; /// Rarity of the item
        uint256 probability; /// Drop probability (basis points: 10000 = 100%)
        uint256 minQuantity; /// Minimum quantity per pull
        uint256 maxQuantity; /// Maximum quantity per pull
        bool isGuaranteed; /// Whether item is guaranteed after N pulls
        uint256 guaranteedPulls; /// Number of pulls until guaranteed
    }

    /**
     * @notice Struct representing the result of a gacha pull
     */
    struct GachaResult {
        uint256 pullId; /// Unique pull ID
        uint256 gachaPoolId; /// ID of the gacha pool
        address player; /// Address of the player
        uint256 itemId; /// ID of the item received
        uint256 quantity; /// Quantity of items received
        ItemStructs.Rarity rarity; /// Rarity of the item
        uint256 timestamp; /// Timestamp of the pull
        uint256 cost; /// Cost of the pull
        PaymentType paymentType; /// Payment method used
    }

    /**
     * @notice Struct containing player gacha statistics (with mappings)
     */
    struct PlayerGachaStats {
        address player; /// Address of the player
        uint256 totalPulls; /// Total number of pulls
        uint256 totalSpent; /// Total amount spent
        mapping(uint256 => uint256) pullsPerPool; /// Pulls per pool
        mapping(uint256 => uint256) spentPerPool; /// Amount spent per pool
        mapping(uint256 => uint256) guaranteedPulls; /// Guaranteed pulls counter per pool
    }

    /**
     * @notice Struct containing gacha pool statistics (with mappings)
     */
    struct GachaPoolStats {
        uint256 totalPulls; /// Total number of pulls in pool
        uint256 totalRevenue; /// Total revenue generated
        mapping(ItemStructs.Rarity => uint256) itemsPulled; /// Items pulled by rarity
        mapping(uint256 => uint256) itemPulls; /// Pulls per item ID
    }
}
