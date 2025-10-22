// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Dungeon.sol";

/**
 * @title DungeonProxy
 * @author RYG.Labs
 * @notice Proxy contract cho hệ thống Dungeon sử dụng delegatecall pattern
 * @dev Delegates all calls to the implementation contract while maintaining storage
 */
contract DungeonProxy {
    /// @notice Address của World contract để kiểm soát quyền truy cập
    address public world;
    /// @notice Address của admin
    address public admin;
    /// @notice Address của implementation logic contract
    address public implementation;

    /// @notice Mapping từ dungeon ID đến Dungeon struct
    mapping(uint256 => DungeonStructs.Dungeon) public dungeons;
    /// @notice Array của tất cả dungeon IDs
    uint256[] public dungeonIds;
    /// @notice Mapping để kiểm tra dungeon có tồn tại không
    mapping(uint256 => bool) public dungeonExists;
    /// @notice Tổng số dungeon đã tạo
    uint256 public dungeonCount;

    /// @notice Mapping từ player address đến dungeon progress
    mapping(address => mapping(uint256 => DungeonStructs.PlayerDungeonProgress))
        public playerDungeonProgress;

    /// @notice Emitted khi implementation được upgrade
    event ComponentUpdated(address indexed newImplementation);

    /// @notice Chỉ cho phép admin truy cập
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Chỉ cho phép logic contracts được ủy quyền truy cập
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @notice Constructor để khởi tạo proxy
     * @param _world Address của World contract
     * @param _admin Address của admin
     * @param _implementation Address của implementation ban đầu
     */
    constructor(address _world, address _admin, address _implementation) {
        world = _world;
        admin = _admin;
        implementation = _implementation;
    }

    /**
     * @notice Upgrade implementation contract
     * @param newImplementation Address của implementation mới
     */
    function upgrade(address newImplementation) external onlyAdmin {
        implementation = newImplementation;
        emit ComponentUpdated(newImplementation);
    }

    /**
     * @notice Fallback function để delegate calls đến implementation
     */
    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "Implementation not set");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /**
     * @notice Receive function để nhận ETH
     */
    receive() external payable {}
}
