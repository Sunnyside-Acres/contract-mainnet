// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ICheckIn.sol";
import "../../interfaces/IInventory.sol";
import "../../struct/Inventory.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/CheckIn.sol";

contract CheckInLogic {
    IWorld public world;
    IInventoryComponent public inventoryProxy;
    ICheckInComponent public checkInProxy;
    IPlayerComponent public playerProxy;

    // 28-day cycle constant
    uint256 public constant CYCLE_DAYS = 28;

    // Mapping 1: Basic Daily Rewards (Day 1 -> Day 28)
    mapping(uint256 => RewardInfo) public dailyRewards;

    // Mapping 2: Additional rewards at milestones (Example: Key 7, 14, 28)
    mapping(uint256 => RewardInfo) public milestoneRewards;

    event CheckedIn(
        address indexed player,
        uint256 cycleDay,
        uint256 totalStreak
    );
    event RewardDistributed(
        address indexed player,
        string rewardType,
        uint256 itemId,
        uint256 quantity,
        uint256 sunlight
    );
    event RewardConfigured(
        uint256 dayIndex,
        uint256 itemId,
        uint256 quantity,
        uint256 sunlight,
        bool isMilestone
    );
    event RewardDailyConfiguredAll(
        uint256[] itemId,
        uint256[] quantity,
        uint256[] sunlight
    );
    event RewardMilestoneConfiguredAll(
        uint256[] dayIndex,
        uint256[] itemId,
        uint256[] quantity,
        uint256[] sunlight
    );

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(
        address _world,
        address _inventoryProxy,
        address _checkInProxy,
        address _playerProxy
    ) {
        world = IWorld(_world);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        checkInProxy = ICheckInComponent(_checkInProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    /**
     * @notice Take roll call
     */
    function checkIn() external {
        address player = msg.sender;

        require(
            !checkInProxy.hasCheckedInToday(player),
            "Already checked in today"
        );

        (uint64 lastTime, uint256 currentStreak) = checkInProxy.getCheckInData(
            player
        );

        uint256 newStreak;

        if (lastTime == 0) {
            newStreak = 1;
        } else {
            uint64 daysDiff = (uint64(block.timestamp) / 60) - (lastTime / 60);
            // uint64 daysDiff = (uint64(block.timestamp) / 1 days) - (lastTime / 1 days);
            if (daysDiff == 1) {
                newStreak = currentStreak + 1;
            } else {
                newStreak = 1;
            }
        }

        // Calculate days in a 28 day cycle
        // Example: Streak 1 -> Day 1. Streak 28 -> Day 28. Streak 29 -> Day 1.
        uint256 cycleDay = ((newStreak - 1) % CYCLE_DAYS) + 1;

        // Daily Reward
        RewardInfo memory daily = dailyRewards[cycleDay];
        if (daily.itemId > 0 || daily.sunlight > 0) {
            _distributeReward(player, daily);
            emit RewardDistributed(
                player,
                "DAILY",
                daily.itemId,
                daily.quantity,
                daily.sunlight
            );
        }

        // Milestone Reward - Accumulate if milestone is reached
        // On day 7, 14, 28, user will receive BOTH daily reward AND milestone reward
        RewardInfo memory milestone = milestoneRewards[cycleDay];
        if (milestone.itemId > 0 || milestone.sunlight > 0) {
            _distributeReward(player, milestone);
            emit RewardDistributed(
                player,
                "MILESTONE",
                milestone.itemId,
                milestone.quantity,
                daily.sunlight
            );
        }

        // Save check in data
        checkInProxy.setCheckInData(player, uint64(block.timestamp), newStreak);

        emit CheckedIn(player, cycleDay, newStreak);
    }

    /**
     * @notice Internal function to pay reward to inventory
     */
    function _distributeReward(
        address _player,
        RewardInfo memory _reward
    ) internal {
        if (_reward.itemId > 0 && _reward.quantity > 0) {
            bool exists = inventoryProxy.exists(_player, _reward.itemId);
            if (exists) {
                InventoryItem memory item = inventoryProxy.getItem(
                    _player,
                    _reward.itemId
                );
                inventoryProxy.setItem(
                    _player,
                    _reward.itemId,
                    item.quantity + _reward.quantity,
                    item.durability,
                    item.expiration
                );
            } else {
                inventoryProxy.setItem(
                    _player,
                    _reward.itemId,
                    _reward.quantity,
                    100,
                    0
                );
            }
        }

        if (_reward.sunlight > 0) {
            playerProxy.addSunlight(_player, _reward.sunlight);
        }
    }

    /**
     * @notice Get daily rewards and milestones
     */
    function getDailyRewardsAndMilestones()
        external
        view
        returns (FullDayReward[] memory)
    {
        FullDayReward[] memory allRewards = new FullDayReward[](CYCLE_DAYS);
        for (uint256 i = 0; i < CYCLE_DAYS; i++) {
            uint256 currentDay = i + 1;

            allRewards[i] = FullDayReward({
                dayIndex: currentDay,
                daily: dailyRewards[currentDay],
                milestone: milestoneRewards[currentDay]
            });
        }
        return allRewards;
    }

    /**
     * @notice Check if player has checked in today
     */
    function hasCheckedInToday() external view returns (bool) {
        return checkInProxy.hasCheckedInToday(msg.sender);
    }

    /**
     * @notice Get check in data
     */
    function getCheckInData()
        external
        view
        returns (uint64 lastTime, uint256 streak, uint256 cycleDay)
    {
        (uint64 lastTimes, uint256 currentStreak) = checkInProxy.getCheckInData(
            msg.sender
        );
        uint256 day;

        if (currentStreak == 0) {
            day = 1;
        } else {
            day = ((currentStreak - 1) % CYCLE_DAYS) + 1;
        }
        return (uint64(lastTimes), currentStreak, day);
    }

    /**
     * @notice Daily Gift Configuration
     */
    function setDailyReward(
        uint256 _dayIndex,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _sunlight
    ) external onlyAdmin {
        require(
            _dayIndex >= 1 && _dayIndex <= CYCLE_DAYS,
            "Invalid day index (1-28)"
        );
        dailyRewards[_dayIndex] = RewardInfo(_itemId, _quantity, _sunlight);
        emit RewardConfigured(_dayIndex, _itemId, _quantity, _sunlight, false);
    }

    /**
     * @notice Milestone gift configuration (Streak 7, 14, 28...)
     */
    function setMilestoneReward(
        uint256 _dayIndex,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _sunlight
    ) external onlyAdmin {
        require(
            _dayIndex >= 1 && _dayIndex <= CYCLE_DAYS,
            "Invalid day index (1-28)"
        );
        milestoneRewards[_dayIndex] = RewardInfo(_itemId, _quantity, _sunlight);
        emit RewardConfigured(_dayIndex, _itemId, _quantity, _sunlight, true);
    }

    /**
     * @notice Configure all gifts (Daily + Milestone)
     * @dev Helps save setup time and gas deployment
     * * @param _dItemIds Array containing 28 ItemIds for daily gifts (index 0 -> day 1)
     * @param _dQuantities Array containing 28 corresponding item quantities
     * @param _dSunlights Array containing 28 corresponding sunlight quantities
     * * @param _mDays Array containing days with milestone gifts (Example: [7, 14, 28])
     * @param _mItemIds Array containing ItemIds for milestone gifts
     * @param _mQuantities Array containing milestone item quantities
     * @param _mSunlights Array containing milestone sunlight
     */
    function configureFullCycle(
        uint256[] calldata _dItemIds,
        uint256[] calldata _dQuantities,
        uint256[] calldata _dSunlights,
        uint256[] calldata _mDays,
        uint256[] calldata _mItemIds,
        uint256[] calldata _mQuantities,
        uint256[] calldata _mSunlights
    ) external onlyAdmin {
        require(
            _dItemIds.length == CYCLE_DAYS,
            "Daily items length must contain 28 days"
        );
        require(
            _dQuantities.length == CYCLE_DAYS,
            "Daily quantities length mismatch"
        );
        require(
            _dSunlights.length == CYCLE_DAYS,
            "Daily sunlights length mismatch"
        );

        require(
            _mDays.length == _mItemIds.length &&
                _mDays.length == _mQuantities.length &&
                _mDays.length == _mSunlights.length,
            "Milestone arrays length mismatch"
        );

        for (uint256 i = 0; i < CYCLE_DAYS; i++) {
            uint256 dayIndex = i + 1;

            dailyRewards[dayIndex] = RewardInfo(
                _dItemIds[i],
                _dQuantities[i],
                _dSunlights[i]
            );
        }
        emit RewardDailyConfiguredAll(_dItemIds, _dQuantities, _dSunlights);

        for (uint256 i = 0; i < _mDays.length; i++) {
            uint256 dayIndex = _mDays[i];
            require(
                dayIndex >= 1 && dayIndex <= CYCLE_DAYS,
                "Invalid milestone day"
            );

            milestoneRewards[dayIndex] = RewardInfo(
                _mItemIds[i],
                _mQuantities[i],
                _mSunlights[i]
            );
        }
        emit RewardMilestoneConfiguredAll(
            _mDays,
            _mItemIds,
            _mQuantities,
            _mSunlights
        );
    }
}
