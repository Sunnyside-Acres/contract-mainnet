// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../struct/FleaSkinMarket.sol";

interface IFleaSkinMarketComponent {
    function createListing(
        address _seller,
        string memory _skinType,
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

    function getAllListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory);

    function getListingsBySkinType(
        string memory _skinType
    ) external view returns (MarketListing[] memory);

    function updateListing(
        uint256 _listingId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration
    ) external;

    function cancelListing(uint256 _listingId) external;

    function purchaseListing(
        uint256 _listingId,
        uint256 _quantity,
        address _buyer
    ) external;

    function addTransaction(
        uint256 _listingId,
        address _seller,
        address _buyer,
        string memory _skinType,
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
