// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct Plant {
    uint256 id;
    uint256 plotId;
    uint256 itemId;
    uint256 plantedTime; // Thời gian bắt đầu trồng
    uint256 lastTendedTime; // Thời điểm cây được chăm sóc cuối cùng
    uint256 qualityModifier; // Chỉ số chất lượng ảnh hưởng từ chăm sóc 0 -> 100
    uint256 growthTime; // Thời gian trồng cây
    uint256 tendCount; // Số lần chăm sóc
    bool isHarvested; // Trạng thái đã thu hoạch hay chưa
}
