// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct Plant {
    // Storage slot 1: 32 bytes
    uint256 id; // Max: 2^256 - 1 (115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,935)
    // Storage slot 2: 32 bytes (packed IDs and timestamps)
    uint64 plotId; // Plot ID - Max: 18,446,744,073,709,551,615
    uint64 itemId; // Item ID - Max: 18,446,744,073,709,551,615
    uint64 plantedTime; // Planting start time - Max: 18,446,744,073,709,551,615 (584 billion years)
    uint64 lastTendedTime; // Last tending time - Max: 18,446,744,073,709,551,615 (584 billion years)
    // Storage slot 3: 32 bytes (packed growth data)
    uint32 growthTime; // Growth duration in seconds - Max: 4,294,967,295 (136 years)
    uint16 qualityModifier; // Quality modifier (0-100) - Max: 65,535 (sufficient for 0-100)
    uint16 tendCount; // Number of tending sessions - Max: 65,535
    bool isHarvested; // Harvest status - Max: true/false
    // 7 bytes remaining for additional data
}
