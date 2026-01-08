// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/FleaSkinMarket.sol";

contract FleaSkinMarketProxy {
    /// @notice Address of the World contract for access control
    address public world;

    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from listing ID to MarketListing
    mapping(uint256 => MarketListing) public listings;

    /// @notice Mapping from player address to their listing IDs
    mapping(address => uint256[]) public sellerListings;

    /// @notice Mapping from type skin to listing IDs for that skin
    mapping(string => uint256[]) public skinListings;
    
    /// @notice Mapping from player address to their transaction history
    mapping(address => MarketTransaction[]) public transactionHistory;

    /// @notice Total number of listings created
    uint256 public listingCount;

    /// @notice Array of all listing IDs
    uint256[] public allListingIds;

    /// @notice Market statistics
    MarketStats public marketStats;

    /// @notice Emitted when the implementation is upgraded
    /// @param newImplementation The address of the new implementation
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
     * @param _implementation The address of the initial implementation
     */
    constructor(address _world, address _implementation) {
        world = _world;
        implementation = _implementation;
    }

    /**
     * @notice Upgrade the implementation contract
     * @dev Only callable by admin
     * @param newImplementation The address of the new implementation contract
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
