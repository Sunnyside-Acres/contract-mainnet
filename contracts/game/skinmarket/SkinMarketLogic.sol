// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ISkinNFT.sol";
import "../../interfaces/ISkin.sol";
import "../../interfaces/ISkinMarket.sol";

contract SkinMarketLogic {
    IWorld public world;
    ISkinNFT public skinNFTProxy;
    ISkin public skinProxy;
    ISkinMarketComponent public skinMarketProxy;
    address public treasury;

    bool private _locked;

    // ============ EVENTS ============
    event NPCMarketCreated(uint256 indexed npcId, string name);

    event SkinAddedToMarket(
        uint256 indexed npcId,
        string indexed skinType,
        uint256 price
    );

    event SkinUpdatedInMarket(
        uint256 indexed npcId,
        string indexed skinType,
        uint256 price
    );

    event SkinRemovedFromMarket(uint256 indexed npcId, string indexed skinType);

    event MarketStateChanged(uint256 indexed npcId, bool isActive);

    event SkinPurchased(
        address indexed player,
        uint256 indexed npcId,
        uint256 tokenId,
        uint256 price
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

    function buySkin(
        uint256 _npcId,
        string memory _typeSkin
    ) external payable nonReentrant {
        address player = msg.sender;

        require(skinMarketProxy.isMarketOpen(_npcId), "Market closed");
        SkinMarket.MarketSkin memory skin = skinMarketProxy.getMarketSkin(
            _npcId,
            _typeSkin
        );
        require(skin.active, "skin not active");

        require(
            skinProxy.canSupply(_typeSkin, 1),
            "Sold out / Max supply reached"
        );

        require(msg.value == skin.price, "Insufficient ETH sent");

        // Mint NFT
        uint256 tokenId = skinNFTProxy.mint(player, _typeSkin);

        // Save metadata to Skin Component
        skinProxy.addSkin(player, tokenId, _typeSkin);

        (bool success, ) = treasury.call{value: skin.price}("");
        require(success, "Transfer to treasury failed");

        emit SkinPurchased(player, _npcId, tokenId, skin.price);
    }

    // ============ ADMIN FUNCTIONS ============

    function createNPCMarket(
        uint256 _npcId,
        string memory _name
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_name).length > 0, "NPC name cannot be empty");

        skinMarketProxy.createNPCMarket(_npcId, _name);
        emit NPCMarketCreated(_npcId, _name);
    }

    function updateNPCMarketConfig(
        uint256 _npcId,
        string memory _name
    ) external onlyAdmin {
        skinMarketProxy.updateNPCMarketConfig(_npcId, _name);
    }

    function addSkinToMarket(
        uint256 _npcId,
        string memory _skinType,
        uint256 _price
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_skinType).length > 0, "Invalid Skin type");
        require(_price > 0, "Price must be greater than 0");

        // Check if skin type exists in SkinComponent
        SkinTypeInfo memory skinData = skinProxy.getSkin(_skinType);
        require(skinData.exists, "Skin does not exist");

        skinMarketProxy.addSkinToMarket(_npcId, _skinType, _price);

        emit SkinAddedToMarket(_npcId, _skinType, _price);
    }

    function updateSkinInMarket(
        uint256 _npcId,
        string memory _skinType,
        uint256 _price
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_skinType).length > 0, "Invalid Skin Type");
        require(_price > 0, "Price must be greater than 0");

        skinMarketProxy.updateSkinInMarket(_npcId, _skinType, _price);
        emit SkinUpdatedInMarket(_npcId, _skinType, _price);
    }

    function removeSkinFromMarket(
        uint256 _npcId,
        string memory _skinType
    ) external onlyAdmin {
        skinMarketProxy.removeSkinFromMarket(_npcId, _skinType);
        emit SkinRemovedFromMarket(_npcId, _skinType);
    }

    function setMarketActive(
        uint256 _npcId,
        bool _isActive
    ) external onlyAdmin {
        skinMarketProxy.setMarketActive(_npcId, _isActive);
        emit MarketStateChanged(_npcId, _isActive);
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
        SkinMarket.MarketSkin memory item = skinMarketProxy.getMarketSkin(
            _npcId,
            _typeSkin
        );
        require(item.active, "Item not for sale");
        return item.price;
    }

    function getSkinInfo(
        uint256 _npcId,
        string memory _typeSkin
    ) external view returns (SkinMarket.MarketSkin memory) {
        return skinMarketProxy.getMarketSkin(_npcId, _typeSkin);
    }

    function getAllMarketSkins(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketSkin[] memory) {
        return skinMarketProxy.getAllMarketSkins(_npcId);
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
            SkinMarket.MarketSkin[] memory skins
        )
    {
        return skinMarketProxy.getNPCMarketInfo(_npcId);
    }
}