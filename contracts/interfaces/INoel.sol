// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface INoelComponent {
    function setGift(address to, uint256 amount) external;
    function getGifts(address to) external view returns (uint256);

    function getGiftRedemptionMilestones() external view returns (uint256);
    function setGiftRedemptionMilestones(uint256 milestones) external;

    function getWaitingTime() external view returns (uint64);
    function setWaitingTime(uint64 _waitingTime) external;

    function getSpaceTime() external view returns (uint64);
    function setSpaceTime(uint64 _spaceTime) external;

    function setLastClaimTime(address _player, uint64 _time) external;
    function getLastClaimTime(address _player) external view returns (uint64);

    function setHasMinted(address _player, bool _status) external;
    function getHasMinted(address _player) external view returns (bool);
}
