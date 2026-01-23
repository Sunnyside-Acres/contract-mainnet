// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct MarketListing {
    uint256 id; /// Unique listing ID
    address seller; /// Address of the seller
    address buyer; /// Address of the buyer (if any)
    uint256 tokenId; /// ID of the token being sold
    uint256 price; /// Sale price in wei (ETH)
    uint256 listingTime; /// Timestamp when listed
    uint256 boughtTime; /// Timestamp when bought (if any)
    uint256 expirationTime; /// Expiration timestamp
    bool isActive; /// Whether listing is active,
    uint256 commissionFeePercent; /// Commission fee percentage
}