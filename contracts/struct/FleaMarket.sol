// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct MarketListing {
    uint256 id; // ID của listing
    address seller; // Người bán
    uint256 itemId; // ID của item
    uint256 quantity; // Số lượng item
    uint256 price; // Giá bán (sunny)
    uint256 listingTime; // Thời gian đăng bán
    uint256 expirationTime; // Thời gian hết hạn
    bool isActive; // Trạng thái hoạt động
    uint256 durability; // Độ bền của item
    uint256 expiration; // Hạn sử dụng của item
}

struct MarketTransaction {
    uint256 listingId; // ID của listing
    address seller; // Người bán
    address buyer; // Người mua
    uint256 itemId; // ID của item
    uint256 quantity; // Số lượng giao dịch
    uint256 price; // Giá giao dịch
    uint256 transactionTime; // Thời gian giao dịch
    uint256 durability; // Độ bền của item
    uint256 expiration; // Hạn sử dụng của item
}

struct MarketStats {
    uint256 totalListings; // Tổng số listing
    uint256 totalTransactions; // Tổng số giao dịch
    uint256 totalVolume; // Tổng khối lượng giao dịch (sunny)
    uint256 activeListings; // Số listing đang hoạt động
}
