// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";

contract NoelProxy {
    address public world;
    address public implementation;

    uint64 waitingTime = 5 minutes; 
    uint64 spaceTime = 2 hours;
    uint64 startTime = 1766534400; // GMT: Wednesday, 24 December 2025 00:00:00
    uint64 endTime = 1766707200; // GMT: Friday, 26 December 2025 00:00:00
    uint256 public giftRedemptionMilestones = 150;
    mapping(address => uint64) public lastClaimTime;
    mapping(address => uint256) public gifts;

    event ComponentUpdated(address indexed newImplementation);

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    constructor(address _world, address _implementation) {
        world = _world;
        implementation = _implementation;
    }

    function upgrade(address newImplementation) external onlyAdmin {
        implementation = newImplementation;
        emit ComponentUpdated(newImplementation);
    }

    fallback() external onlyAuthorized {
        address impl = implementation;
        require(impl != address(0), "No implementation set");
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)
            switch result
            case 0 {
                revert(ptr, size)
            }
            default {
                return(ptr, size)
            }
        }
    }
}
