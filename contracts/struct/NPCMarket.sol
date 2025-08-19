// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct MarketItem {
    uint256 itemId;
    uint256 limitPerUser; // Giới hạn số lượng mỗi user có thể mua/bán (0 = không giới hạn)
    uint256 pricePerUnit;
    bool isSelling; // true = NPC bán item, false = NPC mua item
    bool active;
    uint256 lastPriceUpdate;
    mapping(address => uint256) userPurchases; // Tracking số lượng đã mua/bán của từng user
}

// Struct để return data (không có mapping)
struct MarketItemView {
    uint256 itemId;
    uint256 limitPerUser;
    uint256 pricePerUnit;
    bool isSelling;
    bool active;
    uint256 lastPriceUpdate;
}

struct NPCMarket {
    uint256 npcId;
    string name;
    bool isActive;
    mapping(uint256 => MarketItem) items; // itemId => MarketItem
    uint256[] itemIds; // Danh sách itemId để iterate
}

struct NPC {
    uint256 npcId;
    string name;
    bool isActive;
}
