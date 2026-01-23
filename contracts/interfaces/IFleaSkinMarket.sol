// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../struct/FleaSkinMarket.sol";

interface IFleaSkinMarketComponent {
    function createListing(
        address _seller,
        uint256 _tokenId,
        uint256 _price,
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

    function getListingsByTokenId(
        uint256 _tokenId
    ) external view returns (MarketListing[] memory);

    function updateListing(
        uint256 _listingId,
        uint256 _price,
        uint256 _expired
    ) external;

    function cancelListing(uint256 _listingId) external;

    function purchaseSkin(
        uint256 _listingId,
        address _buyer
    ) external;

    function getListingCount() external view returns (uint256);

    function exists(uint256 _listingId) external view returns (bool);

    function isListingActive(uint256 _listingId) external view returns (bool);

    function getCommissionFeePercent() external view returns (uint256);

    function setCommissionFeePercent(uint256 _percent) external;

    function getSoldListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory);
}
