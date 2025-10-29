// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title NPCMarketNative Structs
 * @author RYG.Labs
 * @notice Struct definitions for NPC Market system using native token (ETH)
 * @dev Defines data structures for managing NPC markets with ETH payments
 */
library NPCMarketNativeStructs {
    /// @notice Represents a market item in an NPC market
    struct MarketItem {
        uint256 itemId; // ID of the item
        uint256 limitPerUser; // Maximum quantity per user (0 = unlimited)
        uint256 pricePerUnit; // Price per unit in wei (ETH)
        bool isSelling; // Whether NPC is selling (true) or buying (false)
        bool active; // Whether item is available
        uint256 lastPriceUpdate; // Timestamp of last price update
        mapping(address => uint256) userPurchases; // User purchase tracking
    }

    /// @notice View struct for market item (without mapping)
    struct MarketItemView {
        uint256 itemId;
        uint256 limitPerUser;
        uint256 pricePerUnit;
        bool isSelling;
        bool active;
        uint256 lastPriceUpdate;
    }

    /// @notice Represents an NPC market
    struct NPCMarket {
        uint256 npcId; // ID of the NPC
        string name; // Name of the market/NPC
        bool isActive; // Whether market is open
        uint256 minTransactionAmount; // Minimum transaction amount in wei
        uint256 maxTransactionAmount; // Maximum transaction amount in wei
        uint256 totalEarnings; // Total ETH earned by NPC
        uint256 totalSpent; // Total ETH spent by NPC
        mapping(uint256 => MarketItem) items; // Items in the market
        uint256[] itemIds; // Array of item IDs for iteration
    }

    /// @notice Represents a transaction record
    struct TransactionRecord {
        uint256 transactionId; // Unique transaction ID
        address player; // Address of the player
        uint256 npcId; // ID of the NPC
        uint256 itemId; // ID of the item
        uint256 quantity; // Quantity traded
        uint256 pricePerUnit; // Price per unit at time of transaction
        uint256 totalPrice; // Total price paid/received
        bool isBuy; // True if player bought, false if sold
        uint256 timestamp; // Block timestamp
    }

    /// @notice Represents market statistics
    struct MarketStats {
        uint256 totalTransactions; // Total number of transactions
        uint256 totalVolume; // Total volume in wei
        uint256 totalBuyTransactions; // Total buy transactions
        uint256 totalSellTransactions; // Total sell transactions
        uint256 totalBuyVolume; // Total buy volume in wei
        uint256 totalSellVolume; // Total sell volume in wei
        uint256 lastActivity; // Timestamp of last activity
    }

    /// @notice Represents user statistics for a specific market
    struct UserMarketStats {
        uint256 totalTransactions; // User's total transactions in this market
        uint256 totalVolume; // User's total volume in wei
        uint256 totalBuyTransactions; // User's buy transactions
        uint256 totalSellTransactions; // User's sell transactions
        uint256 totalBuyVolume; // User's buy volume in wei
        uint256 totalSellVolume; // User's sell volume in wei
        uint256 lastActivity; // User's last activity timestamp
    }
}
