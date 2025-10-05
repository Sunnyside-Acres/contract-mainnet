// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct Plot {
    // Storage slot 1: 32 bytes
    uint256 id; // Max: 2^256 - 1 (115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,935)
    // Storage slot 2: 20 bytes (address) + 12 bytes (packed data)
    address owner; // 20 bytes (160 bits)
    uint8 plotType; // Land type (0=Normal, 1=Fertile, 2=Magic) - Max: 255
    uint8 fertility; // Fertility level (0-100) - Max: 255 (sufficient for 0-100)
    bool isActive; // Is plot ready for planting - Max: true/false
    bool isLocked; // Is plot locked (due to events or regulations) - Max: true/false
    // 8 bytes remaining for additional data

    // Storage slot 3: 32 bytes (packed coordinates)
    int32 xCoordinate; // X coordinate on 2D grid - Range: -2,147,483,648 to 2,147,483,647
    int32 yCoordinate; // Y coordinate on 2D grid - Range: -2,147,483,648 to 2,147,483,647
    uint64 creationTime; // Plot creation timestamp - Max: 18,446,744,073,709,551,615 (584 billion years)
}
