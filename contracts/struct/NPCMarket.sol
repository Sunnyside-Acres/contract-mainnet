// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MarketItem
 * @notice Struct representing an item in NPC market (with mapping)
 */
struct MarketItem {
    uint256 itemId; /// ID of the item
    uint256 limitPerUser; /// Purchase limit per user (0 = unlimited)
    uint256 pricePerUnit; /// Price per unit
    bool isSelling; /// true = NPC selling, false = NPC buying
    bool active; /// Whether item is active in market
    uint256 lastPriceUpdate; /// Timestamp of last price update
    mapping(address => uint256) userPurchases; /// Tracks purchases per user
}

/**
 * @title MarketItemView
 * @notice View struct for returning market item data (without mapping)
 */
struct MarketItemView {
    uint256 itemId; /// ID of the item
    uint256 limitPerUser; /// Purchase limit per user
    uint256 pricePerUnit; /// Price per unit
    bool isSelling; /// true = NPC selling, false = NPC buying
    bool active; /// Whether item is active
    uint256 lastPriceUpdate; /// Timestamp of last price update
}

/**
 * @title NPCMarket
 * @notice Struct representing an NPC marketplace
 */
struct NPCMarket {
    uint256 npcId; /// Unique NPC ID
    string name; /// Name of the NPC market
    bool isActive; /// Whether market is active
    mapping(uint256 => MarketItem) items; /// itemId => MarketItem mapping
    uint256[] itemIds; /// Array of item IDs for iteration
}

/**
 * @title NPC
 * @notice Struct representing an NPC
 */
struct NPC {
    uint256 npcId; /// Unique NPC ID
    string name; /// Name of the NPC
    bool isActive; /// Whether NPC is active
}
