// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IReferral.sol";
import "../../interfaces/IWorld.sol";
import "../../struct/Referral.sol";

/**
 * @title ReferralComponent
 * @author RYG.Labs
 * @notice Data storage contract for the Referral system
 * @dev Stores referral relationships and user data
 */
contract ReferralComponent {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from user address to their referral data
    mapping(address => ReferralData) private referrals;
    /// @notice Array of all user addresses
    address[] private users;

    event ComponentUpdated(address newComponent);
    event ReferralUpdated(address indexed user, address indexed referrer);

    /**
     * @notice Set referral data for a user
     * @param user The user's address
     * @param data The referral data to set
     */
    function setReferral(address user, ReferralData calldata data) external {
        referrals[user] = data;
        if (!hasUser(user)) {
            users.push(user);
        }
        emit ReferralUpdated(user, data.referrer);
    }

    /**
     * @notice Get referral data for a user
     * @param user The user's address
     * @return The user's referral data
     */
    function getReferral(
        address user
    ) external view returns (ReferralData memory) {
        return referrals[user];
    }

    /**
     * @notice Check if a user exists in the system
     * @param user The user's address
     * @return True if user exists
     */
    function hasUser(address user) public view returns (bool) {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Get all users referred by a specific referrer
     * @param referrer The referrer's address
     * @return Array of addresses referred by the referrer
     */
    function getReferredUsers(
        address referrer
    ) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < users.length; i++) {
            if (referrals[users[i]].referrer == referrer) {
                count++;
            }
        }

        address[] memory referred = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < users.length; i++) {
            if (referrals[users[i]].referrer == referrer) {
                referred[index] = users[i];
                index++;
            }
        }

        return referred;
    }
}
