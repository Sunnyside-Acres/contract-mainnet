// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/NPCMarket.sol";

/**
 * @title INPCMarketComponent
 * @notice Interface for managing NPC-controlled marketplace operations
 */
interface INPCMarketComponent {
    /**
     * @notice Creates a new NPC market (admin only)
     * @param _npcId ID of the NPC
     * @param _name Name of the NPC market
     */
    function createNPCMarket(uint256 _npcId, string memory _name) external;

    /**
     * @notice Adds an item to an NPC market (admin only)
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _limitPerUser Maximum quantity per user
     * @param _pricePerUnit Price per unit of the item
     * @param _isSelling Whether NPC is selling (true) or buying (false)
     */
    function addItemToMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external;

    /**
     * @notice Updates an item in an NPC market (admin only)
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _newLimitPerUser New maximum quantity per user
     * @param _newPrice New price per unit
     */
    function updateItemInMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _newLimitPerUser,
        uint256 _newPrice
    ) external;

    /**
     * @notice Removes an item from an NPC market (admin only)
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item to remove
     */
    function removeItemFromMarket(uint256 _npcId, uint256 _itemId) external;

    /**
     * @notice Gets details of a specific item in an NPC market
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @return MarketItemView struct containing item details
     */
    function getMarketItem(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (MarketItemView memory);

    /**
     * @notice Gets all items in an NPC market
     * @param _npcId ID of the NPC market
     * @return Array of MarketItemView structs
     */
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (MarketItemView[] memory);

    /**
     * @notice Gets all item IDs available in an NPC market
     * @param _npcId ID of the NPC market
     * @return Array of item IDs
     */
    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory);

    /**
     * @notice Gets information about an NPC market
     * @param _npcId ID of the NPC market
     * @return npcId ID of the NPC
     * @return name Name of the market
     * @return isActive Whether market is active
     * @return itemCount Number of items in market
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
        );

    /**
     * @notice Checks if an NPC market is open
     * @param _npcId ID of the NPC market
     * @return bool True if market is open
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool);

    /**
     * @notice Records a user's purchase in an NPC market
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item purchased
     * @param _user Address of the user
     * @param _quantity Quantity purchased
     */
    function addUserPurchase(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _quantity
    ) external;

    /**
     * @notice Gets total purchases by a user for a specific item
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _user Address of the user
     * @return uint256 Total quantity purchased
     */
    function getUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256);

    /**
     * @notice Checks if a user can purchase more of an item
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _user Address of the user
     * @param _additionalQuantity Additional quantity to check
     * @return bool True if user can purchase more
     */
    function canUserPurchaseMore(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _additionalQuantity
    ) external view returns (bool);

    /**
     * @notice Resets a user's purchase history for an item (admin only)
     * @param _npcId ID of the NPC market
     * @param _itemId ID of the item
     * @param _user Address of the user
     */
    function resetUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external;
}
