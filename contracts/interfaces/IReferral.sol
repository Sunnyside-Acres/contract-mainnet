// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Referral.sol";

interface IReferralComponent {
    function setReferral(address user, ReferralData calldata data) external;

    function getReferral(
        address user
    ) external view returns (ReferralData memory);

    function hasUser(address user) external view returns (bool);

    function getReferredUsers(
        address referrer
    ) external view returns (address[] memory);
}
