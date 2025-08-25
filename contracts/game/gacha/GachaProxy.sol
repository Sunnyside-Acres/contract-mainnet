// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IGacha.sol";
import "../../struct/Gacha.sol";

/**
 * @title GachaProxy
 * @dev Proxy contract cho hệ thống Gacha - tương tác với logic contract
 *
 * Tính năng chính:
 * - Delegate calls đến logic contract
 * - Quản lý upgrade logic contract
 * - Tương tác với gacha system
 */
contract GachaProxy {
    address public world;
    address public admin;
    address public implementation;

    // ============ STORAGE ============
    uint256 public nextPoolId = 1;
    uint256 public nextPullId = 1;

    // Mapping từ poolId đến GachaPool
    mapping(uint256 => GachaStructs.GachaPool) public gachaPools;

    // Mapping từ poolId đến danh sách items
    mapping(uint256 => GachaStructs.GachaItem[]) public gachaItems;

    // Mapping từ poolId và itemId đến GachaItem
    mapping(uint256 => mapping(uint256 => GachaStructs.GachaItem))
        public gachaItemMap;

    // Mapping từ pullId đến GachaResult
    mapping(uint256 => GachaStructs.GachaResult) public gachaResults;

    // Mapping từ player address đến PlayerGachaStats
    mapping(address => GachaStructs.PlayerGachaStats) public playerStats;

    // Mapping từ poolId đến GachaPoolStats
    mapping(uint256 => GachaStructs.GachaPoolStats) public poolStats;

    // Danh sách tất cả pool IDs
    uint256[] public allPoolIds;

    // Danh sách active pool IDs
    uint256[] public activePoolIds;

    // ============ EVENTS ============
    event ComponentUpdated(address indexed newImplementation);

    // ============ MODIFIERS ============
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

    fallback() external payable onlyAuthorized {
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

    /**
     * @dev Receive function để nhận ETH
     */
    receive() external payable {
        // Không làm gì cả, chỉ nhận ETH
    }
}
