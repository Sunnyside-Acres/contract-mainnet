// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../struct/Referral.sol";
import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IReferral.sol";

/**
 * @title ReferralLogic
 * @author RYG.Labs
 * @notice Logic contract for the Referral system
 * @dev Handles referral relationships and reward distribution
 */
contract ReferralLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice Referral component contract
    IReferralComponent public referralComponent;
    /// @notice Player component contract
    IPlayerComponent public playerProxy;

    /// @notice Reward points for the referrer
    uint256 public REFERRER_REWARD_POINTS = 100;
    /// @notice Reward points for the referred user
    uint256 public REFERRED_REWARD_POINTS = 50;

    /// @notice Emitted when a referral is completed
    event ReferralCompleted(address indexed referrer, address indexed referred);
    /// @notice Emitted when reward points are updated
    event RewardPointsUpdated(uint256 referrerPoints, uint256 referredPoints);

    /**
     * @notice Constructor to initialize the referral logic contract
     * @param _world The address of the World contract
     * @param _referralComponent The address of the Referral component
     * @param _playerProxy The address of the Player component
     */
    constructor(
        address _world,
        address _referralComponent,
        address _playerProxy
    ) {
        world = IWorld(_world);
        referralComponent = IReferralComponent(_referralComponent);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    /// @notice Restricts access to admin only
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Only admin can call");
        _;
    }

    /**
     * @notice Join the game with a referral code
     * @dev Rewards both the referrer and the referred user
     * @param referrer The address of the referrer
     */
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

    /**
     * @notice Update reward points for referrals (admin only)
     * @param referrerPoints The new reward points for referrers
     * @param referredPoints The new reward points for referred users
     */
    function updateRewardPoints(
        uint256 referrerPoints,
        uint256 referredPoints
    ) external onlyAdmin {
        REFERRER_REWARD_POINTS = referrerPoints;
        REFERRED_REWARD_POINTS = referredPoints;
        emit RewardPointsUpdated(referrerPoints, referredPoints);
    }

    /**
     * @notice Get referral information for a user
     * @param user The user's address
     * @return The user's referral data
     */
    function getReferralInfo(
        address user
    ) external view returns (ReferralData memory) {
        return IReferralComponent(referralComponent).getReferral(user);
    }

    /**
     * @notice Get all users referred by a specific referrer
     * @param referrer The referrer's address
     * @return Array of addresses referred by the referrer
     */
    function getReferredUsers(
        address referrer
    ) external view returns (address[] memory) {
        return IReferralComponent(referralComponent).getReferredUsers(referrer);
    }
}
