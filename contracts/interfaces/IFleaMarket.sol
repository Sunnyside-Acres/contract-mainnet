// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/FleaMarket.sol";

interface IFleaMarketComponent {
    function createListing(
        address _seller,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration,
        uint256 _durability,
        uint256 _expiration
    ) external returns (uint256);

    function getListing(
        uint256 _listingId
    ) external view returns (MarketListing memory);

    function getAllListings() external view returns (MarketListing[] memory);

    function getActiveListings() external view returns (MarketListing[] memory);

    function getListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory);

    function getListingsByItem(
        uint256 _itemId
    ) external view returns (MarketListing[] memory);

    function updateListing(
        uint256 _listingId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration
    ) external;

    function cancelListing(uint256 _listingId) external;

    function purchaseItem(
        uint256 _listingId,
        address _buyer,
        uint256 _quantity
    ) external returns (bool);

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

    function getTransactionHistory(
        address _player
    ) external view returns (MarketTransaction[] memory);

    function getMarketStats() external view returns (MarketStats memory);

    function getListingCount() external view returns (uint256);

    function exists(uint256 _listingId) external view returns (bool);

    function isListingActive(uint256 _listingId) external view returns (bool);
}
