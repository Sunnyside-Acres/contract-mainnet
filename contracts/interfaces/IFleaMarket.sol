// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/FleaMarket.sol";

/**
 * @title IFleaMarketComponent
 * @notice Interface for managing player-to-player marketplace listings
 */
interface IFleaMarketComponent {
    /**
     * @notice Creates a new marketplace listing
     * @param _seller Address of the seller
     * @param _itemId ID of the item being sold
     * @param _quantity Quantity of items for sale
     * @param _price Price per unit in sunlight
     * @param _duration Duration the listing is active (in seconds)
     * @param _durability Durability of the item
     * @param _expiration Expiration timestamp of the item
     * @return uint256 ID of the created listing
     */
    function createListing(
        address _seller,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration,
        uint256 _durability,
        uint256 _expiration
    ) external returns (uint256);

    /**
     * @notice Gets details of a specific listing
     * @param _listingId ID of the listing
     * @return MarketListing struct containing listing details
     */
    function getListing(
        uint256 _listingId
    ) external view returns (MarketListing memory);

    /**
     * @notice Gets all marketplace listings
     * @return Array of all MarketListing structs
     */
    function getAllListings() external view returns (MarketListing[] memory);

    /**
     * @notice Gets all active marketplace listings
     * @return Array of active MarketListing structs
     */
    function getActiveListings() external view returns (MarketListing[] memory);

    /**
     * @notice Gets active listings by a specific seller
     * @param _seller Address of the seller
     * @return Array of active MarketListing structs
     */
    function getListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory);

    /**
     * @notice Gets all listings (including inactive) by a specific seller
     * @param _seller Address of the seller
     * @return Array of all MarketListing structs by seller
     */
    function getAllListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory);

    /**
     * @notice Gets all active listings for a specific item
     * @param _itemId ID of the item
     * @return Array of MarketListing structs for the item
     */
    function getListingsByItem(
        uint256 _itemId
    ) external view returns (MarketListing[] memory);

    /**
     * @notice Updates an existing listing
     * @param _listingId ID of the listing to update
     * @param _quantity New quantity
     * @param _price New price
     * @param _duration New duration
     */
    function updateListing(
        uint256 _listingId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration
    ) external;

    /**
     * @notice Cancels a listing
     * @param _listingId ID of the listing to cancel
     */
    function cancelListing(uint256 _listingId) external;

    /**
     * @notice Purchases items from a listing
     * @param _listingId ID of the listing
     * @param _buyer Address of the buyer
     * @param _quantity Quantity to purchase
     * @return bool True if purchase was successful
     */
    function purchaseItem(
        uint256 _listingId,
        address _buyer,
        uint256 _quantity
    ) external returns (bool);

    /**
     * @notice Adds a transaction record to history
     * @param _listingId ID of the listing
     * @param _seller Address of the seller
     * @param _buyer Address of the buyer
     * @param _itemId ID of the item
     * @param _quantity Quantity purchased
     * @param _price Price paid
     * @param _durability Durability of item
     * @param _expiration Expiration timestamp
     */
    function addTransaction(
        uint256 _listingId,
        address _seller,
        address _buyer,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _price,
        uint256 _durability,
        uint256 _expiration
    ) external;

    /**
     * @notice Gets transaction history for a player
     * @param _player Address of the player
     * @return Array of MarketTransaction structs
     */
    function getTransactionHistory(
        address _player
    ) external view returns (MarketTransaction[] memory);

    /**
     * @notice Gets overall marketplace statistics
     * @return MarketStats struct containing statistics
     */
    function getMarketStats() external view returns (MarketStats memory);

    /**
     * @notice Gets total count of listings
     * @return uint256 Number of listings
     */
    function getListingCount() external view returns (uint256);

    /**
     * @notice Checks if a listing exists
     * @param _listingId ID of the listing to check
     * @return bool True if listing exists
     */
    function exists(uint256 _listingId) external view returns (bool);

    /**
     * @notice Checks if a listing is currently active
     * @param _listingId ID of the listing to check
     * @return bool True if listing is active
     */
    function isListingActive(uint256 _listingId) external view returns (bool);
}
