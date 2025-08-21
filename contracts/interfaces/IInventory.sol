// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Inventory.sol";

interface IInventoryComponent {
    function setItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _durability,
        uint256 _expiration
    ) external;

    function getItems(
        address _player
    ) external view returns (InventoryItem[] memory);

    function getItem(
        address _player,
        uint256 _itemId
    ) external view returns (InventoryItem memory);

    function exists(
        address _player,
        uint256 _itemId
    ) external view returns (bool);

    function cleanupPlayerItems(address _player) external;
}
