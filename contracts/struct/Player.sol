// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Player
 * @notice Struct representing a player's core data
 */
struct Player {
    address playerAddress; /// Address of the player
    string name; /// Player's display name
    uint16 level; /// Current player level
    uint256 xp; /// Experience points
    uint16 mana; /// Current mana
    uint16 maxMana; /// Maximum mana capacity
    uint256 sunlight; /// Sunlight currency balance
    uint256 sunny; /// Sunny currency balance
    uint256 lastLogin; /// Timestamp of last login
}
