// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../struct/Referral.sol";
import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IReferral.sol";

contract ReferralLogic {
    IWorld public world;
    IReferralComponent public referralComponent;
    IPlayerComponent public playerProxy;

    uint256 public REFERRER_REWARD_POINTS = 100;
    uint256 public REFERRED_REWARD_POINTS = 50;

    event ReferralCompleted(address indexed referrer, address indexed referred);
    event RewardPointsUpdated(uint256 referrerPoints, uint256 referredPoints);

    constructor(
        address _world,
        address _referralComponent,
        address _playerProxy
    ) {
        world = IWorld(_world);
        referralComponent = IReferralComponent(_referralComponent);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Only admin can call");
        _;
    }

    function joinWithReferral(address referrer) external {
        address user = msg.sender;
        require(user != address(0), "Invalid user address");
        require(referrer != address(0), "Invalid referrer address");
        require(user != referrer, "Cannot refer self");
        require(user == msg.sender, "Only user can call");

        ReferralData memory userData = IReferralComponent(referralComponent)
            .getReferral(user);
        require(!userData.referred, "Already referred");

        ReferralData memory referrerData = IReferralComponent(referralComponent)
            .getReferral(referrer);

        // Update user data
        ReferralData memory newUserData = ReferralData({
            referred: true,
            referrer: referrer,
            referralCount: 0,
            totalPoints: REFERRED_REWARD_POINTS,
            lastReferralTime: block.timestamp,
            createdAt: block.timestamp
        });

        // Update referrer data
        ReferralData memory newReferrerData = ReferralData({
            referred: referrerData.referred,
            referrer: referrerData.referrer,
            referralCount: referrerData.referralCount + 1,
            totalPoints: referrerData.totalPoints + REFERRER_REWARD_POINTS,
            lastReferralTime: block.timestamp,
            createdAt: referrerData.createdAt
        });

        IReferralComponent(referralComponent).setReferral(user, newUserData);
        IReferralComponent(referralComponent).setReferral(
            referrer,
            newReferrerData
        );

        // Add Point rewards instead of Sunny
        playerProxy.addSunny(referrer, REFERRER_REWARD_POINTS);
        playerProxy.addSunny(user, REFERRED_REWARD_POINTS);

        emit ReferralCompleted(referrer, user);
    }

    function updateRewardPoints(
        uint256 referrerPoints,
        uint256 referredPoints
    ) external onlyAdmin {
        REFERRER_REWARD_POINTS = referrerPoints;
        REFERRED_REWARD_POINTS = referredPoints;
        emit RewardPointsUpdated(referrerPoints, referredPoints);
    }

    function getReferralInfo(
        address user
    ) external view returns (ReferralData memory) {
        return IReferralComponent(referralComponent).getReferral(user);
    }

    function getReferredUsers(
        address referrer
    ) external view returns (address[] memory) {
        return IReferralComponent(referralComponent).getReferredUsers(referrer);
    }
}
