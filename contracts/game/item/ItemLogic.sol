// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IItem.sol";

/**
 * @title ItemLogic
 * @notice Logic contract for the Item system - manages information and attributes of items in the game
 * @dev This contract handles all business logic for items, while ItemComponent stores the data
 *
 * Main features:
 * - Create and manage items with basic properties
 * - Manage item drops (drop rates)
 * - Set and manage item attributes
 * - Validate and check items
 * - Support different item types (weapon, armor, material, etc.)
 */
contract ItemLogic {
    /// @notice Reference to the World contract that manages system authorization
    IWorld public world;

    /// @notice Reference to the ItemComponent proxy contract for data storage
    IItemComponent public itemProxy;

    // ============ EVENTS ============

    /// @notice Emitted when a new item is created
    /// @param itemId The unique identifier of the created item
    /// @param name The name of the item
    /// @param itemType The type of the item
    /// @param rarity The rarity level of the item
    /// @param maxStacked Maximum number that can be stacked
    /// @param isStacked Whether the item can be stacked
    /// @param isTradable Whether the item can be traded
    event ItemCreated(
        uint256 indexed itemId,
        string name,
        ItemStructs.ItemType itemType,
        ItemStructs.Rarity rarity,
        uint256 maxStacked,
        bool isStacked,
        bool isTradable
    );

    /// @notice Emitted when an item's information is updated
    /// @param itemId The ID of the updated item
    /// @param name The updated name
    /// @param itemType The updated type
    /// @param rarity The updated rarity
    /// @param maxStacked The updated max stack size
    /// @param isStacked The updated stackable status
    /// @param isTradable The updated tradable status
    /// @param isBanned The updated banned status
    event ItemUpdated(
        uint256 indexed itemId,
        string name,
        ItemStructs.ItemType itemType,
        ItemStructs.Rarity rarity,
        uint256 maxStacked,
        bool isStacked,
        bool isTradable,
        bool isBanned
    );

    /// @notice Emitted when item drops are configured
    /// @param itemId The ID of the item
    /// @param drops Array of item drops with probabilities
    event ItemDropsSet(uint256 indexed itemId, ItemStructs.ItemDrop[] drops);

    /// @notice Emitted when an item attribute is set
    /// @param itemId The ID of the item
    /// @param attribute The type of attribute
    /// @param value The value of the attribute
    event ItemAttributeSet(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute,
        uint256 value
    );

    /// @notice Emitted when an item attribute is removed
    /// @param itemId The ID of the item
    /// @param attribute The type of attribute removed
    event ItemAttributeRemoved(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute
    );

    // ============ MODIFIERS ============

    /// @notice Restricts function access to admin only
    /// @dev Checks if msg.sender is registered as admin in the World contract
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Restricts function access to registered logic contracts only
    /// @dev Checks if msg.sender is a registered logic contract in the World contract
    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initializes the ItemLogic contract
     * @param _world Address of the World contract
     * @param _itemProxy Address of the ItemComponent proxy contract
     */
    constructor(address _world, address _itemProxy) {
        world = IWorld(_world);
        itemProxy = IItemComponent(_itemProxy);
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @notice Creates a new item in the system (admin only)
     * @dev Validates input parameters and creates item in component
     * @param _itemId The unique ID of the item
     * @param _name The name of the item
     * @param _itemType The type of item (weapon, armor, material, etc.)
     * @param _rarity The rarity level of the item
     * @param _maxStacked Maximum number that can be stacked
     * @param _isStacked Whether the item can be stacked
     * @param _isTradable Whether the item can be traded
     *
     * Process:
     * 1. Validate input parameters
     * 2. Create item in component
     * 3. Emit ItemCreated event
     */
    function createItem(
        uint256 _itemId,
        string memory _name,
        ItemStructs.ItemType _itemType,
        ItemStructs.Rarity _rarity,
        uint256 _maxStacked,
        bool _isStacked,
        bool _isTradable
    ) external onlyAdmin {
        // Validate input
        require(_itemId > 0, "Invalid item ID");
        require(bytes(_name).length > 0, "Item name cannot be empty");
        require(_maxStacked > 0, "Max stacked must be greater than 0");

        itemProxy.createItem(
            _itemId,
            _name,
            _itemType,
            _rarity,
            _maxStacked,
            _isStacked,
            _isTradable
        );

        emit ItemCreated(
            _itemId,
            _name,
            _itemType,
            _rarity,
            _maxStacked,
            _isStacked,
            _isTradable
        );
    }

    /**
     * @notice Configures item drops with drop rates (admin only)
     * @dev Validates item exists and drop data before setting drops in component
     * @param _itemId The ID of the item
     * @param _drops Array of item drops with drop rates
     *
     * Process:
     * 1. Check that item exists
     * 2. Validate drops data
     * 3. Set drops in component
     * 4. Emit ItemDropsSet event
     */
    function createDrops(
        uint256 _itemId,
        ItemStructs.ItemDrop[] memory _drops
    ) external onlyAdmin {
        // Validate item exists
        require(_itemId > 0, "Invalid item ID");
        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(item.id > 0, "Item does not exist");

        // Validate drops
        for (uint256 i = 0; i < _drops.length; i++) {
            require(_drops[i].itemId > 0, "Invalid drop item ID");
            require(
                _drops[i].probability > 0,
                "Drop probability must be greater than 0"
            );
            require(
                _drops[i].probability <= 10000,
                "Drop probability cannot exceed 100%"
            );
        }

        itemProxy.setItemDrops(_itemId, _drops);

        emit ItemDropsSet(_itemId, _drops);
    }

    /**
     * @notice Updates item information (admin only)
     * @dev Validates item exists and input parameters before updating
     * @param _itemId The ID of the item
     * @param _name The new name
     * @param _itemType The new item type
     * @param _rarity The new rarity
     * @param _maxStacked The new maximum stack size
     * @param _isStacked Whether it can be stacked
     * @param _isTradable Whether it can be traded
     * @param _isBanned Whether it is banned
     *
     * Process:
     * 1. Check that item exists
     * 2. Validate input parameters
     * 3. Update item information
     * 4. Emit ItemUpdated event
     */
    function updateItem(
        uint256 _itemId,
        string memory _name,
        ItemStructs.ItemType _itemType,
        ItemStructs.Rarity _rarity,
        uint256 _maxStacked,
        bool _isStacked,
        bool _isTradable,
        bool _isBanned
    ) external onlyAdmin {
        // Validate item exists
        require(_itemId > 0, "Invalid item ID");
        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(item.id > 0, "Item does not exist");

        // Validate input
        require(bytes(_name).length > 0, "Item name cannot be empty");
        require(_maxStacked > 0, "Max stacked must be greater than 0");

        itemProxy.updateItem(
            _itemId,
            _name,
            _itemType,
            _rarity,
            _maxStacked,
            _isStacked,
            _isTradable,
            _isBanned
        );

        emit ItemUpdated(
            _itemId,
            _name,
            _itemType,
            _rarity,
            _maxStacked,
            _isStacked,
            _isTradable,
            _isBanned
        );
    }

    /**
     * @notice Sets an attribute for an item (admin only)
     * @dev Validates item exists and is not banned before setting attribute
     * @param _itemId The ID of the item
     * @param _attr The type of attribute
     * @param _value The value of the attribute
     *
     * Process:
     * 1. Check item exists and is not banned
     * 2. Validate attribute and value
     * 3. Set the attribute
     * 4. Emit ItemAttributeSet event
     */
    function setAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr,
        uint256 _value
    ) external onlyAdmin {
        require(_itemId > 0, "Invalid item ID");

        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(item.id > 0, "Item does not exist");

        require(!item.isBanned, "Cannot modify banned item");

        require(_value > 0, "Attribute value must be greater than 0");

        require(uint8(_attr) >= 0, "Invalid attribute type");

        itemProxy.setAttr(_itemId, _attr, _value);

        emit ItemAttributeSet(_itemId, _attr, _value);
    }

    /**
     * @notice Removes an attribute from an item (admin only)
     * @dev Validates item exists before removing attribute
     * @param _itemId The ID of the item
     * @param _attr The type of attribute to remove
     *
     * Process:
     * 1. Check item exists
     * 2. Remove the attribute
     * 3. Emit ItemAttributeRemoved event
     */
    function removeAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr
    ) external onlyAdmin {
        // Kiểm tra item có tồn tại không
        require(_itemId > 0, "Invalid item ID");
        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(item.id > 0, "Item does not exist");

        itemProxy.removeAttr(_itemId, _attr);

        emit ItemAttributeRemoved(_itemId, _attr);
    }

    // ============ READ FUNCTIONS (EXTERNAL VIEW) ============

    /**
     * @notice Gets all item IDs in the system
     * @return Array of all item IDs
     */
    function getAllItems() external view returns (uint256[] memory) {
        return itemProxy.getAllItems();
    }

    /**
     * @notice Gets detailed information about an item
     * @param _itemId The ID of the item
     * @return Detailed information about the item
     */
    function getItem(
        uint256 _itemId
    ) external view returns (ItemStructs.Item memory) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItem(_itemId);
    }

    /**
     * @notice Gets the drop information for an item
     * @param _itemId The ID of the item
     * @return Array of item drops with drop rates
     */
    function getItemDrops(
        uint256 _itemId
    ) external view returns (ItemStructs.ItemDrop[] memory) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItemDrops(_itemId);
    }

    /**
     * @notice Gets the value of a specific attribute of an item
     * @param _itemId The ID of the item
     * @param _attribute The type of attribute
     * @return The value of the attribute
     */
    function getItemAttribute(
        uint256 _itemId,
        ItemStructs.Attribute _attribute
    ) external view returns (uint256) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItemAttribute(_itemId, _attribute);
    }

    /**
     * @notice Gets all attributes of an item
     * @param _itemId The ID of the item
     * @return attributes Array of attribute types
     * @return values Array of corresponding values
     */
    function getItemAttributes(
        uint256 _itemId
    ) external view returns (ItemStructs.Attribute[] memory, uint256[] memory) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItemAttributes(_itemId);
    }

    /**
     * @notice Checks if an item exists
     * @param _itemId The ID of the item
     * @return True if the item exists, false otherwise
     */
    function itemExists(uint256 _itemId) external view returns (bool) {
        require(_itemId > 0, "Invalid item ID");
        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        return item.id > 0;
    }

    /**
     * @notice Gets overview statistics about the item system
     * @return totalItems Total number of items
     * @return activeItems Number of active items (not banned)
     * @return bannedItems Number of banned items
     * @return tradableItems Number of tradable items
     */
    function getItemSystemStats()
        external
        view
        returns (
            uint256 totalItems,
            uint256 activeItems,
            uint256 bannedItems,
            uint256 tradableItems
        )
    {
        uint256[] memory allItemIds = itemProxy.getAllItems();
        totalItems = allItemIds.length;

        for (uint256 i = 0; i < allItemIds.length; i++) {
            ItemStructs.Item memory item = itemProxy.getItem(allItemIds[i]);

            if (item.isBanned) {
                bannedItems++;
            } else {
                activeItems++;
            }

            if (item.isTradable) {
                tradableItems++;
            }
        }
    }

    /**
     * @notice Gets list of items by type
     * @param _itemType The type of item to filter
     * @return Array of IDs of items of this type
     */
    function getItemsByType(
        ItemStructs.ItemType _itemType
    ) external view returns (uint256[] memory) {
        uint256[] memory allItemIds = itemProxy.getAllItems();

        // Count items of this type
        uint256 count = 0;
        for (uint256 i = 0; i < allItemIds.length; i++) {
            ItemStructs.Item memory item = itemProxy.getItem(allItemIds[i]);
            if (item.itemType == _itemType) {
                count++;
            }
        }

        // Create filtered array
        uint256[] memory filteredItems = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allItemIds.length; i++) {
            ItemStructs.Item memory item = itemProxy.getItem(allItemIds[i]);
            if (item.itemType == _itemType) {
                filteredItems[index] = allItemIds[i];
                index++;
            }
        }

        return filteredItems;
    }

    /**
     * @notice Gets list of items by rarity
     * @param _rarity The rarity level to filter
     * @return Array of IDs of items with this rarity
     */
    function getItemsByRarity(
        ItemStructs.Rarity _rarity
    ) external view returns (uint256[] memory) {
        uint256[] memory allItemIds = itemProxy.getAllItems();

        // Count items of this rarity
        uint256 count = 0;
        for (uint256 i = 0; i < allItemIds.length; i++) {
            ItemStructs.Item memory item = itemProxy.getItem(allItemIds[i]);
            if (item.rarity == _rarity) {
                count++;
            }
        }

        // Create filtered array
        uint256[] memory filteredItems = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allItemIds.length; i++) {
            ItemStructs.Item memory item = itemProxy.getItem(allItemIds[i]);
            if (item.rarity == _rarity) {
                filteredItems[index] = allItemIds[i];
                index++;
            }
        }

        return filteredItems;
    }

    /**
     * @notice Gets list of tradable items
     * @return Array of IDs of items that can be traded
     */
    function getTradableItems() external view returns (uint256[] memory) {
        uint256[] memory allItemIds = itemProxy.getAllItems();

        // Count tradable items
        uint256 count = 0;
        for (uint256 i = 0; i < allItemIds.length; i++) {
            ItemStructs.Item memory item = itemProxy.getItem(allItemIds[i]);
            if (item.isTradable && !item.isBanned) {
                count++;
            }
        }

        // Create filtered array
        uint256[] memory tradableItems = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allItemIds.length; i++) {
            ItemStructs.Item memory item = itemProxy.getItem(allItemIds[i]);
            if (item.isTradable && !item.isBanned) {
                tradableItems[index] = allItemIds[i];
                index++;
            }
        }

        return tradableItems;
    }
}
