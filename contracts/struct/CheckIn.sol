// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct RewardInfo {
    uint256 itemId;
    uint256 quantity;
    uint256 sunlight;
}

struct FullDayReward {
    uint256 dayIndex;
    RewardInfo daily;
    RewardInfo milestone;
}
