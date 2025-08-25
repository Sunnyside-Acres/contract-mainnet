// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/FleaMarket.sol";

contract FleaMarketComponent {
    address public world;
    address public admin;
    address public implementation;

    // Mapping từ listing ID đến MarketListing
    mapping(uint256 => MarketListing) public listings;

    // Mapping từ player address đến danh sách listing IDs
    mapping(address => uint256[]) public sellerListings;

    // Mapping từ item ID đến danh sách listing IDs
    mapping(uint256 => uint256[]) public itemListings;

    // Mapping từ player address đến lịch sử giao dịch
    mapping(address => MarketTransaction[]) public transactionHistory;

    // Tổng số listing
    uint256 public listingCount;

    // Danh sách tất cả listing IDs
    uint256[] public allListingIds;

    // Thống kê thị trường
    MarketStats public marketStats;

      modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    function createListing(
        address _seller,
        uint256 _itemId,
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
        listing.itemId = _itemId;
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
        itemListings[_itemId].push(listingId);

        // Add to all listings
        allListingIds.push(listingId);

        // Update stats
        marketStats.totalListings++;
        marketStats.activeListings++;

        return listingId;
    }

    function getListing(
        uint256 _listingId
    ) external view returns (MarketListing memory) {
        require(listings[_listingId].id != 0, "Listing does not exist");
        return listings[_listingId];
    }

    function getAllListings() external view returns (MarketListing[] memory) {
        MarketListing[] memory allListings = new MarketListing[](
            allListingIds.length
        );

        for (uint256 i = 0; i < allListingIds.length; i++) {
            allListings[i] = listings[allListingIds[i]];
        }

        return allListings;
    }

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

    function getListingsBySeller(
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

    function getListingsByItem(
        uint256 _itemId
    ) external view returns (MarketListing[] memory) {
        uint256[] memory itemListingIds = itemListings[_itemId];

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

    function cancelListing(uint256 _listingId) external onlyAuthorized {
        require(listings[_listingId].id != 0, "Listing does not exist");
        require(listings[_listingId].isActive, "Listing is not active");

        listings[_listingId].isActive = false;
        marketStats.activeListings--;
    }

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

        // If quantity becomes 0, deactivate listing
        if (listing.quantity == 0) {
            listing.isActive = false;
            marketStats.activeListings--;
        }

        return true;
    }

    function addTransaction(
        uint256 _listingId,
        address _seller,
        address _buyer,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _price,
        uint256 _durability,
        uint256 _expiration
    ) external onlyAuthorized {
        MarketTransaction memory transaction = MarketTransaction({
            listingId: _listingId,
            seller: _seller,
            buyer: _buyer,
            itemId: _itemId,
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

    function getTransactionHistory(
        address _player
    ) external view returns (MarketTransaction[] memory) {
        return transactionHistory[_player];
    }

    function getMarketStats() external view returns (MarketStats memory) {
        return marketStats;
    }

    function getListingCount() external view returns (uint256) {
        return listingCount;
    }

    function exists(uint256 _listingId) external view returns (bool) {
        return listings[_listingId].id != 0;
    }

    function isListingActive(uint256 _listingId) external view returns (bool) {
        return
            listings[_listingId].isActive &&
            listings[_listingId].expirationTime > block.timestamp;
    }
}
