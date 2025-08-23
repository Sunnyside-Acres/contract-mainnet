// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct Player {
    address playerAddress;
    string name;
    uint16 level;
    uint256 xp;
    uint16 mana;
    uint16 maxMana;
    uint256 sunlight;
    uint256 sunny;
    uint256 lastLogin;
}
