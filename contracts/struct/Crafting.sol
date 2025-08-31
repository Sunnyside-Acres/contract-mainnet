// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct CraftingIngredient {
    uint256 itemId; // ID của item cần thiết
    uint256 quantity; // Số lượng cần thiết
}

struct CraftingRecipe {
    uint256 id; // ID của công thức
    uint256 resultItemId; // ID của item được craft
    uint256 resultQuantity; // Số lượng item được craft
    uint256 successRate; // Tỉ lệ thành công (0-100, đại diện cho số đơn vị trong khoảng)
    uint256 sunlightCost; // Chi phí sunlight
    uint256 sunnyCost; // Chi phí sunny
    CraftingIngredient[] ingredients; // Danh sách nguyên liệu
    bool isActive; // Trạng thái hoạt động của công thức
    uint256 minPlayerLevel; // Level tối thiểu để craft
}

struct CraftingHistory {
    address player; // Người chơi
    uint256 recipeId; // ID công thức
    uint256 resultItemId; // ID item kết quả
    uint256 resultQuantity; // Số lượng item kết quả
    bool isSuccess; // Thành công hay thất bại
    uint256 timestamp; // Thời gian craft
    uint256 sunlightSpent; // Sunlight đã tiêu
    uint256 sunnySpent; // Sunny đã tiêu
}
