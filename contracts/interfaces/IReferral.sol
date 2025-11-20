// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Referral.sol";

/**
 * @title IReferralComponent
 * @notice Interface for managing player referral system
 */
interface IReferralComponent {
    /**
     * @notice Sets referral data for a user
     * @param user Address of the user
     * @param data ReferralData struct containing referral information
     */
    function setReferral(address user, ReferralData calldata data) external;

    /**
     * @notice Retrieves referral data for a user
     * @param user Address of the user
     * @return ReferralData struct containing referral information
     */
    function getReferral(
        address user
    ) external view returns (ReferralData memory);

    /**
     * @notice Checks if a user has referral data
     * @param user Address of the user to check
     * @return bool True if user has referral data
     */
    function hasUser(address user) external view returns (bool);

    /**
     * @notice Gets all users referred by a specific referrer
     * @param referrer Address of the referrer
     * @return Array of addresses referred by the referrer
     */
    function getReferredUsers(
        address referrer
    ) external view returns (address[] memory);
}
