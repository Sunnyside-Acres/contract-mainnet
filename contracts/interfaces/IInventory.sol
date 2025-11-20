// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Inventory.sol";

/**
 * @title IInventoryComponent
 * @notice Interface for managing player inventory items
 */
interface IInventoryComponent {
    /**
     * @notice Sets or updates an item in player's inventory
     * @param _player Address of the player
     * @param _itemId ID of the item
     * @param _quantity Quantity of the item
     * @param _durability Durability value of the item
     * @param _expiration Expiration timestamp of the item
     */
    function setItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _durability,
        uint256 _expiration
    ) external;

    /**
     * @notice Retrieves all items in a player's inventory
     * @param _player Address of the player
     * @return Array of InventoryItem structs
     */
    function getItems(
        address _player
    ) external view returns (InventoryItem[] memory);

    /**
     * @notice Retrieves a specific item from player's inventory
     * @param _player Address of the player
     * @param _itemId ID of the item to retrieve
     * @return InventoryItem struct containing item details
     */
    function getItem(
        address _player,
        uint256 _itemId
    ) external view returns (InventoryItem memory);

    /**
     * @notice Checks if an item exists in player's inventory
     * @param _player Address of the player
     * @param _itemId ID of the item to check
     * @return bool True if item exists in inventory
     */
    function exists(
        address _player,
        uint256 _itemId
    ) external view returns (bool);

    /**
     * @notice Removes all items from a player's inventory
     * @param _player Address of the player
     */
    function cleanupPlayerItems(address _player) external;
}
