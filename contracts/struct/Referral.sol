// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ReferralData
 * @notice Struct containing referral information for a user
 */
struct ReferralData {
    bool referred; /// Whether user was referred by someone
    address referrer; /// Address of the referrer
    uint256 referralCount; /// Number of users referred by this user
    uint256 totalPoints; /// Total points earned from referrals
    uint256 lastReferralTime; /// Timestamp of last referral
    uint256 createdAt; /// Timestamp when referral data was created
}
