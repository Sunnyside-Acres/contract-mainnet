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

    // ============ EVENTS ============
    event NPCMarketCreated(
        uint256 indexed npcId,
        string name,
        uint256 minTransactionAmount,
        uint256 maxTransactionAmount
    );

    event ItemAddedToMarket(
        uint256 indexed npcId,
        string indexed skinType,
        uint256 limitPerUser,
        uint256 pricePerUnit,
        bool isSelling
    );

    event ItemUpdatedInMarket(
        uint256 indexed npcId,
        string indexed skinType,
        uint256 limitPerUser,
        uint256 pricePerUnit
    );

    event ItemRemovedFromMarket(
        uint256 indexed npcId,
        string indexed skinType
    );

    event MarketStateChanged(uint256 indexed npcId, bool isActive);

    event SkinPurchased(
        address indexed player,
        uint256 indexed npcId,
        uint256[] tokenIds,
        string typeSkin,
        uint256 quantity,
        uint256 totalPrice
    );

    event TreasuryWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet,
        address indexed admin
    );

    // ============ MODIFIERS ============
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

    // ============ CORE FUNCTIONS (BUY) ============

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

        // Batch Mint NFT
        uint256[] memory tokenIds = skinNFTProxy.batchMint(
            player,
            _typeSkin,
            _quantity
        );
        
        // Save metadata to Skin Component
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

    // ============ ADMIN FUNCTIONS ============

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

    function addItemToMarket(
        uint256 _npcId,
        string memory _skinType,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_skinType).length > 0, "Invalid Skin type");
        require(_pricePerUnit > 0, "Price must be greater than 0");
        require(
            _isSelling,
            "System only supports BUY - NPC must be selling"
        );
        
        // Check if skin type exists in SkinComponent
        SkinTypeInfo memory skinData = skinProxy.getSkin(_skinType);
        require(skinData.exists, "Skin does not exist");

        skinMarketProxy.addItemToMarket(
            _npcId,
            _skinType,
            _limitPerUser,
            _pricePerUnit,
            true 
        );
        
        emit ItemAddedToMarket(
            _npcId,
            _skinType, 
            _limitPerUser,
            _pricePerUnit,
            true 
        );
    }

    function updateItemInMarket(
        uint256 _npcId,
        string memory _skinType,
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

    function removeItemFromMarket(
        uint256 _npcId,
        string memory _skinType
    ) external onlyAdmin {
        skinMarketProxy.removeItemFromMarket(_npcId, _skinType);
        emit ItemRemovedFromMarket(_npcId, _skinType);
    }

    function setMarketActive(uint256 _npcId, bool _isActive) external onlyAdmin {
        skinMarketProxy.setMarketActive(_npcId, _isActive);
        emit MarketStateChanged(_npcId, _isActive);
    }

    function resetUserPurchases(
        uint256 _npcId,
        string memory _skinType,
        address _user
    ) external onlyAdmin {
        skinMarketProxy.resetUserPurchases(_npcId, _skinType, _user);
    }

    function setTreasuryWallet(address _treasury) external onlyAdmin {
        require(
            _treasury != address(0),
            "Treasury wallet cannot be zero address"
        );
        address oldWallet = treasury;
        treasury = _treasury;
        emit TreasuryWalletUpdated(oldWallet, _treasury, msg.sender);
    }

    // ============ VIEW FUNCTIONS ============

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

    function getUserRemainingLimit(
        uint256 _npcId,
        string memory _typeSkin,
        address _user
    ) external view returns (uint256) {
        return skinMarketProxy.getRemainingUserLimit(_npcId, _typeSkin, _user);
    }

    function getSkinInfo(
        uint256 _npcId,
        string memory _typeSkin
    ) external view returns (SkinMarket.MarketItemView memory) {
        return skinMarketProxy.getMarketItem(_npcId, _typeSkin);
    }

    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketItemView[] memory) {
        return skinMarketProxy.getAllMarketItems(_npcId);
    }

    function getNPCMarketInfo(
        uint256 _npcId
    )
        external
        view
        returns (
            uint256 npcId,
            string memory name,
            bool isActive,
            uint256 itemCount,
            uint256 minTransactionAmount,
            uint256 maxTransactionAmount,
            uint256 totalEarnings,
            uint256 totalSpent
        )
    {
        return skinMarketProxy.getNPCMarketInfo(_npcId);
    }

    function getMarketStats(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketStats memory) {
        return skinMarketProxy.getMarketStats(_npcId);
    }

    function getUserMarketStats(
        uint256 _npcId,
        address _user
    ) external view returns (SkinMarket.UserMarketStats memory) {
        return skinMarketProxy.getUserMarketStats(_npcId, _user);
    }
    
    function getTransactionRecord(
        uint256 _transactionId
    ) external view returns (SkinMarket.TransactionRecord memory) {
        return skinMarketProxy.getTransactionRecord(_transactionId);
    }
}