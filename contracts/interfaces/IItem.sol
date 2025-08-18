// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Item.sol";

interface IItemComponent {
    function createItem(
        uint256 _itemId,
        string memory _name,
        ItemStructs.ItemType _itemType,
        ItemStructs.Rarity _rarity,
        uint256 _maxStacked,
        bool _isStacked,
        bool _isTradable
    ) external;

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

    function setItemDrops(
        uint256 itemId,
        ItemStructs.ItemDrop[] memory drops
    ) external;

    function setAttr(
        uint256 _itemId,
        ItemStructs.Attribute _attr,
        uint256 _value
    ) external;

    function removeAttr(uint256 _itemId, ItemStructs.Attribute _attr) external;

    function getAllItems() external view returns (uint256[] memory);

    function getItem(
        uint256 itemId
    ) external view returns (ItemStructs.Item memory);

    function getItemDrops(
        uint256 itemId
    ) external view returns (ItemStructs.ItemDrop[] memory);

    function getItemAttribute(
        uint256 itemId,
        ItemStructs.Attribute attribute
    ) external view returns (uint256);

    function getItemAttributes(
        uint256 itemId
    ) external view returns (ItemStructs.Attribute[] memory, uint256[] memory);

    function exists(uint256 itemId) external view returns (bool);
}
