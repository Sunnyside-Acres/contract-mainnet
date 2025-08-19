// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INPCMarket.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/NPCMarket.sol";
import "../../struct/Inventory.sol";
import "../../struct/Item.sol";
import "../../struct/Player.sol";

contract NPCMarketLogic {
    IWorld public world;
    INPCMarketComponent public npcMarketProxy;
    IItemComponent public itemProxy;
    IInventoryComponent public inventoryProxy;
    IPlayerComponent public playerProxy;

    // Constants
    uint256 public constant MAX_TRANSACTION_AMOUNT = 1000000;

    // Events
    event ItemPurchased(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice
    );

    event ItemSold(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice
    );

    event MarketStateChanged(uint256 indexed npcId, bool isOpen);

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

    constructor(
        address _world,
        address _npcMarketProxy,
        address _itemProxy,
        address _inventoryProxy,
        address _playerProxy
    ) {
        world = IWorld(_world);
        npcMarketProxy = INPCMarketComponent(_npcMarketProxy);
        itemProxy = IItemComponent(_itemProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    function createNPCMarket(
        uint256 _npcId,
        string memory _name
    ) external onlyAdmin {
        npcMarketProxy.createNPCMarket(_npcId, _name);
    }

    function addItemToMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external onlyAdmin {
        npcMarketProxy.addItemToMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit,
            _isSelling
        );
    }

    function updateItemInMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit
    ) external onlyAdmin {
        npcMarketProxy.updateItemInMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit
        );
    }

    function removeItemFromMarket(
        uint256 _npcId,
        uint256 _itemId
    ) external onlyAdmin {
        npcMarketProxy.removeItemFromMarket(_npcId, _itemId);
    }

    // ============ PLAYER FUNCTIONS ============

    function buyItemFromNPC(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external {
        address player = msg.sender;

        // Validate inputs
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(
            _quantity <= MAX_TRANSACTION_AMOUNT,
            "Quantity exceeds maximum"
        );

        // Check if market is open
        require(npcMarketProxy.isMarketOpen(_npcId), "Market is closed");

        // Get market item
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        require(marketItem.active, "Item not available in market");
        require(marketItem.isSelling, "NPC is not selling this item");

        // Check user purchase limit (quantity field is now limitPerUser)
        require(
            npcMarketProxy.canUserPurchaseMore(
                _npcId,
                _itemId,
                player,
                _quantity
            ),
            "Purchase limit exceeded for this user"
        );

        // Calculate total price
        uint256 totalPrice = marketItem.pricePerUnit * _quantity;

        // Check if player exists and has enough currency
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");
        require(playerData.sunny >= totalPrice, "Not enough currency");

        // Validate item exists
        ItemStructs.Item memory itemData = itemProxy.getItem(_itemId);
        require(!itemData.isBanned, "Item is banned");

        // Process transaction
        // 1. Check if player has enough currency (already checked above)
        // NOTE: This logic assumes player currency is managed externally or
        // that the component will handle deduction internally

        // 2. Add item to player inventory
        InventoryItem memory currentItem = inventoryProxy.getItem(
            player,
            _itemId
        );
        uint256 newQuantity = currentItem.quantity + _quantity;

        inventoryProxy.setItem(
            player,
            _itemId,
            newQuantity,
            currentItem.durability,
            currentItem.expiration
        );

        // 3. Track user purchase
        npcMarketProxy.addUserPurchase(_npcId, _itemId, player, _quantity);

        emit ItemPurchased(player, _npcId, _itemId, _quantity, totalPrice);
    }

    function sellItemToNPC(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external {
        address player = msg.sender;

        // Validate inputs
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(
            _quantity <= MAX_TRANSACTION_AMOUNT,
            "Quantity exceeds maximum"
        );

        // Check if market is open
        require(npcMarketProxy.isMarketOpen(_npcId), "Market is closed");

        // Get market item
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        require(marketItem.active, "Item not available in market");
        require(!marketItem.isSelling, "NPC is not buying this item");

        // Check user sell limit (limitPerUser applies to selling too)
        require(
            npcMarketProxy.canUserPurchaseMore(
                _npcId,
                _itemId,
                player,
                _quantity
            ),
            "Sell limit exceeded for this user"
        );

        // Check if player exists and has enough items
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");

        InventoryItem memory playerItem = inventoryProxy.getItem(
            player,
            _itemId
        );
        require(playerItem.quantity >= _quantity, "Not enough items to sell");

        // Calculate total price
        uint256 totalPrice = marketItem.pricePerUnit * _quantity;

        // Process transaction
        // 1. Remove item from player inventory
        inventoryProxy.setItem(
            player,
            _itemId,
            playerItem.quantity - _quantity,
            playerItem.durability,
            playerItem.expiration
        );

        // 2. Add currency to player
        playerProxy.addSunny(player, totalPrice);

        // 3. Track user sale
        npcMarketProxy.addUserPurchase(_npcId, _itemId, player, _quantity);

        emit ItemSold(player, _npcId, _itemId, _quantity, totalPrice);
    }

    // ============ VIEW FUNCTIONS ============

    function getMarketItem(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (MarketItemView memory) {
        return npcMarketProxy.getMarketItem(_npcId, _itemId);
    }

    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (MarketItemView[] memory) {
        return npcMarketProxy.getAllMarketItems(_npcId);
    }

    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory) {
        return npcMarketProxy.getMarketItemIds(_npcId);
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
            uint256 itemCount
        )
    {
        return npcMarketProxy.getNPCMarketInfo(_npcId);
    }

    function isMarketOpen(uint256 _npcId) external view returns (bool) {
        return npcMarketProxy.isMarketOpen(_npcId);
    }

    function canPlayerBuyItem(
        address _player,
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (bool canBuy, string memory reason) {
        // Check if market is open
        if (!npcMarketProxy.isMarketOpen(_npcId)) {
            return (false, "Market is closed");
        }

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }

        // Check market item
        try npcMarketProxy.getMarketItem(_npcId, _itemId) returns (
            MarketItemView memory marketItem
        ) {
            if (!marketItem.active) {
                return (false, "Item not available in market");
            }
            if (!marketItem.isSelling) {
                return (false, "NPC is not selling this item");
            }

            // Check user limit instead of item quantity
            if (
                !npcMarketProxy.canUserPurchaseMore(
                    _npcId,
                    _itemId,
                    _player,
                    _quantity
                )
            ) {
                return (false, "Purchase limit exceeded for this user");
            }

            // Check currency
            uint256 totalPrice = marketItem.pricePerUnit * _quantity;
            if (playerData.sunny < totalPrice) {
                return (false, "Not enough currency");
            }

            return (true, "");
        } catch {
            return (false, "Item not found in market");
        }
    }

    function canPlayerSellItem(
        address _player,
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (bool canSell, string memory reason) {
        // Check if market is open
        if (!npcMarketProxy.isMarketOpen(_npcId)) {
            return (false, "Market is closed");
        }

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }

        // Check player's inventory
        InventoryItem memory playerItem = inventoryProxy.getItem(
            _player,
            _itemId
        );
        if (playerItem.quantity < _quantity) {
            return (false, "Not enough items to sell");
        }

        // Check market item
        try npcMarketProxy.getMarketItem(_npcId, _itemId) returns (
            MarketItemView memory marketItem
        ) {
            if (!marketItem.active) {
                return (false, "Item not accepted by market");
            }
            if (marketItem.isSelling) {
                return (false, "NPC is not buying this item");
            }

            // Check user sell limit
            if (
                !npcMarketProxy.canUserPurchaseMore(
                    _npcId,
                    _itemId,
                    _player,
                    _quantity
                )
            ) {
                return (false, "Sell limit exceeded for this user");
            }

            return (true, "");
        } catch {
            return (false, "Item not accepted by NPC");
        }
    }

    function calculateBuyPrice(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (uint256 totalPrice) {
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        require(marketItem.active && marketItem.isSelling, "Item not for sale");
        return marketItem.pricePerUnit * _quantity;
    }

    function calculateSellPrice(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (uint256 totalPrice) {
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        require(
            marketItem.active && !marketItem.isSelling,
            "Item not accepted for purchase"
        );
        return marketItem.pricePerUnit * _quantity;
    }

    // ============ NEW USER TRACKING FUNCTIONS ============

    function getUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256) {
        return npcMarketProxy.getUserPurchases(_npcId, _itemId, _user);
    }

    function canUserPurchaseMore(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _additionalQuantity
    ) external view returns (bool) {
        return
            npcMarketProxy.canUserPurchaseMore(
                _npcId,
                _itemId,
                _user,
                _additionalQuantity
            );
    }

    function resetUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external onlyAdmin {
        npcMarketProxy.resetUserPurchases(_npcId, _itemId, _user);
    }

    function getItemLimitPerUser(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (uint256) {
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        return marketItem.limitPerUser;
    }

    function getRemainingUserLimit(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256) {
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        uint256 purchased = npcMarketProxy.getUserPurchases(
            _npcId,
            _itemId,
            _user
        );

        // Nếu limitPerUser = 0, không giới hạn (trả về max uint256)
        if (marketItem.limitPerUser == 0) {
            return type(uint256).max;
        }

        if (purchased >= marketItem.limitPerUser) {
            return 0;
        }

        return marketItem.limitPerUser - purchased;
    }
}
