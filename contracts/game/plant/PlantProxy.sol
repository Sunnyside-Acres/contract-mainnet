// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Plant.sol";

contract PlantProxy {
    address public world;
    address public admin;
    address public implementation;

    // Mapping lưu trữ thông tin plant
    mapping(uint256 => Plant) public plants;

    // Mapping từ plotId đến danh sách plantId
    mapping(uint256 => uint256) public plotPlants;

    // Mapping từ owner đến danh sách plantId
    mapping(address => uint256[]) public ownerPlants;

    // Mapping từ plantId đến owner
    mapping(uint256 => address) public plantOwners;

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
