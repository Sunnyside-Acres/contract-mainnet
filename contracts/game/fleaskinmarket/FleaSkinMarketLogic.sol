// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IFleaSkinMarket.sol";
import "../../interfaces/ISkin.sol";
import "../../interfaces/ISkinNFT.sol";

contract FleaSkinMarketLogic {
    IWorld public world;
    IPlayerComponent public playerProxy;
    IFleaSkinMarketComponent public fleaSkinMarketProxy;
    ISkin public skinProxy;
    ISkinNFT public skinNFTProxy;
    address public treasury;
    bool private _locked;

    // ============ EVENTS ============

    event SkinListed(
        address indexed seller,
        uint256 indexed listingId,
        uint256 indexed tokenId,
        string skinType,
        uint256 price,
        uint256 expirationTime,
        uint256 commissionFeePercent
    );

    event ListingUpdated(
        uint256 indexed listingId,
        uint256 price,
        uint256 expirationTime
    );

    event ListingCancelled(address indexed seller, uint256 indexed listingId);

    event SkinPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed listingId,
        uint256 tokenId,
        string skinType,
        uint256 price
    );

    event TreasuryWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet,
        address indexed admin
    );

    event CommissionFeePercentUpdated(
        uint256 oldPercent,
        uint256 newPercent,
        address indexed admin
    );

    // ============ MODIFIERS ============

    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _world,
        address _playerProxy,
        address _fleaSkinMarketProxy,
        address _skinProxy,
        address _skinNFTProxy,
        address _treasury
    ) {
        world = IWorld(_world);
        playerProxy = IPlayerComponent(_playerProxy);
        fleaSkinMarketProxy = IFleaSkinMarketComponent(_fleaSkinMarketProxy);
        skinProxy = ISkin(_skinProxy);
        skinNFTProxy = ISkinNFT(_skinNFTProxy);
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    function setTreasuryWallet(address _treasury) external onlyAdmin {
        require(
            _treasury != address(0),
            "Treasury wallet cannot be zero address"
        );
        address oldWallet = treasury;
        treasury = _treasury;
        emit TreasuryWalletUpdated(oldWallet, _treasury, msg.sender);
    }

    function getCommissionFeePercent() external view returns (uint256) {
        return fleaSkinMarketProxy.getCommissionFeePercent();
    }

    function setCommissionFeePercent(uint256 _percent) external onlyAdmin {
        require(_percent >= 0, "Commission fee cannot be less than 0%");
        uint256 oldPercent = fleaSkinMarketProxy.getCommissionFeePercent();
        fleaSkinMarketProxy.setCommissionFeePercent(_percent);
        emit CommissionFeePercentUpdated(oldPercent, _percent, msg.sender);
    }

    /**
     * @notice List a skin for sale on the flea market - allows multiple orders for the same skin
     * @dev Skins are deducted from inventory immediately upon listing
     * @param tokenId The ID of the skin to sell
     * @param _price The selling price per skin (in sunlight)
     * @param _expired The validity period of the order (in seconds)
     */
    function listSkin(
        uint256 tokenId,
        uint256 _price,
        uint256 _expired
    ) external nonReentrant {
        address seller = msg.sender;

        // Validate input
        require(tokenId > 0, "Token ID must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(_expired > 0, "Duration must be greater than 0");

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(seller);
        require(playerData.level > 0, "Player not initialized");

        require(
            skinNFTProxy.ownerOf(tokenId) == seller,
            "Not the owner of the skin"
        );

        bool isApproved = (skinNFTProxy.getApproved(tokenId) ==
            address(this)) ||
            (skinNFTProxy.isApprovedForAll(seller, address(this)));
        require(isApproved, "Market not approved to transfer NFT");

        string memory skinType = skinProxy.getSkinType(tokenId);

        // Create listing with unique ID
        uint256 listingId = fleaSkinMarketProxy.createListing(
            seller,
            tokenId,
            _price,
            skinType,
            _expired
        );

        emit SkinListed(
            seller,
            listingId,
            tokenId,
            skinType,
            _price,
            block.timestamp + _expired,
            fleaSkinMarketProxy.getCommissionFeePercent()
        );
    }

    /**
     * @notice Purchase a skin from the flea market - each purchase is from a specific listing
     * @dev Handles sunlight transfer and inventory updates
     * @param _listingId The ID of the listing to purchase from
     */
    function purchaseSkin(uint256 _listingId) external payable nonReentrant {
        address buyer = msg.sender;

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(buyer);
        require(playerData.level > 0, "Player not initialized");

        // Get listing details
        MarketListing memory listing = fleaSkinMarketProxy.getListing(
            _listingId
        );
        require(listing.isActive, "Listing is not active");
        require(
            listing.expirationTime > block.timestamp,
            "Listing has expired"
        );
        require(buyer != listing.seller, "Cannot buy your own skin");
        require(msg.value == listing.price, "Incorrect ETH amount sent");
        require(
            skinNFTProxy.getApproved(listing.tokenId) == address(this) ||
                skinNFTProxy.isApprovedForAll(listing.seller, address(this)),
            "Market contract not approved to transfer this skin"
        );

        // Process the purchase from this specific listing
        fleaSkinMarketProxy.purchaseSkin(_listingId, buyer);

        // Transfer skin to buyer
        try
            skinNFTProxy.safeTransferFrom(
                listing.seller,
                buyer,
                listing.tokenId
            )
        {} catch {
            revert("Failed to transfer skin NFT to buyer");
        }
        uint256 totalCost = listing.price;
        uint256 fee = (totalCost * listing.commissionFeePercent) / 10000;
        uint256 sellerProceeds = totalCost - fee;

        // Transfer fee to treasury
        if (fee > 0) {
            (bool feeSent, ) = treasury.call{value: fee}("");
            require(feeSent, "Fee transfer failed");
        }

        // Transfer proceeds to seller
        (bool sellerPaid, ) = listing.seller.call{value: sellerProceeds}("");
        require(sellerPaid, "Failed to send proceeds to seller");

        emit SkinPurchased(
            buyer,
            listing.seller,
            _listingId,
            listing.tokenId,
            listing.skinType,
            totalCost
        );
    }

    function updateListing(
        uint256 _listingId,
        uint256 _price,
        uint256 _expired
    ) external nonReentrant {
        address seller = msg.sender;

        // Validate input
        require(_price > 0, "Price must be greater than 0");
        require(_expired > 0, "Expiration must be greater than 0");
        require(_expired <= 7 days, "Expiration cannot exceed 7 days");

        // Get listing details
        MarketListing memory listing = fleaSkinMarketProxy.getListing(
            _listingId
        );
        require(listing.seller == seller, "Only seller can update listing");
        require(listing.isActive, "Listing is not active");
        require(
            listing.expirationTime > block.timestamp,
            "Listing has expired"
        );

        // Update listing
        fleaSkinMarketProxy.updateListing(_listingId, _price, _expired);

        emit ListingUpdated(_listingId, _price, block.timestamp + _expired);
    }

    function cancelListing(uint256 _listingId) external nonReentrant {
        address seller = msg.sender;

        // Get listing details
        MarketListing memory listing = fleaSkinMarketProxy.getListing(
            _listingId
        );
        require(listing.seller == seller, "Only seller can cancel listing");
        require(listing.isActive, "Listing is not active");

        // Cancel listing
        fleaSkinMarketProxy.cancelListing(_listingId);

        emit ListingCancelled(seller, _listingId);
    }

    function getActiveListings()
        external
        view
        returns (MarketListing[] memory)
    {
        return fleaSkinMarketProxy.getActiveListings();
    }

    function getListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory) {
        require(_seller != address(0), "Seller cannot be zero address");
        return fleaSkinMarketProxy.getListingsBySeller(_seller);
    }

    function getListingsByTokenId(
        uint256 _tokenId
    ) external view returns (MarketListing[] memory) {
        require(_tokenId > 0, "Token ID must be greater than 0");
        return fleaSkinMarketProxy.getListingsByTokenId(_tokenId);
    }

    function canListSkin(
        address _player,
        uint256 _tokenId
    ) external view returns (bool, string memory) {
        require(_player != address(0), "Player cannot be zero address");
        require(_tokenId > 0, "Token ID must be greater than 0");
        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }
        if (skinNFTProxy.ownerOf(_tokenId) != _player) {
            return (false, "Not the owner of the skin");
        }
        return (true, "Can list skin");
    }

    function getPlayerTotalListedQuantity(
        address _player,
        uint256 _tokenId
    ) external view returns (uint256) {
        require(_player != address(0), "Player cannot be zero address");
        require(_tokenId > 0, "Token ID must be greater than 0");
        MarketListing[] memory allPlayerListings = fleaSkinMarketProxy
            .getListingsBySeller(_player);

        uint256 totalQuantity = 0;
        for (uint256 i = 0; i < allPlayerListings.length; i++) {
            if (
                allPlayerListings[i].tokenId == _tokenId &&
                allPlayerListings[i].isActive &&
                allPlayerListings[i].expirationTime > block.timestamp
            ) {
                totalQuantity++;
            }
        }

        return totalQuantity;
    }

    function getListing(
        uint256 _listingId
    ) external view returns (MarketListing memory) {
        require(_listingId > 0, "Listing ID must be greater than 0");
        return fleaSkinMarketProxy.getListing(_listingId);
    }

    function getAllListings() external view returns (MarketListing[] memory) {
        return fleaSkinMarketProxy.getAllListings();
    }
}
