// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IBetting
 * @notice Interface cho hệ thống betting
 */
interface IBetting {
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

    /// @notice Event khi người chơi đặt cược
    event BetPlaced(
        uint256 indexed betId,
        address indexed player,
        uint256 dungeonId,
        uint256 betAmount,
        address tokenAddress
    );

    /// @notice Event khi admin tạo proof kết quả
    event ProofCreated(
        uint256 indexed betId,
        address indexed player,
        bool isWin,
        bytes32 proofHash
    );

    /// @notice Event khi người chơi claim thưởng
    event BetClaimed(
        uint256 indexed betId,
        address indexed player,
        uint256 rewardAmount,
        address tokenAddress
    );

    /// @notice Đặt cược với native token
    function betNative(uint256 dungeonId) external payable;

    /// @notice Đặt cược với ERC20 token
    function betERC20(
        uint256 dungeonId,
        address tokenAddress,
        uint256 betAmount
    ) external;

    /// @notice Admin tạo proof kết quả
    function createProof(uint256 betId, bool isWin, bytes32 proofHash) external;

    /// @notice Người chơi claim thưởng
    function claimReward(uint256 betId) external;

    /// @notice Lấy thông tin bet
    function getBetInfo(uint256 betId) external view returns (BetInfo memory);
}
