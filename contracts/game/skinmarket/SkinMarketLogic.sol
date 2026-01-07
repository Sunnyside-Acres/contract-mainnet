// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ISkinNFT.sol";
import "../../interfaces/ISkin.sol";
import "../../interfaces/ISkinMarket.sol";

contract SkinShopLogic {
    IWorld public world;

    ISkinNFT public skinNFTProxy;

    ISkin public skinProxy;

    ISkinMarketComponent public skinMarketProxy;

    address public treasury;

    bool private _locked;

    event NPCMarketCreated(
        uint256 indexed npcId,
        string name,
        uint256 minTransactionAmount,
        uint256 maxTransactionAmount
    );
    /// @notice Emitted when an skin is added to a market
    event ItemAddedToMarket(
        uint256 indexed npcId,
        string indexed _skinType,
        uint256 limitPerUser,
        uint256 pricePerUnit,
        bool isSelling
    );

    /// @notice Emitted when an skin's details are updated in a market
    event ItemUpdatedInMarket(
        uint256 indexed npcId,
        string indexed _skinType,
        uint256 limitPerUser,
        uint256 pricePerUnit
    );

    /// @notice Emitted when an item is removed from a market
    event ItemRemovedFromMarket(
        uint256 indexed npcId,
        string indexed _skinType
    );
    event SkinPurchased(
        address indexed player,
        uint256 indexed npcId,
        uint256[] tokenIds,
        string typeSkin,
        uint256 quantity,
        uint256 totalPrice
    );
    /// @notice Emitted when treasury wallet is updated
    event TreasuryWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet,
        address indexed admin
    );
    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(
        address _world,
        address _skinNFT,
        address _skinComponent,
        address _skinMarketComponent,
        address _treasury
    ) {
        world = IWorld(_world);
        skinNFTProxy = ISkinNFT(_skinNFT);
        skinProxy = ISkin(_skinComponent);
        skinMarketProxy = ISkinMarketComponent(_skinMarketComponent);
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    /**
     * @dev buy Skin
     * @param _npcId The ID of the NPC shop
     * @param _typeSkin The type of skin to buy
     * @param _quantity The quantity of skins to buy
     */
    function buySkin(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity
    ) external payable nonReentrant {
        require(_quantity > 0, "Quantity must be > 0");
        address player = msg.sender;

        require(skinMarketProxy.isMarketOpen(_npcId), "Market closed");

        SkinMarket.MarketItemView memory item = skinMarketProxy.getMarketItem(
            _npcId,
            _typeSkin
        );
        require(item.active, "Item not active");
        require(item.isSelling, "Item not for sale");

        require(
            skinMarketProxy.canUserPurchaseMore(
                _npcId,
                _typeSkin,
                player,
                _quantity
            ),
            "Exceeds purchase limit per user"
        );

        require(
            skinProxy.canSupply(_typeSkin, _quantity),
            "Sold out / Max supply reached"
        );

        uint256 totalPrice = item.pricePerUnit * _quantity;
        require(msg.value == totalPrice, "Insufficient ETH sent");

        skinMarketProxy.recordTransaction(
            player,
            _npcId,
            _typeSkin,
            _quantity,
            item.pricePerUnit,
            totalPrice,
            true
        );
        skinMarketProxy.addUserPurchase(_npcId, _typeSkin, player, _quantity);

        uint256[] memory tokenIds = skinNFTProxy.batchMint(
            player,
            _typeSkin,
            _quantity
        );

        skinProxy.addSkinBatch(player, tokenIds, _typeSkin);

        (bool success, ) = treasury.call{value: totalPrice}("");
        require(success, "Transfer to treasury failed");

        emit SkinPurchased(
            player,
            _npcId,
            tokenIds,
            _typeSkin,
            _quantity,
            totalPrice
        );
    }

    /**
     * @dev get price of a skin item
     * @param _npcId The ID of the NPC shop
     * @param _typeSkin The type of skin to buy
     * @return price per unit of the skin item
     */
    function getSkinPrice(
        uint256 _npcId,
        string memory _typeSkin
    ) external view returns (uint256) {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_typeSkin).length > 0, "Invalid skin type");
        require(skinMarketProxy.isMarketOpen(_npcId), "Market closed");
        SkinMarket.MarketItemView memory item = skinMarketProxy.getMarketItem(
            _npcId,
            _typeSkin
        );
        require(item.active && item.isSelling, "Item not for sale");
        return item.pricePerUnit;
    }

    /**
     * @dev Check how many more items a user can purchase (Remaining Limit)
     * @param _npcId The ID of the NPC shop
     * @param _typeSkin The type of skin to buy
     * @param _user The address of the user
     * @return remaining purchase limit for the user
     */
    function getUserRemainingLimit(
        uint256 _npcId,
        string memory _typeSkin,
        address _user
    ) external view returns (uint256) {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_typeSkin).length > 0, "Invalid skin type");
        require(skinMarketProxy.isMarketOpen(_npcId), "Market closed");
        SkinMarket.MarketItemView memory item = skinMarketProxy.getMarketItem(
            _npcId,
            _typeSkin
        );

        if (item.limitPerUser == 0) return type(uint256).max;

        uint256 purchased = skinMarketProxy.getUserPurchases(
            _npcId,
            _typeSkin,
            _user
        );

        if (purchased >= item.limitPerUser) return 0;
        return item.limitPerUser - purchased;
    }

    /**
     * @dev Get detailed information of a skin item (Price, Limit, Active...)
     * @param _npcId The ID of the NPC shop
     * @param _typeSkin The type of skin to buy
     * @return detailed information of the skin item
     */
    function getSkinInfo(
        uint256 _npcId,
        string memory _typeSkin
    ) external view returns (SkinMarket.MarketItemView memory) {
        return skinMarketProxy.getMarketItem(_npcId, _typeSkin);
    }

    /**
     * @dev Update NPC Market Configuration
     * @param _npcId The ID of the NPC shop
     * @param _name The name of the NPC shop
     * @param _minTransactionAmount Minimum transaction amount
     * @param _maxTransactionAmount Maximum transaction amount
     */
    function updateNPCMarketConfig(
        uint256 _npcId,
        string memory _name,
        uint256 _minTransactionAmount,
        uint256 _maxTransactionAmount
    ) external onlyAdmin {
        skinMarketProxy.updateNPCMarketConfig(
            _npcId,
            _name,
            _minTransactionAmount,
            _maxTransactionAmount
        );
    }

    /**
     * @dev Creates a new NPC Market (admin only)
     * @notice Initializes a new market for a specific NPC with ETH payment settings
     * @param _npcId ID of the NPC
     * @param _name Name of the NPC Market
     * @param _minTransactionAmount Minimum transaction amount in wei
     * @param _maxTransactionAmount Maximum transaction amount in wei
     *
     * Process:
     * 1. Validate input parameters
     * 2. Create NPC Market in component
     * 3. Emit NPCMarketCreated event
     */
    function createNPCMarket(
        uint256 _npcId,
        string memory _name,
        uint256 _minTransactionAmount,
        uint256 _maxTransactionAmount
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_name).length > 0, "NPC name cannot be empty");
        require(
            _minTransactionAmount > 0,
            "Min transaction amount must be greater than 0"
        );
        require(
            _maxTransactionAmount >= _minTransactionAmount,
            "Max must be >= min"
        );

        skinMarketProxy.createNPCMarket(
            _npcId,
            _name,
            _minTransactionAmount,
            _maxTransactionAmount
        );

        emit NPCMarketCreated(
            _npcId,
            _name,
            _minTransactionAmount,
            _maxTransactionAmount
        );
    }

    /**
     * @notice Sets the treasury wallet address (admin only)
     * @dev Updates where ETH proceeds from item sales are sent
     * @param _treasury Address of the new treasury wallet
     */
    function setTreasuryWallet(address _treasury) external onlyAdmin {
        require(
            _treasury != address(0),
            "Treasury wallet cannot be zero address"
        );
        address oldWallet = treasury;
        treasury = _treasury;
        emit TreasuryWalletUpdated(oldWallet, _treasury, msg.sender);
    }

    /**
     * @notice Adds an skin to the NPC Market (admin only)
     * @dev Validates input parameters and checks if item exists before adding to market
     * @dev NOTE: This system only supports BUY (players buy items from NPC)
     * @param _npcId The ID of the NPC market
     * @param _skinType The type of the skin to add
     * @param _limitPerUser Purchase limit per user (0 = unlimited)
     * @param _pricePerUnit Price per unit in wei
     * @param _isSelling Must be true (NPC is selling to player)
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Valid Skin type (> 0)
     * - Price must be greater than 0
     * - Skin must exist in the system
     * - _isSelling must be true (system only supports BUY)
     *
     * Emits {ItemAddedToMarket} event
     */
    function addItemToMarket(
        uint256 _npcId,
        string _skinType,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_skinType).length > 0, "Invalid Skin type");
        require(_pricePerUnit > 0, "Price must be greater than 0");
        require(
            _isSelling,
            "System only supports BUY - NPC must be selling (isSelling must be true)"
        );

        SkinTypeInfo memory skinData = skinProxy.getSkin(_skinType);
        require(skinData.exists, "Skin does not exist");

        // _isSelling must be true for BUY-only system
        npcMarketProxy.addItemToMarket(
            _npcId,
            _skinType,
            _limitPerUser,
            _pricePerUnit,
            true // Always true - NPC is selling to player
        );

        emit ItemAddedToMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit,
            true // Always true - NPC is selling to player (BUY-only system)
        );
    }

    /**
     * @notice Updates an skin details in the NPC Market (admin only)
     * @dev Validates input parameters before updating item information
     * @param _npcId The ID of the NPC market
     * @param _skinType The type of the skin to update
     * @param _limitPerUser New purchase limit per user (0 = unlimited)
     * @param _pricePerUnit New price per unit in wei
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Valid Item ID (> 0)
     * - Price must be greater than 0
     * - Item must already exist in the market
     *
     * Emits {ItemUpdatedInMarket} event
     */
    function updateItemInMarket(
        uint256 _npcId,
        uint256 _skinType,
        uint256 _limitPerUser,
        uint256 _pricePerUnit
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_skinType).length > 0, "Invalid Skin Type");
        require(_pricePerUnit > 0, "Price must be greater than 0");

        skinMarketProxy.updateItemInMarket(
            _npcId,
            _skinType,
            _limitPerUser,
            _pricePerUnit
        );

        emit ItemUpdatedInMarket(
            _npcId,
            _skinType,
            _limitPerUser,
            _pricePerUnit
        );
    }
}
