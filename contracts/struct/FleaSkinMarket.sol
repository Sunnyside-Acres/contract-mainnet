// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct MarketListing {
    uint256 id; /// Unique listing ID
    address seller; /// Address of the seller
    string skinType; /// Type of the skin being sold
    uint256 quantity; /// Quantity of items
    uint256 price; /// Sale price in sunlight
    uint256 listingTime; /// Timestamp when listed
    uint256 expirationTime; /// Expiration timestamp
    bool isActive; /// Whether listing is active
    uint256 durability; /// Item durability
    uint256 expiration; /// Item expiration timestamp
}

struct MarketTransaction {
    uint256 listingId; /// ID of the listing
    address seller; /// Address of the seller
    address buyer; /// Address of the buyer
    string skinType; /// Type of the skin being traded
    uint256 quantity; /// Quantity traded
    uint256 price; /// Transaction price
    uint256 transactionTime; /// Timestamp of transaction
    uint256 durability; /// Item durability
    uint256 expiration; /// Item expiration timestamp
}

struct MarketStats {
    uint256 totalListings; /// Total number of listings
    uint256 totalTransactions; /// Total number of transactions
    uint256 totalVolume; /// Total trading volume in sunlight
    uint256 activeListings; /// Number of active listings
}