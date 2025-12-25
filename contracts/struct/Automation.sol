// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct FactoryState {
    bool isOwned;
    bool isActive;
    uint256 price; // price paid to buy the factory
    
    uint256 inputItemId; // item being processed
    uint256 processableQty; // total quantity that can be processed

    uint64 startTime; // time when processing started
    uint64 availableTime; // time when factory becomes available with remaining capacity (in seconds)
    uint64 productionEndTime; // end time of production
    uint64 batteryExpiration; // end time of machine

    uint256[] outputItemId; // item being produced
    uint256[] totalOutput; // total output produced
    uint256[] claimedOutput; // output already claimed

    uint256[] supportItemId; // optional support item (e.g., fertilizer)
    uint256[] supportItemQty; // quantity of support item used

    uint256 totalSupportReductionRate; // total reduction rate from support items
}
