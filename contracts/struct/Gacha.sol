// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Item.sol";

library GachaStructs {
    enum GachaType {
        Normal, // Gacha thường
        Premium, // Gacha cao cấp
        Limited, // Gacha giới hạn
        Event // Gacha sự kiện
    }

    enum PaymentType {
        Sunny, // Thanh toán bằng Sunny
        Sunlight, // Thanh toán bằng Sunlight
        ERC20 // Thanh toán bằng ERC20 token
    }

    struct GachaPool {
        uint256 id;
        string name;
        string description;
        GachaType gachaType;
        PaymentType paymentType;
        uint256 price; // Giá gacha
        address erc20Token; // Địa chỉ ERC20 token (nếu paymentType là ERC20)
        uint256 maxPulls; // Số lần pull tối đa
        uint256 currentPulls; // Số lần pull hiện tại
        uint256 startTime; // Thời gian bắt đầu
        uint256 endTime; // Thời gian kết thúc
        bool isActive; // Trạng thái hoạt động
        bool isPaused; // Trạng thái tạm dừng
    }

    struct GachaItem {
        uint256 itemId; // ID của item
        ItemStructs.Rarity rarity; // Độ hiếm của item
        uint256 probability; // Xác suất rơi (basis points: 10000 = 100%)
        uint256 minQuantity; // Số lượng tối thiểu
        uint256 maxQuantity; // Số lượng tối đa
        bool isGuaranteed; // Có đảm bảo rơi hay không
        uint256 guaranteedPulls; // Số lần pull để đảm bảo
    }

    struct GachaResult {
        uint256 pullId; // ID của lần pull
        uint256 gachaPoolId; // ID của gacha pool
        address player; // Người chơi
        uint256 itemId; // Item nhận được
        uint256 quantity; // Số lượng item
        ItemStructs.Rarity rarity; // Độ hiếm của item
        uint256 timestamp; // Thời gian pull
        uint256 cost; // Chi phí pull
        PaymentType paymentType; // Loại thanh toán
    }

    struct PlayerGachaStats {
        address player; // Địa chỉ người chơi
        uint256 totalPulls; // Tổng số lần pull
        uint256 totalSpent; // Tổng số tiền đã chi
        mapping(uint256 => uint256) pullsPerPool; // Số lần pull theo pool
        mapping(uint256 => uint256) spentPerPool; // Số tiền chi theo pool
        mapping(uint256 => uint256) guaranteedPulls; // Số lần pull đảm bảo theo pool
    }

    struct GachaPoolStats {
        uint256 totalPulls; // Tổng số lần pull
        uint256 totalRevenue; // Tổng doanh thu
        mapping(ItemStructs.Rarity => uint256) itemsPulled; // Số item đã pull theo rarity
        mapping(uint256 => uint256) itemPulls; // Số lần pull theo item
    }
}
