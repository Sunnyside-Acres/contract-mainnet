// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Item.sol";

contract ItemComponent {
    address public world;
    address public admin;
    address public implementation;

    mapping(uint256 => ItemStructs.Item) public items;
    uint256[] public itemIds;
    mapping(uint256 => ItemStructs.ItemDrop[]) public itemDrops;
    mapping(uint256 => mapping(ItemStructs.Attribute => uint256))
        public itemAttrs;
    mapping(uint256 => ItemStructs.Attribute[]) public itemAttributeLists;

    event CreatedItem(
        uint256 indexed itemId,
        string name,
        ItemStructs.ItemType itemType,
        ItemStructs.Rarity rarity,
        bool isTradable
    );
    event ItemDropConfigured(
        uint256 indexed itemId,
        ItemStructs.ItemDrop[] drops
    );
    event UpdatedItem(
        uint256 indexed itemId,
        string name,
        ItemStructs.ItemType itemType,
        ItemStructs.Rarity rarity,
        bool isTradable,
        bool isBanned
    );
    event AttributeUpdated(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute,
        uint256 value
    );
    event AttributeRemoved(
        uint256 indexed itemId,
        ItemStructs.Attribute attribute
    );

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

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

    function getItem(
        uint256 itemId
    ) external view onlyAuthorized returns (ItemStructs.Item memory) {
        return items[itemId];
    }

    function getAllItems()
        external
        view
        onlyAuthorized
        returns (uint256[] memory)
    {
        return itemIds;
    }

    // Lấy danh sách drop
    function getItemDrops(
        uint256 itemId
    ) external view onlyAuthorized returns (ItemStructs.ItemDrop[] memory) {
        return itemDrops[itemId];
    }

    // Lấy thuộc tính của item
    function getItemAttribute(
        uint256 itemId,
        ItemStructs.Attribute attribute
    ) external view onlyAuthorized returns (uint256) {
        return itemAttrs[itemId][attribute];
    }

    // Lấy tất cả thuộc tính của item
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

    function exists(uint256 itemId) external view returns (bool) {
        return items[itemId].id > 0;
    }
}
