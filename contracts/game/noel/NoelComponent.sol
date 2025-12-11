// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";

contract NoelComponent {
    address public world;
    address public implementation;

    uint64 waitingTime;
    uint64 spaceTime;
    uint256 public giftRedemptionMilestones;
    mapping(address => uint64) public lastClaimTime;
    mapping(address => uint256) public gifts;
    mapping(address => bool) public hasMinted;

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[NoelComponent] Unauthorized"
        );
        _;
    }

    function setGift(address to, uint256 amount) external onlyAuthorized {
        gifts[to] += amount;
    }

    function getGifts(address to) external view returns (uint256) {
        return gifts[to];
    }

    function getGiftRedemptionMilestones() external view returns (uint256) {
        return giftRedemptionMilestones;
    }

    function setGiftRedemptionMilestones(
        uint256 milestones
    ) external onlyAuthorized {
        giftRedemptionMilestones = milestones;
    }

    function getWaitingTime() external view returns (uint64) {
        return waitingTime;
    }

    function setWaitingTime(uint64 _waitingTime) external onlyAuthorized {
        require(_waitingTime < spaceTime, "Invalid waiting time: exceeds space time");
        waitingTime = _waitingTime;
    }

    function getSpaceTime() external view returns (uint64) {
        return spaceTime;
    }

    function setSpaceTime(uint64 _spaceTime) external onlyAuthorized {
        spaceTime = _spaceTime;
    }

    function setLastClaimTime(
        address _player,
        uint64 _time
    ) external onlyAuthorized {
        lastClaimTime[_player] = _time;
    }

    function getLastClaimTime(address _player) external view returns (uint64) {
        return lastClaimTime[_player];
    }

    function setHasMinted(address _player, bool _status) external onlyAuthorized {
        hasMinted[_player] = _status;
    }

    function getHasMinted(address _player) external view returns (bool) {
        return hasMinted[_player];
    }
}
