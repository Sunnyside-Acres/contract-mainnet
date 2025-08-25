// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Crafting.sol";

contract CraftingProxy {
    address public world;
    address public admin;
    address public implementation;
    // Mapping từ recipe ID đến CraftingRecipe
    mapping(uint256 => CraftingRecipe) public recipes;

    // Mapping từ player address đến lịch sử crafting
    mapping(address => CraftingHistory[]) public craftingHistories;

    // Tổng số recipe
    uint256 public recipeCount;

    // Danh sách tất cả recipe IDs
    uint256[] public allRecipeIds;

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
