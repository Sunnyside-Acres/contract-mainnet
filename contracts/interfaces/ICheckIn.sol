// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICheckInComponent {
    function setCheckInData(address _player, uint256 _lastTime, uint256 _streak) external;
    function getCheckInData(address _player) external view returns (uint256 lastTime, uint256 streak);
    function hasCheckedInToday(address _player) external view returns (bool);
}