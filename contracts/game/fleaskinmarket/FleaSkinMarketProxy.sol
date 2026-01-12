// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/FleaSkinMarket.sol";

contract FleaSkinMarketProxy {
    address public world;
    address public implementation;

    mapping(uint256 => MarketListing) public listings;
    
    mapping(address => uint256[]) public sellerListings;
    mapping(uint256 => uint256[]) public skinListings;
    uint256[] public allListingIds;

    // Save the position of ListingId in the allListingIds array
    mapping(uint256 => uint256) private allListingIndex; 
    // Save the position of ListingId in the sellerListings array
    mapping(uint256 => uint256) private sellerListingIndex; 
    // Save the position of ListingId in the skinListings array
    mapping(uint256 => uint256) private skinListingIndex; 

    uint256 public listingCount;
    uint256 public commissionFeePercent;
    
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
