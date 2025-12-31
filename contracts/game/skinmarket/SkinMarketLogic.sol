// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ISkinNFT.sol";
import "../../interfaces/ISkin.sol";
import "../../interfaces/ISkinMarket.sol";

contract SkinShopLogic {
    IWorld public world;
    ISkinNFT public skinNFTProxy;
    ISkin public skinData;
    ISkinMarketComponent public marketProxy;
    address public treasury;
    bool private _locked;

    event SkinPurchased(
        address indexed player,
        uint256 indexed npcId,
        string typeSkin,
        uint256 quantity,
        uint256 totalPrice
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
        skinData = ISkin(_skinComponent);
        marketProxy = ISkinMarketComponent(_skinMarketComponent);
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

        require(marketProxy.isMarketOpen(_npcId), "Market closed");

        SkinMarket.MarketItemView memory item = marketProxy.getMarketItem(
            _npcId,
            _typeSkin
        );
        require(item.active, "Item not active");
        require(item.isSelling, "Item not for sale");

        require(
            marketProxy.canUserPurchaseMore(
                _npcId,
                _typeSkin,
                player,
                _quantity
            ),
            "Exceeds purchase limit per user"
        );

        uint256 currentSupply = skinData.getSkinOwners(_typeSkin).length;
        uint256 maxSupply = skinData.getSkinMaxSupply(_typeSkin);

        if (maxSupply > 0) {
            require(
                currentSupply + _quantity <= maxSupply,
                "Sold out / Max supply reached"
            );
        }

        uint256 totalPrice = item.pricePerUnit * _quantity;
        require(msg.value == totalPrice, "Insufficient ETH sent");

        (bool success, ) = treasury.call{value: totalPrice}("");
        require(success, "Transfer to treasury failed");

        marketProxy.recordTransaction(
            player,
            _npcId,
            _typeSkin,
            _quantity,
            item.pricePerUnit,
            totalPrice,
            true
        );
        marketProxy.addUserPurchase(_npcId, _typeSkin, player, _quantity);

        for (uint256 i = 0; i < _quantity; i++) {
            uint256 tokenId = skinNFTProxy.mint(player, _typeSkin);

            skinData.setPlayerSkin(player, tokenId);
            skinData.addSkinOwner(_typeSkin, player);
            skinData.setSkinType(tokenId, _typeSkin);
        }

        emit SkinPurchased(player, _npcId, _typeSkin, _quantity, totalPrice);
    }

    /**
     * @dev get price of a skin item
     * @param _npcId The ID of the NPC shop
     * @param _typeSkin The type of skin to buy
     * @return price per unit of the skin item
     */
    function getSkinPrice(uint256 _npcId, string memory _typeSkin) external view returns (uint256) {
        SkinMarket.MarketItemView memory item = marketProxy.getMarketItem(_npcId, _typeSkin);
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
    function getUserRemainingLimit(uint256 _npcId, string memory _typeSkin, address _user) external view returns (uint256) {
        SkinMarket.MarketItemView memory item = marketProxy.getMarketItem(_npcId, _typeSkin);
        
        if (item.limitPerUser == 0) return type(uint256).max;
        
        uint256 purchased = marketProxy.getUserPurchases(_npcId, _typeSkin, _user);
        
        if (purchased >= item.limitPerUser) return 0;
        return item.limitPerUser - purchased;
    }

    /**
     * @dev Get detailed information of a skin item (Price, Limit, Active...)
     * @param _npcId The ID of the NPC shop
     * @param _typeSkin The type of skin to buy
     * @return detailed information of the skin item
     */
    function getSkinInfo(uint256 _npcId, string memory _typeSkin) external view returns (SkinMarket.MarketItemView memory) {
        return marketProxy.getMarketItem(_npcId, _typeSkin);
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
        marketProxy.updateNPCMarketConfig(
            _npcId,
            _name,
            _minTransactionAmount,
            _maxTransactionAmount
        );
    }

}
