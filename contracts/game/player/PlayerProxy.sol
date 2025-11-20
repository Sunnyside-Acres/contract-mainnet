// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";

/**
 * @title PlayerProxy
 * @author RYG.Labs
 * @notice Proxy contract for the Player system using delegatecall pattern
 * @dev Delegates all calls to the implementation contract while maintaining storage
 */
contract PlayerProxy {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from player address to Player struct
    mapping(address => Player) public players;
    /// @notice Array of all player addresses
    address[] public playerAddresses;
    /// @notice Mapping to check if player exists
    mapping(address => bool) public playerExists;

    event PlayerCreated(address indexed playerAddress, string name);
    event AddSunlight(address indexed playerAddress, uint256 amount);
    event AddSunny(address indexed playerAddress, uint256 amount);
    event AddPoint(address indexed playerAddress, uint256 amount);
    event SubtractSunny(address indexed playerAddress, uint256 amount);
    event SubtractSunlight(address indexed playerAddress, uint256 amount);
    event SubtractPoint(address indexed playerAddress, uint256 amount);
    event ComponentUpdated(address indexed newImplementation);

    /// @notice Restricts access to admin only
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Restricts access to authorized logic contracts only
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @notice Constructor to initialize the proxy
     * @param _world The address of the World contract
     * @param _admin The address of the admin
     * @param _implementation The address of the initial implementation
     */
    constructor(address _world, address _admin, address _implementation) {
        world = _world;
        admin = _admin;
        implementation = _implementation;
    }

    /**
     * @notice Upgrade the implementation contract
     * @param newImplementation The address of the new implementation
     */
    function upgrade(address newImplementation) external onlyAdmin {
        implementation = newImplementation;
        emit ComponentUpdated(newImplementation);
    }

    /// @notice Fallback function that delegates all calls to the implementation
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
