// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Raising.sol";

contract RaisingProxy {
    address public world;
    address public admin;
    address public implementation;

    // Mapping lưu trữ thông tin raising
    mapping(uint256 => Raising) public raisings;
    // Mapping từ owner đến danh sách raisingId
    mapping(address => uint256[]) public ownerRaising;
    // Mapping từ raisingId đến owner
    mapping(uint256 => address) public raisingOwners;

    event ComponentUpdated(address indexed newImplementation);

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    constructor(address _world, address _admin, address _implementation) {
        world = _world;
        admin = _admin;
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
