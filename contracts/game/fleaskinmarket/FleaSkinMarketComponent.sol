// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/FleaSkinMarket.sol";

contract FleaSkinMarketComponent {
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

    /// @notice Restricts access to authorized logic contracts only
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @notice Create a new market listing
     * @param _seller The address of the seller
     * @param _skinType The type of the skin being sold
     * @param _quantity The quantity of items
     * @param _price The price per item
     * @param _duration The listing duration in seconds
     * @param _durability The durability of the item
     * @param _expiration The expiration time of the item
     * @return The ID of the newly created listing
     */
    function createListing(
        address _seller,
        string memory _skinType,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration,
        uint256 _durability,
        uint256 _expiration
    ) external onlyAuthorized returns (uint256) {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        listingCount++;
        uint256 listingId = listingCount;

        MarketListing storage listing = listings[listingId];
        listing.id = listingId;
        listing.seller = _seller;
        listing.skinType = _skinType;
        listing.quantity = _quantity;
        listing.price = _price;
        listing.listingTime = block.timestamp;
        listing.expirationTime = block.timestamp + _duration;
        listing.isActive = true;
        listing.durability = _durability;
        listing.expiration = _expiration;

        // Add to seller's listings
        sellerListings[_seller].push(listingId);

        // Add to item's listings
        skinListings[_skinType].push(listingId);

        // Add to all listings
        allListingIds.push(listingId);

        // Update stats
        marketStats.totalListings++;
        marketStats.activeListings++;

        return listingId;
    }

    /**
     * @notice Get a listing by ID
     * @param _listingId The ID of the listing
     * @return The MarketListing struct
     */
    function getListing(
        uint256 _listingId
    ) external view returns (MarketListing memory) {
        require(listings[_listingId].id != 0, "Listing does not exist");
        return listings[_listingId];
    }

    /**
     * @notice Get all listings
     * @return Array of all MarketListing structs
     */
    function getAllListings() external view returns (MarketListing[] memory) {
        MarketListing[] memory allListings = new MarketListing[](
            allListingIds.length
        );

        for (uint256 i = 0; i < allListingIds.length; i++) {
            allListings[i] = listings[allListingIds[i]];
        }

        return allListings;
    }

    /**
     * @notice Get all active (non-expired) listings
     * @return Array of active MarketListing structs
     */
    function getActiveListings()
        external
        view
        returns (MarketListing[] memory)
    {
        uint256 activeCount = 0;

        // Count active listings
        for (uint256 i = 0; i < allListingIds.length; i++) {
            if (
                listings[allListingIds[i]].isActive &&
                listings[allListingIds[i]].expirationTime > block.timestamp
            ) {
                activeCount++;
            }
        }

        MarketListing[] memory activeListings = new MarketListing[](
            activeCount
        );
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < allListingIds.length; i++) {
            if (
                listings[allListingIds[i]].isActive &&
                listings[allListingIds[i]].expirationTime > block.timestamp
            ) {
                activeListings[currentIndex] = listings[allListingIds[i]];
                currentIndex++;
            }
        }

        return activeListings;
    }

    /**
     * @notice Get active listings by seller
     * @param _seller The seller's address
     * @return Array of active MarketListing structs for the seller
     */
    function getListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory) {
        uint256[] memory sellerListingIds = sellerListings[_seller];

        // Count active listings first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < sellerListingIds.length; i++) {
            if (
                listings[sellerListingIds[i]].isActive &&
                listings[sellerListingIds[i]].expirationTime > block.timestamp
            ) {
                activeCount++;
            }
        }

        // Create array with correct size
        MarketListing[] memory sellerListingsArray = new MarketListing[](
            activeCount
        );

        uint256 currentIndex = 0;
        for (uint256 i = 0; i < sellerListingIds.length; i++) {
            if (
                listings[sellerListingIds[i]].isActive &&
                listings[sellerListingIds[i]].expirationTime > block.timestamp
            ) {
                sellerListingsArray[currentIndex] = listings[
                    sellerListingIds[i]
                ];
                currentIndex++;
            }
        }

        return sellerListingsArray;
    }

    /**
     * @notice Get all listings by seller (including inactive ones) for viewing history
     * @param _seller The seller's address
     * @return Array of all MarketListing structs for the seller
     */
    function getAllListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory) {
        uint256[] memory sellerListingIds = sellerListings[_seller];
        MarketListing[] memory sellerListingsArray = new MarketListing[](
            sellerListingIds.length
        );

        for (uint256 i = 0; i < sellerListingIds.length; i++) {
            sellerListingsArray[i] = listings[sellerListingIds[i]];
        }

        return sellerListingsArray;
    }

    /**
     * @notice Get active listings by item ID
     * @param _skinType The skin type
     * @return Array of active MarketListing structs for the item
     */
    function getListingsByItem(
       string memory _skinType
    ) external view returns (MarketListing[] memory) {
        uint256[] memory itemListingIds = skinListings[_skinType];

        // Count active listings first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < itemListingIds.length; i++) {
            if (
                listings[itemListingIds[i]].isActive &&
                listings[itemListingIds[i]].expirationTime > block.timestamp
            ) {
                activeCount++;
            }
        }

        // Create array with correct size
        MarketListing[] memory itemListingsArray = new MarketListing[](
            activeCount
        );

        uint256 currentIndex = 0;
        for (uint256 i = 0; i < itemListingIds.length; i++) {
            if (
                listings[itemListingIds[i]].isActive &&
                listings[itemListingIds[i]].expirationTime > block.timestamp
            ) {
                itemListingsArray[currentIndex] = listings[itemListingIds[i]];
                currentIndex++;
            }
        }

        return itemListingsArray;
    }

    /**
     * @notice Update an existing listing
     * @param _listingId The ID of the listing to update
     * @param _quantity The new quantity
     * @param _price The new price
     * @param _duration The new duration in seconds
     */
    function updateListing(
        uint256 _listingId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration
    ) external onlyAuthorized {
        require(listings[_listingId].id != 0, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        MarketListing storage listing = listings[_listingId];
        listing.quantity = _quantity;
        listing.price = _price;
        listing.expirationTime = block.timestamp + _duration;
    }

    /**
     * @notice Cancel a listing
     * @param _listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 _listingId) external onlyAuthorized {
        require(listings[_listingId].id != 0, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");

        // Use removeListing to completely remove the listing
        removeListing(_listingId);
    }

    /**
     * @dev Remove a listing completely from the system (internal function)
     * @param _listingId The ID of the listing to remove
     */
    function removeListing(uint256 _listingId) internal {
        require(listings[_listingId].id != 0, "Listing does not exist");

        MarketListing storage listing = listings[_listingId];

        // Deactivate listing
        listing.isActive = false;
        marketStats.activeListings--;

        // Remove from seller's listings array
        uint256[] storage sellerListingIds = sellerListings[listing.seller];
        for (uint256 i = 0; i < sellerListingIds.length; i++) {
            if (sellerListingIds[i] == _listingId) {
                // Move last element to current position and remove last
                sellerListingIds[i] = sellerListingIds[
                    sellerListingIds.length - 1
                ];
                sellerListingIds.pop();
                break;
            }
        }

        // Remove from item's listings array
        uint256[] storage itemListingIds = skinListings[listing.skinType];
        for (uint256 i = 0; i < itemListingIds.length; i++) {
            if (itemListingIds[i] == _listingId) {
                // Move last element to current position and remove last
                itemListingIds[i] = itemListingIds[itemListingIds.length - 1];
                itemListingIds.pop();
                break;
            }
        }

        // Remove from all listings array
        for (uint256 i = 0; i < allListingIds.length; i++) {
            if (allListingIds[i] == _listingId) {
                // Move last element to current position and remove last
                allListingIds[i] = allListingIds[allListingIds.length - 1];
                allListingIds.pop();
                break;
            }
        }

        // Clear the listing data completely
        delete listings[_listingId];
    }

     /**
     * @notice Process a purchase from a listing
     * @param _listingId The ID of the listing
     * @param _buyer The buyer's address
     * @param _quantity The quantity to purchase
     * @return True if purchase was successful
     */
    function purchaseItem(
        uint256 _listingId,
        address _buyer,
        uint256 _quantity
    ) external onlyAuthorized returns (bool) {
        require(listings[_listingId].id != 0, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");
        require(
            listings[_listingId].expirationTime > block.timestamp,
            "Listing has expired"
        );
        require(
            listings[_listingId].quantity >= _quantity,
            "Not enough items available"
        );
        require(
            _buyer != listings[_listingId].seller,
            "Cannot buy your own item"
        );

        MarketListing storage listing = listings[_listingId];

        // Update listing quantity
        listing.quantity -= _quantity;

        // If quantity becomes 0, remove listing completely
        if (listing.quantity == 0) {
            removeListing(_listingId);
        }

        return true;
    }

    /**
     * @notice Add a transaction to history
     * @param _listingId The ID of the listing
     * @param _seller The seller's address
     * @param _buyer The buyer's address
     * @param _skinType The skin type
     * @param _quantity The quantity purchased
     * @param _price The price per item
     * @param _durability The item durability
     * @param _expiration The item expiration
     */
    function addTransaction(
        uint256 _listingId,
        address _seller,
        address _buyer,
         string memory _skinType,
        uint256 _quantity,
        uint256 _price,
        uint256 _durability,
        uint256 _expiration
    ) external onlyAuthorized {
        MarketTransaction memory transaction = MarketTransaction({
            listingId: _listingId,
            seller: _seller,
            buyer: _buyer,
            skinType: _skinType,
            quantity: _quantity,
            price: _price,
            transactionTime: block.timestamp,
            durability: _durability,
            expiration: _expiration
        });

        // Add to buyer's transaction history
        transactionHistory[_buyer].push(transaction);

        // Add to seller's transaction history
        transactionHistory[_seller].push(transaction);

        // Update market stats
        marketStats.totalTransactions++;
        marketStats.totalVolume += _price * _quantity;
    }

    /**
     * @notice Get a player's transaction history
     * @param _player The player's address
     * @return Array of MarketTransaction structs for the player
     */
    function getTransactionHistory(
        address _player
    ) external view returns (MarketTransaction[] memory) {
        return transactionHistory[_player];
    }

    /**
     * @notice Get market statistics
     * @return The MarketStats struct
     */
    function getMarketStats() external view returns (MarketStats memory) {
        return marketStats;
    }

    /**
     * @notice Get the total number of listings
     * @return The total listing count
     */
    function getListingCount() external view returns (uint256) {
        return listingCount;
    }

    /**
     * @notice Check if a listing exists
     * @param _listingId The ID of the listing
     * @return True if the listing exists, false otherwise
     */
    function exists(uint256 _listingId) external view returns (bool) {
        return listings[_listingId].id != 0;
    }

    /**
     * @notice Check if a listing is active and not expired
     * @param _listingId The ID of the listing
     * @return True if the listing is active and not expired, false otherwise
     */
    function isListingActive(uint256 _listingId) external view returns (bool) {
        return
            listings[_listingId].isActive &&
            listings[_listingId].expirationTime > block.timestamp;
    }
}
