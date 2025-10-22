// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Betting
 * @notice Cấu trúc dữ liệu cho hệ thống betting
 */
library Betting {
    /// @notice Cấu trúc thông tin bet
    struct BetInfo {
        address player;
        uint256 dungeonId;
        uint256 betAmount;
        address tokenAddress; // address(0) cho native token
        uint256 timestamp;
        bool claimed;
        bool isWin;
    }

    /// @notice Cấu trúc thông tin proof
    struct ProofInfo {
        uint256 betId;
        address player;
        bool isWin;
        bytes32 proofHash;
        uint256 timestamp;
        address admin;
    }

    /// @notice Cấu trúc thống kê betting
    struct BettingStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalVolume;
        uint256 totalRewards;
    }
}
