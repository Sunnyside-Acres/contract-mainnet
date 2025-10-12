// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title InventoryItem
 * @notice Struct representing an item in a player's inventory
 */
struct InventoryItem {
    uint256 itemId; /// ID of the item
    uint256 quantity; /// Quantity of the item
    uint256 instanceId; /// Unique instance identifier
    uint256 durability; /// Item durability (0-100)
    uint256 expiration; /// Expiration timestamp
}
