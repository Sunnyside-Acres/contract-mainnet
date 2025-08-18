// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct InventoryItem {
    uint256 itemId;
    uint256 quantity;
    uint256 instanceId;
    uint256 durability;
    uint256 expiration;
}