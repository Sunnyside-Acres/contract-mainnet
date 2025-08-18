// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IItem.sol";

contract ItemLogic {
    IWorld public world;
    IItemComponent public itemProxy;

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

    constructor(address _world, address _itemProxy) {
        world = IWorld(_world);
        itemProxy = IItemComponent(_itemProxy);
    }

    function createItem(
        uint256 _itemId,
        string memory _name,
        ItemStructs.ItemType _itemType,
        ItemStructs.Rarity _rarity,
         uint256 _maxStacked,
        bool _isStacked,
        bool _isTradable
    ) external onlyAdmin {
        itemProxy.createItem(_itemId, _name, _itemType, _rarity, _maxStacked, _isStacked, _isTradable);
    }

    function createDrops(
        uint256 _itemId,
        ItemStructs.ItemDrop[] memory _drops
    ) external onlyAdmin {
        itemProxy.setItemDrops(_itemId, _drops);
    }

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
    }

    function getAllItems() external view returns (uint256[] memory) {
        return itemProxy.getAllItems();
    }

    function getItem(
        uint256 _itemId
    ) external view returns (ItemStructs.Item memory) {
        return itemProxy.getItem(_itemId);
    }

    function getItemDrops(
        uint256 _itemId
    ) external view returns (ItemStructs.ItemDrop[] memory) {
        return itemProxy.getItemDrops(_itemId);
    }

    function setAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr,
        uint256 _value
    ) external onlyAdmin {
        // Kiểm tra item có tồn tại không
        require(_itemId > 0, "[LOGIC] Invalid item ID");

        // Kiểm tra item có tồn tại trong hệ thống không
        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(item.id > 0, "[LOGIC] Item does not exist");

        // Kiểm tra item không bị ban
        require(!item.isBanned, "[LOGIC] Cannot modify banned item");

        // Kiểm tra giá trị thuộc tính hợp lệ
        require(_value > 0, "[LOGIC] Attribute value must be greater than 0");

        // Kiểm tra thuộc tính hợp lệ (có thể thêm enum validation nếu cần)
        require(uint8(_attr) >= 0, "[LOGIC] Invalid attribute type");

        // Gọi hàm setAttr từ component
        itemProxy.setAttr(_itemId, _attr, _value);
    }

    function removeAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr
    ) external onlyAdmin {
        itemProxy.removeAttr(_itemId, _attr);
    }

    // Lấy thuộc tính của item
    function getItemAttribute(
        uint256 _itemId,
        ItemStructs.Attribute _attribute
    ) external view returns (uint256) {
        require(_itemId > 0, "[LOGIC] Invalid item ID");
        return itemProxy.getItemAttribute(_itemId, _attribute);
    }

    // Lấy tất cả thuộc tính của item
    function getItemAttributes(
        uint256 _itemId
    ) external view returns (ItemStructs.Attribute[] memory, uint256[] memory) {
        require(_itemId > 0, "[LOGIC] Invalid item ID");
        return itemProxy.getItemAttributes(_itemId);
    }
}
