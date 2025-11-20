// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Inventory.sol";

/**
 * @title InventoryComponent
 * @author RYG.Labs
 * @notice Data storage contract for the Inventory system
 * @dev Stores all player inventory items and their properties
 */
contract InventoryComponent {
    /// @notice Address of the World contract for access control
    address public world;

    /// @notice Address of the admin
    address public admin;

    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from player address and item ID to InventoryItem
    mapping(address => mapping(uint256 => InventoryItem)) public inventory;

    /// @notice Mapping from player address to their list of item IDs
    mapping(address => uint256[]) public playerItems;

    /// @notice Emitted when an item is added to inventory
    /// @param player The player's address
    /// @param itemId The item ID
    /// @param quantity The quantity added
    event ItemAdded(
        address indexed player,
        uint256 indexed itemId,
        uint256 quantity
    );

    /// @notice Emitted when an item is removed from inventory
    /// @param player The player's address
    /// @param itemId The item ID
    event ItemRemoved(address indexed player, uint256 indexed itemId);

    /// @notice Emitted when an item is updated in inventory
    /// @param player The player's address
    /// @param itemId The item ID
    /// @param quantity The new quantity
    /// @param durability The new durability
    /// @param expiration The new expiration time
    event ItemUpdated(
        address indexed player,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 durability,
        uint256 expiration
    );

    /// @notice Restricts access to authorized logic contracts only
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    /**
     * @notice Set or update an item in player's inventory
     * @dev If quantity is 0, the item will be removed
     * @param _player The player's address
     * @param _itemId The item ID
     * @param _quantity The quantity to set
     * @param _durability The durability value (0-100)
     * @param _expiration The expiration timestamp
     */
    function setItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _durability,
        uint256 _expiration
    ) external onlyAuthorized {
        require(_itemId > 0, "Invalid item ID");
        require(_quantity >= 0, "Quantity cannot be negative");
        require(_durability <= 100, "Durability cannot exceed 100");

        if (_quantity == 0) {
            // If quantity = 0, remove item
            removeItem(_player, _itemId);
        } else {
            // Check if item already exists
            bool itemExists = inventory[_player][_itemId].quantity > 0;

            if (itemExists) {
                // Update existing item information
                inventory[_player][_itemId].quantity = _quantity;
                inventory[_player][_itemId].durability = _durability;
                inventory[_player][_itemId].expiration = _expiration;
            } else {
                // Create new item with full information
                uint256 instanceId = uint256(
                    keccak256(
                        abi.encodePacked(_player, _itemId, block.timestamp)
                    )
                );

                inventory[_player][_itemId] = InventoryItem({
                    itemId: _itemId,
                    quantity: _quantity,
                    instanceId: instanceId,
                    durability: _durability,
                    expiration: _expiration
                });

                // Add to playerItems list
                playerItems[_player].push(_itemId);
            }

            emit ItemUpdated(
                _player,
                _itemId,
                _quantity,
                _durability,
                _expiration
            );
        }
    }

    /**
     * @dev Remove an item from player's inventory
     * @param _player The player's address
     * @param _itemId The item ID to remove
     */
    function removeItem(address _player, uint256 _itemId) internal {
        require(
            inventory[_player][_itemId].quantity > 0,
            "Item not found in inventory"
        );

        // Remove item from mapping
        delete inventory[_player][_itemId];

        // Remove item from playerItems array
        uint256[] storage items = playerItems[_player];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] == _itemId) {
                // Replace element to delete with last element
                if (i < items.length - 1) {
                    items[i] = items[items.length - 1];
                }
                items.pop();
                break;
            }
        }

        emit ItemRemoved(_player, _itemId);
    }

    /**
     * @dev Check if a player has a specific item
     * @param _player The player's address
     * @param _itemId The item ID to check
     * @return True if player has the item, false otherwise
     */
    function _hasItem(
        address _player,
        uint256 _itemId
    ) internal view returns (bool) {
        uint256[] storage items = playerItems[_player];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] == _itemId) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Get all items in a player's inventory
     * @param _playerAddress The player's address
     * @return Array of InventoryItem structs
     */
    function getItems(
        address _playerAddress
    ) external view returns (InventoryItem[] memory) {
        uint256[] storage itemIds = playerItems[_playerAddress];
        uint256 validItemCount = 0;

        // Count valid items
        for (uint256 i = 0; i < itemIds.length; i++) {
            if (inventory[_playerAddress][itemIds[i]].quantity > 0) {
                validItemCount++;
            }
        }

        // Create array with exact size
        InventoryItem[] memory items = new InventoryItem[](validItemCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < itemIds.length; i++) {
            InventoryItem memory item = inventory[_playerAddress][itemIds[i]];
            if (item.quantity > 0) {
                items[currentIndex] = item;
                currentIndex++;
            }
        }

        return items;
    }

    /**
     * @notice Get a specific item from a player's inventory
     * @param _player The player's address
     * @param _itemId The item ID
     * @return The InventoryItem struct
     */
    function getItem(
        address _player,
        uint256 _itemId
    ) external view returns (InventoryItem memory) {
        return inventory[_player][_itemId];
    }

    /**
     * @notice Check if a player has a specific item in inventory
     * @param _player The player's address
     * @param _itemId The item ID to check
     * @return True if player has the item with quantity > 0
     */
    function exists(
        address _player,
        uint256 _itemId
    ) external view returns (bool) {
        return inventory[_player][_itemId].quantity > 0;
    }

    /**
     * @notice Clean up playerItems array, removing items that no longer exist
     * @param _player The player's address
     */
    function cleanupPlayerItems(address _player) external onlyAuthorized {
        uint256[] storage items = playerItems[_player];
        uint256 i = 0;
        while (i < items.length) {
            if (inventory[_player][items[i]].quantity == 0) {
                // Replace element to delete with last element
                if (i < items.length - 1) {
                    items[i] = items[items.length - 1];
                }
                items.pop();
            } else {
                i++;
            }
        }
    }
}
