//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";

contract NewYearComponent {
    address public world;
    address public implementation;
    uint64 public startTime;
    uint64 public endTime;
    mapping(address => bool) public hasMinted;

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[NewYearComponent] Unauthorized"
        );
        _;
    }

    function setHasMinted(
        address _player,
        bool _status
    ) external onlyAuthorized {
        hasMinted[_player] = _status;
    }

    function isMinted(address _player) external view returns (bool) {
        return hasMinted[_player];
    }

    function getStartTime() external view returns (uint64) {
        return startTime;
    }

    function setStartTime(uint64 _startTime) external onlyAuthorized {
        startTime = _startTime;
    }

    function getEndTime() external view returns (uint64) {
        return endTime;
    }

    function setEndTime(uint64 _endTime) external onlyAuthorized {
        require(_endTime > startTime, "End time must be after start time");
        endTime = _endTime;
    }

    function canClaimNFT() external view returns (bool) {
        uint64 currentTime = uint64(block.timestamp);
        return currentTime >= startTime && currentTime <= endTime;
    }
}
