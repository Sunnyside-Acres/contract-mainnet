// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Automation.sol";
import "../../interfaces/IWorld.sol";

contract AutomationProxy {
    address public world;
    address public implementation;
    uint256 public maxFactory = 6;

    // Mapping: Player Address => Factory Index => Factory State
    // Exp: Every player can have multiple factories identified by an index
    mapping(address => mapping(uint256 => FactoryState)) public userFactories;
    mapping(uint256 => uint256) public factoryPrices;

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
