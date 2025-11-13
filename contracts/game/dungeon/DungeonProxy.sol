// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Dungeon.sol";

/**
 * @title DungeonProxy
 * @author RYG.Labs
 * @notice Proxy contract for Dungeon system using delegatecall pattern
 * @dev Delegates all calls to the implementation contract while maintaining storage
 */
contract DungeonProxy {
    /// @notice World contract address for access control
    address public world;
    /// @notice Admin address
    address public admin;
    /// @notice Implementation logic contract address
    address public implementation;

    /// @notice Mapping from dungeon ID to Dungeon struct
    mapping(uint256 => DungeonStructs.Dungeon) public dungeons;
    /// @notice Array of all dungeon IDs
    uint256[] public dungeonIds;
    /// @notice Mapping to check if dungeon exists
    mapping(uint256 => bool) public dungeonExists;
    /// @notice Total number of dungeons created
    uint256 public dungeonCount;

    /// @notice Mapping from player address to dungeon progress
    mapping(address => mapping(uint256 => DungeonStructs.PlayerDungeonProgress))
        public playerDungeonProgress;

    /// @notice Mapping from session ID to DungeonSession
    mapping(uint256 => DungeonStructs.DungeonSession) public dungeonSessions;
    /// @notice Mapping from player address to session IDs
    mapping(address => uint256[]) public playerSessions;
    /// @notice Total number of sessions created
    uint256 public sessionCount;

    /// @notice Emitted when implementation is upgraded
    event ComponentUpdated(address indexed newImplementation);

    /// @notice Only allows admin access
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Only allows authorized logic contracts to access
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @notice Constructor to initialize proxy
     * @param _world World contract address
     * @param _admin Admin address
     * @param _implementation Initial implementation address
     */
    constructor(address _world, address _admin, address _implementation) {
        world = _world;
        admin = _admin;
        implementation = _implementation;
    }

    /**
     * @notice Upgrade implementation contract
     * @param newImplementation New implementation address
     */
    function upgrade(address newImplementation) external onlyAdmin {
        implementation = newImplementation;
        emit ComponentUpdated(newImplementation);
    }

    /**
     * @notice Fallback function that delegates all calls to the implementation
     * @dev Uses delegatecall to maintain proxy storage context
     */
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
