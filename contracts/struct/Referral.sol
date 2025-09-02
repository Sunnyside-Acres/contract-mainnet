// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct ReferralData {
    bool referred; // Đã được giới thiệu chưa
    address referrer; // Địa chỉ người giới thiệu
    uint256 referralCount; // Số người đã giới thiệu
    uint256 totalPoints; // Tổng điểm đã nhận từ referral
    uint256 lastReferralTime; // Thời gian referral cuối cùng
    uint256 createdAt; // Thời gian tạo referral
}
