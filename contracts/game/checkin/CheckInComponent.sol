// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";

contract CheckInComponent {
    address public world;
    address public admin;
    address public implementation;

    // Mapping save information check in
    // Address -> check in last time
    mapping(address => uint64) public lastCheckInTime;
    // Address -> current streak
    mapping(address => uint256) public currentStreak;

    event CheckInUpdated(
        address indexed player,
        uint256 timestamp,
        uint256 streak
    );

    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    function setCheckInData(
        address _player,
        uint64 _lastTime,
        uint256 _streak
    ) external onlyAuthorized {
        lastCheckInTime[_player] = _lastTime;
        currentStreak[_player] = _streak;
        emit CheckInUpdated(_player, _lastTime, _streak);
    }

    function getCheckInData(
        address _player
    ) external view returns (uint64 lastTime, uint256 streak) {
        return (lastCheckInTime[_player], currentStreak[_player]);
    }

    function hasCheckedInToday(address _player) external view returns (bool) {
        uint64 lastTime = lastCheckInTime[_player];
        if (lastTime == 0) return false;

        uint64 currentDay = uint64((block.timestamp) / 60);
        uint64 lastDay = (lastTime) / 60;
        // uint64 currentDay = uint64((block.timestamp) / 1 days);
        // uint64 lastDay = (lastTime) / 1 days;
        return currentDay == lastDay;
    }
}