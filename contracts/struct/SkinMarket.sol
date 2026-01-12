//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library SkinMarket {
    struct MarketSkin {
        string skinType; // Type of skin (e.g., "Dragon", "Phoenix")
        uint256 price; // Price in wei (ETH)
        bool active; // Whether item is available
        uint256 lastPriceUpdate; // Timestamp of last price update
    }
    /// @notice Represents an NPC market
    struct NPCMarket {
        uint256 npcId; // ID of the NPC
        string name; // Name of the market/NPC
        bool isActive; // Whether market is open
        mapping(string => MarketSkin) skins; // skin type in the market
        string[] skinTypes; // Array of skin types for iteration
    }
}