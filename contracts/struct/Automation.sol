// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct ItemAutoStruct {
    uint256 itemAmount;
    uint256[] itemIdDrop;
    uint256[] itemAmountDrop;
    uint64 startTime;
    uint64 endTime;
}

struct ItemsAutoHasCompleted {
    uint256 itemId;
    bool hasCompleted;
}
