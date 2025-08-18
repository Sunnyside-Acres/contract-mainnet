// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library ItemStructs {
    enum ItemType {
        Weapon, // Vũ khí
        Consumable, // Vật phẩm tiêu thụ
        Material, // Nguyên liệu
        Seed, // Hạt giống
        Crop, // Cây trồng
        Livestock, // Gia súc, gia cầm
        AnimalFeed, // Thức ăn chăn nuôi
        Tool, // Công cụ
        Quest, // Nhiệm vụ
        Other // Khác
    }

    enum Rarity {
        Common, // Thường
        Uncommon, // Không phổ biến
        Rare, // Hiếm
        Epic, // Sử thi
        Legendary // Huyền thoại
    }

    struct Item {
        uint256 id;
        string name;
        ItemType itemType;
        Rarity rarity;
        uint256 maxStacked;
        bool isStacked;
        bool isTradable;
        bool isBanned;
    }

    struct ItemDrop {
        uint256 itemId; // ID của vật phẩm
        uint256 probability; // Xác suất rơi vật phẩm
        uint256 yield; // Số lượng vật phẩm rơi
    }

    enum Attribute {
        Damage, // Sát thương
        Durability, // Độ bền
        GrowthRate, // Tốc độ phát triển
        YieldBonus, // Thưởng sản lượng
        Health, // Máu
        Speed, // Tốc độ
        Resistance, // Kháng
        Strength, // Sức mạnh
        Agility, // Nhanh nhẹn
        Stamina, // Sức chịu đựng
        Fertility, // Độ màu mỡ
        WaterUsage, // Lượng nước tiêu thụ
        FeedEfficiency, // Hiệu quả thức ăn
        Quality // Chất lượng
    }
}
