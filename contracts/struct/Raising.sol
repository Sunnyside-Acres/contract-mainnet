// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct Raising {
    uint256 id;
    uint256 itemId; // ID của item được nuôi
    uint256 raisingTime; // Thời gian bắt đầu nuôi
    uint256 qualityModifier; // Chỉ số chất lượng ảnh hưởng từ chăm sóc 0 -> 100
    uint256 growthTime; // Thời gian nuôi cây
    uint256 lastFeedTime; // Thời điểm cây được cấp thức ăn cuối cùng
    uint256 feedCount; // Số lần cấp thức ăn
    bool isHarvested; // Trạng thái đã thu hoạch hay chưa
    uint256 lastHarvestTime; // Thời điểm harvest cuối cùng
    uint256 harvestCount; // Số lần đã harvest (tối đa 3 lần)
    bool isSlaughtered; // Trạng thái đã giết thịt hay chưa
    uint256 totalHarvestedItems; // Tổng số sản phẩm đã thu hoạch được
}
