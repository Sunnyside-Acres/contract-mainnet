// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Item.sol";

/**
 * @title ItemComponent
 * @notice Component lưu trữ dữ liệu cho hệ thống Item
 * @dev Contract này chỉ lưu trữ dữ liệu, logic nghiệp vụ được xử lý ở ItemLogic
 * Sử dụng pattern Component-Logic để tách biệt dữ liệu và logic
 */
contract ItemComponent {
    /// @notice Address of the World contract that manages system authorization
    address public world;

    /// @notice Address of the admin who can manage this component
    address public admin;

    /// @notice Address of the implementation contract (ItemLogic)
    address public implementation;

    /// @notice Mapping from item ID to Item struct containing item details
    mapping(uint256 => ItemStructs.Item) public items;

    /// @notice Array storing all item IDs in the system
    uint256[] public itemIds;

    /// @notice Mapping from item ID to array of possible item drops with probabilities
    mapping(uint256 => ItemStructs.ItemDrop[]) public itemDrops;

    /// @notice Nested mapping from item ID to attribute type to attribute value
    mapping(uint256 => mapping(ItemStructs.Attribute => uint256))
        public itemAttrs;

    /// @notice Mapping from item ID to list of all attributes that item has
    mapping(uint256 => ItemStructs.Attribute[]) public itemAttributeLists;

    /// @notice Emitted when a new item is created in the system
    /// @param itemId The unique identifier of the created item
    /// @param name The name of the item
    /// @param itemType The type/category of the item (weapon, armor, material, etc.)
    /// @param rarity The rarity level of the item
    /// @param isTradable Whether the item can be traded between players
    event CreatedItem(
        uint256 indexed itemId,
        string name,
        ItemStructs.ItemType itemType,
        ItemStructs.Rarity rarity,
        bool isTradable
    );

    /// @notice Emitted when item drop configuration is set or updated
    /// @param itemId The ID of the item for which drops are configured
    /// @param drops Array of possible item drops with their probabilities
    event ItemDropConfigured(
        uint256 indexed itemId,
        ItemStructs.ItemDrop[] drops
    );

    /// @notice Emitted when an existing item's information is updated
    /// @param itemId The ID of the updated item
    /// @param name The new name of the item
    /// @param itemType The new type of the item
    /// @param rarity The new rarity level
    /// @param isTradable The new tradable status
    /// @param isBanned The new banned status
    event UpdatedItem(
        uint256 indexed itemId,
        string name,
        ItemStructs.ItemType itemType,
        ItemStructs.Rarity rarity,
        bool isTradable,
        bool isBanned
    );

    /// @notice Emitted when an item attribute is set or updated
    /// @param itemId The ID of the item
    /// @param attribute The type of attribute being updated
    /// @param value The new value of the attribute
    event AttributeUpdated(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute,
        uint256 value
    );

    /// @notice Emitted when an attribute is removed from an item
    /// @param itemId The ID of the item
    /// @param attribute The type of attribute being removed
    event AttributeRemoved(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute
    );

    /**
     * @notice Modifier to check access authorization
     * @dev Only allows registered logic contracts in the World to call functions
     */
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    /**
     * @notice Creates a new item in the system
     * @dev Can only be called by registered logic contracts
     * @param _itemId The unique ID of the item (must be unique)
     * @param _name The name of the item
     * @param _itemType The type of the item (weapon, armor, material, etc.)
     * @param _rarity The rarity level of the item
     * @param _maxStacked The maximum number that can be stacked in one slot
     * @param _isStacked Whether the item can be stacked
     * @param _isTradable Whether the item can be traded
     */
    function createItem(
        uint256 _itemId,
        string memory _name,
        ItemStructs.ItemType _itemType,
        ItemStructs.Rarity _rarity,
        uint256 _maxStacked,
        bool _isStacked,
        bool _isTradable
    ) external onlyAuthorized {
        require(items[_itemId].id == 0, "[COMPONENT] Item already exists");
        ItemStructs.Item memory item = ItemStructs.Item({
            id: _itemId,
            name: _name,
            itemType: _itemType,
            rarity: _rarity,
            maxStacked: _maxStacked,
            isStacked: _isStacked,
            isTradable: _isTradable,
            isBanned: false
        });

        items[_itemId] = item;
        itemIds.push(_itemId);

        emit CreatedItem(_itemId, _name, _itemType, _rarity, _isTradable);
    }

    /**
     * @notice Sets or updates an attribute for an item
     * @dev If the attribute exists, it updates the value; otherwise, it adds a new attribute
     * @param _itemId The ID of the item to set the attribute for
     * @param _attr The type of attribute (damage, defense, speed, etc.)
     * @param _value The value of the attribute
     */
    function setAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr,
        uint256 _value
    ) external onlyAuthorized {
        require(items[_itemId].id > 0, "[COMPONENT] Item not found");

        // Kiểm tra xem thuộc tính đã tồn tại chưa
        bool attributeExists = false;
        for (uint256 i = 0; i < itemAttributeLists[_itemId].length; i++) {
            if (itemAttributeLists[_itemId][i] == _attr) {
                attributeExists = true;
                break;
            }
        }

        if (attributeExists) {
            // Cập nhật giá trị nếu thuộc tính đã tồn tại
            itemAttrs[_itemId][_attr] = _value;
        } else {
            // Thêm thuộc tính mới vào mảng và mapping
            itemAttributeLists[_itemId].push(_attr);
            itemAttrs[_itemId][_attr] = _value;
        }

        emit AttributeUpdated(_itemId, _attr, _value);
    }

    /**
     * @notice Removes an attribute from an item
     * @dev Removes the attribute from both mapping and array, uses swap-and-pop pattern to save gas
     * @param _itemId The ID of the item to remove the attribute from
     * @param _attr The type of attribute to remove
     */
    function removeAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr
    ) external onlyAuthorized {
        require(items[_itemId].id > 0, "[COMPONENT] Item not found");

        // Kiểm tra xem thuộc tính có tồn tại không
        bool attributeExists = false;
        uint256 attributeIndex = 0;
        for (uint256 i = 0; i < itemAttributeLists[_itemId].length; i++) {
            if (itemAttributeLists[_itemId][i] == _attr) {
                attributeExists = true;
                attributeIndex = i;
                break;
            }
        }

        require(attributeExists, "[COMPONENT] Attribute does not exist");

        // Xóa khỏi mapping
        delete itemAttrs[_itemId][_attr];

        // Xóa khỏi array bằng cách di chuyển phần tử cuối lên vị trí cần xóa
        uint256 lastIndex = itemAttributeLists[_itemId].length - 1;
        if (attributeIndex != lastIndex) {
            itemAttributeLists[_itemId][attributeIndex] = itemAttributeLists[
                _itemId
            ][lastIndex];
        }
        itemAttributeLists[_itemId].pop();

        emit AttributeRemoved(_itemId, _attr);
    }

    /**
     * @notice Sets the list of item drops for an item
     * @dev The total probability of all drops must equal 10000 (100%)
     * @param itemId The ID of the item to set drops for
     * @param drops Array of ItemDrops with itemId, min/max quantity, and probability
     */
    function setItemDrops(
        uint256 itemId,
        ItemStructs.ItemDrop[] memory drops
    ) external onlyAuthorized {
        require(drops.length > 0, "[COMPONENT] No drops provided");

        // Kiểm tra tổng xác suất = 100%
        uint256 totalProbability = 0;
        for (uint256 i = 0; i < drops.length; i++) {
            totalProbability += drops[i].probability;
        }
        require(
            totalProbability == 10000,
            "[COMPONENT] Total probability must be 100%"
        );

        // Cập nhật danh sách drop
        delete itemDrops[itemId];
        for (uint256 i = 0; i < drops.length; i++) {
            itemDrops[itemId].push(drops[i]);
        }

        emit ItemDropConfigured(itemId, drops);
    }

    /**
     * @notice Updates information for an existing item
     * @dev Allows changing all basic properties of the item, including banned status
     * @param itemId The ID of the item to update
     * @param _name The new name of the item
     * @param _itemType The new type of the item
     * @param _rarity The new rarity level
     * @param _maxStacked The new maximum stack size
     * @param _isStacked The new stackable status
     * @param _isTradable The new tradable status
     * @param _isBanned The new banned status
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
    ) external onlyAuthorized {
        require(items[itemId].id > 0, "[COMPONENT] Item not found");
        require(
            bytes(_name).length > 0,
            "[COMPONENT] Item name cannot be empty"
        );

        items[itemId].name = _name;
        items[itemId].itemType = _itemType;
        items[itemId].rarity = _rarity;
        items[itemId].maxStacked = _maxStacked;
        items[itemId].isStacked = _isStacked;
        items[itemId].isTradable = _isTradable;
        items[itemId].isBanned = _isBanned;

        emit UpdatedItem(
            itemId,
            _name,
            _itemType,
            _rarity,
            _isTradable,
            _isBanned
        );
    }

    /**
     * @notice Gets detailed information about an item
     * @dev Can only be called by registered logic contracts
     * @param itemId The ID of the item to retrieve
     * @return Item struct containing all information about the item
     */
    function getItem(
        uint256 itemId
    ) external view onlyAuthorized returns (ItemStructs.Item memory) {
        return items[itemId];
    }

    /**
     * @notice Gets the list of all item IDs in the system
     * @dev Can only be called by registered logic contracts
     * @return Array containing all itemIds
     */
    function getAllItems()
        external
        view
        onlyAuthorized
        returns (uint256[] memory)
    {
        return itemIds;
    }

    /**
     * @notice Gets the list of item drops for an item
     * @dev Returns an array of ItemDrops with information about dropped items and probabilities
     * @param itemId The ID of the item to get the drops list for
     * @return Array of ItemDrops containing information about possible item drops
     */
    function getItemDrops(
        uint256 itemId
    ) external view onlyAuthorized returns (ItemStructs.ItemDrop[] memory) {
        return itemDrops[itemId];
    }

    /**
     * @notice Gets the value of a specific attribute of an item
     * @dev Can only be called by registered logic contracts
     * @param itemId The ID of the item
     * @param attribute The type of attribute to retrieve
     * @return The value of the attribute (0 if the attribute does not exist)
     */
    function getItemAttribute(
        uint256 itemId,
        ItemStructs.Attribute attribute
    ) external view onlyAuthorized returns (uint256) {
        return itemAttrs[itemId][attribute];
    }

    /**
     * @notice Gets all attributes of an item
     * @dev Returns 2 parallel arrays: array of attribute types and array of corresponding values
     * @param itemId The ID of the item to get attributes for
     * @return attributes Array of attribute types
     * @return values Array of values corresponding to each attribute
     */
    function getItemAttributes(
        uint256 itemId
    )
        external
        view
        onlyAuthorized
        returns (ItemStructs.Attribute[] memory, uint256[] memory)
    {
        ItemStructs.Attribute[] memory attributes = itemAttributeLists[itemId];
        uint256[] memory values = new uint256[](attributes.length);

        for (uint256 i = 0; i < attributes.length; i++) {
            values[i] = itemAttrs[itemId][attributes[i]];
        }

        return (attributes, values);
    }

    /**
     * @notice Checks whether an item exists in the system
     * @dev Does not require onlyAuthorized, can be called by any contract
     * @param itemId The ID of the item to check
     * @return True if the item exists, false otherwise
     */
    function exists(uint256 itemId) external view returns (bool) {
        return items[itemId].id > 0;
    }
}
