// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/NPCMarket.sol";

/**
 * @title NPCMarketComponent
 * @dev Component contract for NPC Market system - manages market data and inventory
 * @notice This contract stores and manages all NPC market-related data including items, prices, and user purchase limits
 *
 * Key Features:
 * - Create and manage NPC markets
 * - Add/update/remove items from markets
 * - Track user purchase limits per item
 * - Manage item prices and availability
 * - Support both buying from and selling to NPCs
 */
contract NPCMarketComponent {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from NPC ID to NPCMarket struct
    mapping(uint256 => NPCMarket) public npcMarkets;

    /// @notice Emitted when the implementation contract is upgraded
    event ComponentUpdated(address indexed newImplementation);

    /// @notice Emitted when a new NPC market is created
    event NPCMarketCreated(uint256 indexed npcId, string name);

    /// @notice Emitted when an item is added to a market
    event ItemAddedToMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 pricePerUnit,
        bool isSelling
    );

    /// @notice Emitted when an item's details are updated in a market
    event ItemUpdatedInMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 newQuantity,
        uint256 newPrice
    );

    /// @notice Emitted when an item is removed from a market
    event ItemRemovedFromMarket(uint256 indexed npcId, uint256 indexed itemId);

    /**
     * @dev Modifier to restrict access to authorized logic contracts only
     * @notice Reverts if caller is not a registered logic contract
     */
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @dev Creates a new NPC market
     * @notice Initializes a market for a specific NPC
     * @param _npcId ID of the NPC
     * @param _name Name of the market/NPC
     */
    function createNPCMarket(
        uint256 _npcId,
        string memory _name
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(!npcMarkets[_npcId].isActive, "NPC market already exists");

        npcMarkets[_npcId].npcId = _npcId;
        npcMarkets[_npcId].name = _name;
        npcMarkets[_npcId].isActive = true;

        emit NPCMarketCreated(_npcId, _name);
    }

    /**
     * @dev Adds an item to an NPC market
     * @notice Sets up an item for buying or selling in the market
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item to add
     * @param _limitPerUser Maximum quantity per user (0 = unlimited)
     * @param _pricePerUnit Price per unit in Sunny tokens
     * @param _isSelling Whether the NPC is selling (true) or buying (false) this item
     */
    function addItemToMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(_itemId > 0, "Invalid Item ID");
        require(_pricePerUnit > 0, "Price per unit must be greater than 0");
        require(
            !npcMarkets[_npcId].items[_itemId].active,
            "Item already exists in market"
        );

        // Add item to market
        npcMarkets[_npcId].items[_itemId].itemId = _itemId;
        npcMarkets[_npcId].items[_itemId].limitPerUser = _limitPerUser;
        npcMarkets[_npcId].items[_itemId].pricePerUnit = _pricePerUnit;
        npcMarkets[_npcId].items[_itemId].isSelling = _isSelling;
        npcMarkets[_npcId].items[_itemId].active = true;
        npcMarkets[_npcId].items[_itemId].lastPriceUpdate = block.timestamp;

        // Add itemId to list for iteration
        npcMarkets[_npcId].itemIds.push(_itemId);

        emit ItemAddedToMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit,
            _isSelling
        );
    }

    /**
     * @dev Updates an item's details in the market
     * @notice Modifies price and purchase limit for an existing market item
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item to update
     * @param _newLimitPerUser New maximum quantity per user
     * @param _newPrice New price per unit
     */
    function updateItemInMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _newLimitPerUser,
        uint256 _newPrice
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(_itemId > 0, "Invalid Item ID");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );
        require(_newPrice > 0, "Price must be greater than 0");

        npcMarkets[_npcId].items[_itemId].limitPerUser = _newLimitPerUser;
        npcMarkets[_npcId].items[_itemId].pricePerUnit = _newPrice;
        npcMarkets[_npcId].items[_itemId].lastPriceUpdate = block.timestamp;

        emit ItemUpdatedInMarket(_npcId, _itemId, _newLimitPerUser, _newPrice);
    }

    /**
     * @dev Removes an item from the market
     * @notice Marks item as inactive and removes from item list
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item to remove
     */
    function removeItemFromMarket(
        uint256 _npcId,
        uint256 _itemId
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(_itemId > 0, "Invalid Item ID");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        // Mark item as inactive
        npcMarkets[_npcId].items[_itemId].active = false;

        // Remove itemId from list
        uint256[] storage itemIds = npcMarkets[_npcId].itemIds;
        for (uint256 i = 0; i < itemIds.length; i++) {
            if (itemIds[i] == _itemId) {
                itemIds[i] = itemIds[itemIds.length - 1];
                itemIds.pop();
                break;
            }
        }

        emit ItemRemovedFromMarket(_npcId, _itemId);
    }

    /**
     * @dev Gets detailed information about a specific market item
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @return MarketItemView struct with item details
     */
    function getMarketItem(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (MarketItemView memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        MarketItem storage item = npcMarkets[_npcId].items[_itemId];
        return
            MarketItemView({
                itemId: item.itemId,
                limitPerUser: item.limitPerUser,
                pricePerUnit: item.pricePerUnit,
                isSelling: item.isSelling,
                active: item.active,
                lastPriceUpdate: item.lastPriceUpdate
            });
    }

    // Function để lấy tất cả items trong market
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (MarketItemView[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");

        uint256[] memory itemIds = npcMarkets[_npcId].itemIds;
        MarketItemView[] memory items = new MarketItemView[](itemIds.length);

        for (uint256 i = 0; i < itemIds.length; i++) {
            MarketItem storage item = npcMarkets[_npcId].items[itemIds[i]];
            items[i] = MarketItemView({
                itemId: item.itemId,
                limitPerUser: item.limitPerUser,
                pricePerUnit: item.pricePerUnit,
                isSelling: item.isSelling,
                active: item.active,
                lastPriceUpdate: item.lastPriceUpdate
            });
        }

        return items;
    }

    /**
     * @dev Gets all item IDs in a market
     * @param _npcId ID of the NPC market
     * @return Array of item IDs
     */
    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        return npcMarkets[_npcId].itemIds;
    }

    /**
     * @dev Gets basic information about an NPC market
     * @param _npcId ID of the NPC market
     * @return npcId ID of the NPC
     * @return name Name of the market
     * @return isActive Whether the market is active
     * @return itemCount Number of items in the market
     */
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
        NPCMarket storage market = npcMarkets[_npcId];
        return (
            market.npcId,
            market.name,
            market.isActive,
            market.itemIds.length
        );
    }

    /**
     * @dev Checks if a market is currently open/active
     * @param _npcId ID of the NPC market
     * @return True if market is active, false otherwise
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool) {
        NPCMarket storage market = npcMarkets[_npcId];
        return market.isActive;
    }

    /**
     * @dev Tracks user purchases for limit enforcement
     * @notice Increments the purchase count for a specific user and item
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _user Address of the user
     * @param _quantity Quantity purchased to add
     */
    function addUserPurchase(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _quantity
    ) external onlyAuthorized {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        npcMarkets[_npcId].items[_itemId].userPurchases[_user] += _quantity;
    }

    /**
     * @dev Gets the total quantity purchased by a user
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _user Address of the user
     * @return Total quantity purchased by the user
     */
    function getUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        return npcMarkets[_npcId].items[_itemId].userPurchases[_user];
    }

    /**
     * @dev Checks if a user can purchase additional quantity
     * @notice Verifies against per-user purchase limit
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _user Address of the user
     * @param _additionalQuantity Quantity user wants to purchase
     * @return True if user can purchase, false otherwise
     */
    function canUserPurchaseMore(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _additionalQuantity
    ) external view returns (bool) {
        if (!npcMarkets[_npcId].isActive) return false;
        if (!npcMarkets[_npcId].items[_itemId].active) return false;

        uint256 limitPerUser = npcMarkets[_npcId].items[_itemId].limitPerUser;

        // If limit = 0, unlimited
        if (limitPerUser == 0) return true;

        uint256 currentPurchases = npcMarkets[_npcId]
            .items[_itemId]
            .userPurchases[_user];
        return (currentPurchases + _additionalQuantity) <= limitPerUser;
    }

    /**
     * @dev Resets user purchase count for a specific item
     * @notice Admin function to reset purchase limits
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _user Address of the user
     */
    function resetUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external onlyAuthorized {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        npcMarkets[_npcId].items[_itemId].userPurchases[_user] = 0;
    }
}
