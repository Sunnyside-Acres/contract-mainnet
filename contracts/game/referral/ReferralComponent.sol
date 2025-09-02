// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IReferral.sol";
import "../../interfaces/IWorld.sol";
import "../../struct/Referral.sol";

contract ReferralComponent {
    address public world;
    address public admin;
    address public implementation;

    mapping(address => ReferralData) private referrals;
    address[] private users;

    event ComponentUpdated(address newComponent);
    event ReferralUpdated(address indexed user, address indexed referrer);

    function setReferral(
        address user,
        ReferralData calldata data
    ) external {
        referrals[user] = data;
        if (!hasUser(user)) {
            users.push(user);
        }
        emit ReferralUpdated(user, data.referrer);
    }

    function getReferral(
        address user
    ) external view returns (ReferralData memory) {
        return referrals[user];
    }

    function hasUser(address user) public view returns (bool) {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                return true;
            }
        }
        return false;
    }

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
