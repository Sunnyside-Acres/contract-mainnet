// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/FleaSkinMarket.sol";

contract FleaSkinMarketComponent {
    address public world;
    address public implementation;

    mapping(uint256 => MarketListing) public listings;

    mapping(address => uint256[]) public sellerListings;
    mapping(uint256 => uint256[]) public skinListings;
    uint256[] public allListingIds;

    uint256[] public activeListingIds;
    mapping(uint256 => uint256) private activeListingIndex;

    // Save the position of ListingId in the allListingIds array
    mapping(uint256 => uint256) private allListingIndex;
    // Save the position of ListingId in the sellerListings array
    mapping(uint256 => uint256) private sellerListingIndex;
    // Save the position of ListingId in the skinListings array
    mapping(uint256 => uint256) private skinListingIndex;

    uint256 public listingCount;
    uint256 public commissionFeePercent;

    /// @notice Restricts access to authorized logic contracts only
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @notice Create a new market listing
     * @param _seller The address of the seller
     * @param _tokenId The ID of the token being sold
     * @param _price The price per skin
     * @param _skinType The type of the skin
     * @param _expiration The expiration time of the skin
     * @return The ID of the newly created listing
     */
    function createListing(
        address _seller,
        uint256 _tokenId,
        uint256 _price,
        string memory _skinType,
        uint256 _expiration
    ) external onlyAuthorized returns (uint256) {
        require(_price > 0, "Price must be greater than 0");
        require(_expiration > 0, "Expiration must be greater than 0");

        listingCount++;
        uint256 listingId = listingCount;

        MarketListing storage listing = listings[listingId];
        listing.id = listingId;
        listing.seller = _seller;
        listing.buyer = address(0);
        listing.tokenId = _tokenId;
        listing.price = _price;
        listing.skinType = _skinType;
        listing.listingTime = block.timestamp;
        listing.boughtTime = 0;
        listing.expirationTime = block.timestamp + _expiration;
        listing.isActive = true;
        listing.commissionFeePercent = commissionFeePercent;

        // Add & Track Index
        sellerListings[_seller].push(listingId);
        sellerListingIndex[listingId] = sellerListings[_seller].length - 1;

        skinListings[_tokenId].push(listingId);
        skinListingIndex[listingId] = skinListings[_tokenId].length - 1;

        allListingIds.push(listingId);
        allListingIndex[listingId] = allListingIds.length - 1;

        activeListingIds.push(listingId);
        activeListingIndex[listingId] = activeListingIds.length - 1;

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
        uint256 validCount = 0;
        for (uint256 i = 0; i < activeListingIds.length; i++) {
            if (
                listings[activeListingIds[i]].expirationTime > block.timestamp
            ) {
                validCount++;
            }
        }

        MarketListing[] memory result = new MarketListing[](validCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < activeListingIds.length; i++) {
            uint256 id = activeListingIds[i];
            if (listings[id].expirationTime > block.timestamp) {
                result[currentIndex] = listings[id];
                currentIndex++;
            }
        }

        return result;
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
     * @notice Get active listings by skin ID
     * @param _tokenId The token ID
     * @return Array of active MarketListing structs for the skin
     */
    function getListingsByTokenId(
        uint256 _tokenId
    ) external view returns (MarketListing[] memory) {
        uint256[] memory skinListingIds = skinListings[_tokenId];

        // Count active listings first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < skinListingIds.length; i++) {
            if (
                listings[skinListingIds[i]].isActive &&
                listings[skinListingIds[i]].expirationTime > block.timestamp
            ) {
                activeCount++;
            }
        }

        // Create array with correct size
        MarketListing[] memory skinListingsArray = new MarketListing[](
            activeCount
        );

        uint256 currentIndex = 0;
        for (uint256 i = 0; i < skinListingIds.length; i++) {
            if (
                listings[skinListingIds[i]].isActive &&
                listings[skinListingIds[i]].expirationTime > block.timestamp
            ) {
                skinListingsArray[currentIndex] = listings[skinListingIds[i]];
                currentIndex++;
            }
        }

        return skinListingsArray;
    }

    /**
     * @notice Update an existing listing
     * @param _listingId The ID of the listing to update
     * @param _price The new price
     * @param _expired The new duration in seconds
     */
    function updateListing(
        uint256 _listingId,
        uint256 _price,
        uint256 _expired
    ) external onlyAuthorized {
        require(listings[_listingId].id != 0, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");
        require(_price > 0, "Price must be greater than 0");
        require(_expired > 0, "Duration must be greater than 0");

        MarketListing storage listing = listings[_listingId];
        listing.price = _price;
        listing.expirationTime = block.timestamp + _expired;
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

        removeFromActiveArray(_listingId);

        // Remove from All Listings
        uint256 indexAll = allListingIndex[_listingId];
        uint256 lastIdAll = allListingIds[allListingIds.length - 1];

        allListingIds[indexAll] = lastIdAll; // Move last to current
        allListingIndex[lastIdAll] = indexAll; // Update index of moved item
        allListingIds.pop();
        delete allListingIndex[_listingId];

        // Remove from Seller Listings
        uint256 indexSeller = sellerListingIndex[_listingId];
        uint256[] storage sList = sellerListings[listing.seller];
        uint256 lastIdSeller = sList[sList.length - 1];

        sList[indexSeller] = lastIdSeller;
        sellerListingIndex[lastIdSeller] = indexSeller;
        sList.pop();
        delete sellerListingIndex[_listingId];

        // Remove from Skin Listings
        uint256 indexSkin = skinListingIndex[_listingId];
        uint256[] storage skList = skinListings[listing.tokenId];
        uint256 lastIdSkin = skList[skList.length - 1];

        skList[indexSkin] = lastIdSkin;
        skinListingIndex[lastIdSkin] = indexSkin;
        skList.pop();
        delete skinListingIndex[_listingId];

        // Delete Data
        delete listings[_listingId];
    }

    function removeFromActiveArray(uint256 _listingId) internal {
        uint256 index = activeListingIndex[_listingId];

        if (
            index < activeListingIds.length &&
            activeListingIds[index] == _listingId
        ) {
            uint256 lastId = activeListingIds[activeListingIds.length - 1];

            // Swap last element to the current position
            activeListingIds[index] = lastId;
            activeListingIndex[lastId] = index;

            // Pop the last element
            activeListingIds.pop();
            delete activeListingIndex[_listingId];
        }
    }

    /**
     * @notice Process a purchase from a listing
     * @param _listingId The ID of the listing
     * @param _buyer The buyer's address
     */
    function purchaseSkin(
        uint256 _listingId,
        address _buyer
    ) external onlyAuthorized {
        require(listings[_listingId].id != 0, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");
        require(
            listings[_listingId].expirationTime > block.timestamp,
            "Listing has expired"
        );
        require(
            _buyer != listings[_listingId].seller,
            "Cannot buy your own skin"
        );
        listings[_listingId].buyer = _buyer;
        listings[_listingId].boughtTime = block.timestamp;
        listings[_listingId].isActive = false;
        removeFromActiveArray(_listingId);
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

    function getCommissionFeePercent() external view returns (uint256) {
        return commissionFeePercent;
    }

    function setCommissionFeePercent(uint256 _percent) external onlyAuthorized {
        commissionFeePercent = _percent;
    }

    function getSoldListingsBySeller(address _seller) external view returns (MarketListing[] memory) {
        uint256[] memory sellerListingIds = sellerListings[_seller];
        uint256 soldCount = 0;
        for (uint256 i = 0; i < sellerListingIds.length; i++) {
            if (!listings[sellerListingIds[i]].isActive && listings[sellerListingIds[i]].buyer != address(0)) {
                soldCount++;
            }
        }

        MarketListing[] memory soldListings = new MarketListing[](soldCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < sellerListingIds.length; i++) {
            if (!listings[sellerListingIds[i]].isActive && listings[sellerListingIds[i]].buyer != address(0)) {
                soldListings[currentIndex] = listings[sellerListingIds[i]];
                currentIndex++;
            }
        }

        return soldListings;
    }
}
