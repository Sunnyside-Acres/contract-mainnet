// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Item.sol";

/**
 * @title IItemComponent
 * @notice Interface for managing game items and their attributes
 */
interface IItemComponent {
    /**
     * @notice Creates a new game item
     * @param _itemId ID of the item
     * @param _name Name of the item
     * @param _itemType Type of the item
     * @param _rarity Rarity level of the item
     * @param _maxStacked Maximum stack size
     * @param _isStacked Whether item can be stacked
     * @param _isTradable Whether item can be traded
     */
    function createItem(
        uint256 _itemId,
        string memory _name,
        ItemStructs.ItemType _itemType,
        ItemStructs.Rarity _rarity,
        uint256 _maxStacked,
        bool _isStacked,
        bool _isTradable
    ) external;

    /**
     * @notice Updates an existing item
     * @param itemId ID of the item
     * @param _name Name of the item
     * @param _itemType Type of the item
     * @param _rarity Rarity level of the item
     * @param _maxStacked Maximum stack size
     * @param _isStacked Whether item can be stacked
     * @param _isTradable Whether item can be traded
     * @param _isBanned Whether item is banned
     */
    function updateItem(
        uint256 itemId,
        string memory _name,
        ItemStructs.ItemType _itemType,
        ItemStructs.Rarity _rarity,
        uint256 _maxStacked,
        bool _isStacked,
        bool _isTradable,
        bool _isBanned
    ) external;

    /**
     * @notice Sets drop rates for an item
     * @param itemId ID of the item
     * @param drops Array of ItemDrop structs defining drop rates
     */
    function setItemDrops(
        uint256 itemId,
        ItemStructs.ItemDrop[] memory drops
    ) external;

    /**
     * @notice Sets an attribute value for an item
     * @param _itemId ID of the item
     * @param _attr Attribute type to set
     * @param _value Value of the attribute
     */
    function setAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr,
        uint256 _value
    ) external;

    /**
     * @notice Removes an attribute from an item
     * @param _itemId ID of the item
     * @param _attr Attribute type to remove
     */
    function removeAttr(uint256 _itemId, ItemStructs.Attribute _attr) external;

    /**
     * @notice Gets all item IDs in the game
     * @return Array of item IDs
     */
    function getAllItems() external view returns (uint256[] memory);

    /**
     * @notice Gets details of a specific item
     * @param itemId ID of the item
     * @return Item struct containing item details
     */
    function getItem(
        uint256 itemId
    ) external view returns (ItemStructs.Item memory);

    /**
     * @notice Gets drop information for an item
     * @param itemId ID of the item
     * @return Array of ItemDrop structs
     */
    function getItemDrops(
        uint256 itemId
    ) external view returns (ItemStructs.ItemDrop[] memory);

    /**
     * @notice Gets a specific attribute value for an item
     * @param itemId ID of the item
     * @param attribute Attribute type to query
     * @return uint256 Value of the attribute
     */
    function getItemAttribute(
        uint256 itemId,
        ItemStructs.Attribute attribute
    ) external view returns (uint256);

    /**
     * @notice Gets all attributes and their values for an item
     * @param itemId ID of the item
     * @return Array of Attribute types and array of their values
     */
    function getItemAttributes(
        uint256 itemId
    ) external view returns (ItemStructs.Attribute[] memory, uint256[] memory);

    /**
     * @notice Checks if an item exists
     * @param itemId ID of the item to check
     * @return bool True if item exists
     */
    function exists(uint256 itemId) external view returns (bool);
}
