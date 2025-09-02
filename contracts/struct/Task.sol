// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct TaskProof {
    bytes32 proofId; // ID của proof (hash của taskId + player + nonce)
    uint256 taskId; // ID của task
    address player; // Địa chỉ người chơi
    uint256 rewardSunny; // Phần thưởng sunny
    uint256 rewardSunlight; // Phần thưởng sunlight
    uint256 rewardExp; // Phần thưởng kinh nghiệm
    uint256[] rewardItems; // Danh sách item thưởng
    uint256[] rewardItemQuantities; // Số lượng item thưởng
    uint256 createdAt; // Thời gian tạo proof
    uint256 expiresAt; // Thời gian hết hạn proof
    bool isClaimed; // Đã claim chưa
    bool isActive; // Trạng thái hoạt động
}

struct TaskStats {
    uint256 totalProofsCreated; // Tổng số proof đã tạo
    uint256 totalRewardsClaimed; // Tổng số reward đã claim
    uint256 totalSunnyRewarded; // Tổng sunny đã thưởng
    uint256 totalSunlightRewarded; // Tổng sunlight đã thưởng
    uint256 totalExpRewarded; // Tổng exp đã thưởng
}
