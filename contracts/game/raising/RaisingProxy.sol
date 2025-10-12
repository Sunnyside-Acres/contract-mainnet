// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Raising.sol";

/**
 * @title RaisingProxy
 * @author RYG.Labs
 * @notice Proxy contract for the Animal Raising system using delegatecall pattern
 * @dev Delegates all calls to the implementation contract while maintaining storage
 */
contract RaisingProxy {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping to store raising information
    mapping(uint256 => Raising) public raisings;
    /// @notice Mapping from owner address to their raising IDs
    mapping(address => uint256[]) public ownerRaising;
    /// @notice Mapping from raising ID to owner address
    mapping(uint256 => address) public raisingOwners;

    /// @notice Emitted when the implementation is upgraded
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
