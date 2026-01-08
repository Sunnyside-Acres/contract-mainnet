// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IFleaSkinMarket.sol";
import "../../interfaces/ISkin.sol";

contract FleaSkinMarketLogic {
    IWorld public world;
    IPlayerComponent public playerProxy;
    IFleaSkinMarketComponent public fleaSkinMarketProxy;
    ISkin public skinProxy;

    // ============ EVENTS ============

    event SkinListed(
        address indexed seller,
        uint256 indexed listingId,
        string indexed skinType,
        uint256 quantity,
        uint256 price,
        uint256 expirationTime
    );

    event SkinPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed listingId,
        string indexed skinType,
        uint256 quantity,
        uint256 price
    );

    event ListingUpdated(
        uint256 indexed listingId,
        uint256 quantity,
        uint256 price,
        uint256 expirationTime
    );

    event ListingCancelled(address indexed seller, uint256 indexed listingId);

    event BulkPurchaseCompleted(
        address indexed buyer,
        uint256[] listingIds,
        uint256[] quantities,
        uint256 totalCost
    );

    event BestPricePurchaseCompleted(
        address indexed buyer,
        string indexed skinType,
        uint256 requestedQuantity,
        uint256 actualQuantity,
        uint256 totalCost
    );

    // ============ MODIFIERS ============

    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _world,
        address _playerProxy,
        address _fleaSkinMarketProxy,
        address _skinProxy
    ) {
        world = IWorld(_world);
        playerProxy = IPlayerComponent(_playerProxy);
        fleaSkinMarketProxy = IFleaSkinMarketComponent(_fleaSkinMarketProxy);
        skinProxy = ISkin(_skinProxy);
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @notice List an item for sale on the flea market - allows multiple orders for the same item
     * @dev Items are deducted from inventory immediately upon listing
     * @param _skinType The type of the skin to sell
     * @param _quantity The quantity of items to sell in this order
     * @param _price The selling price per item (in sunlight)
     * @param _duration The validity period of the order (in seconds)
     *
     * Process:
     * 1. Validate input parameters
     * 2. Check that player and item exist
     * 3. Check sufficient items in inventory
     * 4. Deduct items from inventory immediately
     * 5. Create listing with unique ID
     * 6. Emit ItemListed event
     */
    function listItem(
        string memory _skinType,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration
    ) external {
        address seller = msg.sender;

        // Validate input
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(seller);
        require(playerData.level > 0, "Player not initialized");

        // Check if skin exists in game
        require(
            skinProxy.getSkin(_skinType).exists,
            "Skin does not exist in game"
        );

        // Check if player has enough items in inventory
        InventoryItem memory playerItem = inventoryProxy.getItem(
            seller,
            _skinType
        );
        require(playerItem.quantity > 0, "Item does not exist in inventory");
        require(
            playerItem.quantity >= _quantity,
            "Not enough items in inventory to list"
        );

        // Remove items from seller's inventory immediately
        uint256 newQuantity = playerItem.quantity - _quantity;
        inventoryProxy.setItem(
            seller,
            _skinType,
            newQuantity,
            playerItem.durability,
            playerItem.expiration
        );

        // Create listing with unique ID
        uint256 listingId = fleaSkinMarketProxy.createListing(
            seller,
            _skinType,
            _quantity,
            _price,
            _duration,
            playerItem.durability,
            playerItem.expiration
        );

        emit SkinListed(
            seller,
            listingId,
            _skinType,
            _quantity,
            _price,
            block.timestamp + _duration
        );
    }
}
