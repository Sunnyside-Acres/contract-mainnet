// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IItem.sol";

/**
 * @title ItemLogic
 * @dev Logic contract cho hệ thống Item - quản lý thông tin và thuộc tính của các item trong game
 *
 * Tính năng chính:
 * - Tạo và quản lý item với các thuộc tính cơ bản
 * - Quản lý item drops (tỉ lệ rơi item)
 * - Thiết lập và quản lý thuộc tính của item
 * - Kiểm tra và validate item
 * - Hỗ trợ các loại item khác nhau (weapon, armor, material, etc.)
 */
contract ItemLogic {
    IWorld public world;
    IItemComponent public itemProxy;

    // ============ EVENTS ============

    event ItemCreated(
        uint256 indexed itemId,
        string name,
        ItemStructs.ItemType itemType,
        ItemStructs.Rarity rarity,
        uint256 maxStacked,
        bool isStacked,
        bool isTradable
    );

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

    event ItemDropsSet(uint256 indexed itemId, ItemStructs.ItemDrop[] drops);

    event ItemAttributeSet(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute,
        uint256 value
    );

    event ItemAttributeRemoved(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute
    );

    // ============ MODIFIERS ============

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

    // ============ CONSTRUCTOR ============

    constructor(address _world, address _itemProxy) {
        world = IWorld(_world);
        itemProxy = IItemComponent(_itemProxy);
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @dev Tạo item mới (chỉ admin)
     * @param _itemId ID của item
     * @param _name Tên của item
     * @param _itemType Loại item (weapon, armor, material, etc.)
     * @param _rarity Độ hiếm của item
     * @param _maxStacked Số lượng tối đa có thể stack
     * @param _isStacked Có thể stack hay không
     * @param _isTradable Có thể trade hay không
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Tạo item trong component
     * 3. Emit event ItemCreated
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
     * @dev Tạo item drops (tỉ lệ rơi item) (chỉ admin)
     * @param _itemId ID của item
     * @param _drops Mảng các item drop với tỉ lệ rơi
     *
     * Quy trình:
     * 1. Kiểm tra item tồn tại
     * 2. Validate drops data
     * 3. Thiết lập drops trong component
     * 4. Emit event ItemDropsSet
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
     * @dev Cập nhật thông tin item (chỉ admin)
     * @param _itemId ID của item
     * @param _name Tên mới
     * @param _itemType Loại item mới
     * @param _rarity Độ hiếm mới
     * @param _maxStacked Số lượng stack tối đa mới
     * @param _isStacked Có thể stack hay không
     * @param _isTradable Có thể trade hay không
     * @param _isBanned Có bị ban hay không
     *
     * Quy trình:
     * 1. Kiểm tra item tồn tại
     * 2. Validate input parameters
     * 3. Cập nhật thông tin item
     * 4. Emit event ItemUpdated
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
     * @dev Thiết lập thuộc tính cho item (chỉ admin)
     * @param _itemId ID của item
     * @param _attr Loại thuộc tính
     * @param _value Giá trị thuộc tính
     *
     * Quy trình:
     * 1. Kiểm tra item tồn tại và không bị ban
     * 2. Validate thuộc tính và giá trị
     * 3. Thiết lập thuộc tính
     * 4. Emit event ItemAttributeSet
     */
    function setAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr,
        uint256 _value
    ) external onlyAdmin {
        // Kiểm tra item có tồn tại không
        require(_itemId > 0, "Invalid item ID");

        // Kiểm tra item có tồn tại trong hệ thống không
        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(item.id > 0, "Item does not exist");

        // Kiểm tra item không bị ban
        require(!item.isBanned, "Cannot modify banned item");

        // Kiểm tra giá trị thuộc tính hợp lệ
        require(_value > 0, "Attribute value must be greater than 0");

        // Kiểm tra thuộc tính hợp lệ
        require(uint8(_attr) >= 0, "Invalid attribute type");

        // Gọi hàm setAttr từ component
        itemProxy.setAttr(_itemId, _attr, _value);

        emit ItemAttributeSet(_itemId, _attr, _value);
    }

    /**
     * @dev Xóa thuộc tính của item (chỉ admin)
     * @param _itemId ID của item
     * @param _attr Loại thuộc tính cần xóa
     *
     * Quy trình:
     * 1. Kiểm tra item tồn tại
     * 2. Xóa thuộc tính
     * 3. Emit event ItemAttributeRemoved
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
     * @dev Lấy tất cả ID của các item trong hệ thống
     * @return Mảng ID của tất cả item
     */
    function getAllItems() external view returns (uint256[] memory) {
        return itemProxy.getAllItems();
    }

    /**
     * @dev Lấy thông tin chi tiết của item
     * @param _itemId ID của item
     * @return Thông tin chi tiết của item
     */
    function getItem(
        uint256 _itemId
    ) external view returns (ItemStructs.Item memory) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItem(_itemId);
    }

    /**
     * @dev Lấy thông tin drops của item
     * @param _itemId ID của item
     * @return Mảng các item drop với tỉ lệ rơi
     */
    function getItemDrops(
        uint256 _itemId
    ) external view returns (ItemStructs.ItemDrop[] memory) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItemDrops(_itemId);
    }

    /**
     * @dev Lấy giá trị thuộc tính cụ thể của item
     * @param _itemId ID của item
     * @param _attribute Loại thuộc tính
     * @return Giá trị thuộc tính
     */
    function getItemAttribute(
        uint256 _itemId,
        ItemStructs.Attribute _attribute
    ) external view returns (uint256) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItemAttribute(_itemId, _attribute);
    }

    /**
     * @dev Lấy tất cả thuộc tính của item
     * @param _itemId ID của item
     * @return (attributes, values) Mảng loại thuộc tính và giá trị tương ứng
     */
    function getItemAttributes(
        uint256 _itemId
    ) external view returns (ItemStructs.Attribute[] memory, uint256[] memory) {
        require(_itemId > 0, "Invalid item ID");
        return itemProxy.getItemAttributes(_itemId);
    }

    /**
     * @dev Kiểm tra item có tồn tại không
     * @param _itemId ID của item
     * @return bool True nếu item tồn tại
     */
    function itemExists(uint256 _itemId) external view returns (bool) {
        require(_itemId > 0, "Invalid item ID");
        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        return item.id > 0;
    }

    /**
     * @dev Lấy thống kê tổng quan về hệ thống item
     * @return totalItems Tổng số item
     * @return activeItems Số item đang hoạt động (không bị ban)
     * @return bannedItems Số item bị ban
     * @return tradableItems Số item có thể trade
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
     * @dev Lấy danh sách item theo loại
     * @param _itemType Loại item cần lọc
     * @return Mảng ID của các item thuộc loại này
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
     * @dev Lấy danh sách item theo độ hiếm
     * @param _rarity Độ hiếm cần lọc
     * @return Mảng ID của các item có độ hiếm này
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
     * @dev Lấy danh sách item có thể trade
     * @return Mảng ID của các item có thể trade
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
