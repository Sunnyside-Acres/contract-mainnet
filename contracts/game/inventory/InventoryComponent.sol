// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Inventory.sol";

contract InventoryComponent {
    address public world;
    address public admin;
    address public implementation;

    mapping(address => mapping(uint256 => InventoryItem)) public inventory;
    mapping(address => uint256[]) public playerItems;

    event ItemAdded(
        address indexed player,
        uint256 indexed itemId,
        uint256 quantity
    );
    event ItemRemoved(address indexed player, uint256 indexed itemId);
    event ItemUpdated(
        address indexed player,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 durability,
        uint256 expiration
    );

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    function addItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity
    ) external onlyAuthorized {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_itemId > 0, "Invalid item ID");

        // Nếu item đã tồn tại, cập nhật số lượng
        if (inventory[_player][_itemId].quantity > 0) {
            uint256 newQuantity = inventory[_player][_itemId].quantity +
                _quantity;
            require(
                newQuantity >= inventory[_player][_itemId].quantity,
                "Quantity overflow"
            );
            inventory[_player][_itemId].quantity = newQuantity;
        } else {
            // Tạo item mới
            uint256 instanceId = uint256(
                keccak256(abi.encodePacked(_player, _itemId, block.timestamp))
            );

            inventory[_player][_itemId] = InventoryItem({
                itemId: _itemId,
                quantity: _quantity,
                instanceId: instanceId,
                durability: 100,
                expiration: 0
            });

            playerItems[_player].push(_itemId);
        }

        emit ItemAdded(_player, _itemId, _quantity);
    }

    function setItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity,
        uint256 _durability,
        uint256 _expiration
    ) external onlyAuthorized {
        require(_quantity >= 0, "Quantity cannot be negative");
        require(_durability <= 100, "Durability cannot exceed 100");

        if (_quantity == 0) {
            // Nếu quantity = 0, xóa item
            removeItem(_player, _itemId);
        } else {
            // Cập nhật thông tin item
            inventory[_player][_itemId].quantity = _quantity;
            inventory[_player][_itemId].durability = _durability;
            inventory[_player][_itemId].expiration = _expiration;

            // Nếu item chưa có trong danh sách, thêm vào
            if (!_hasItem(_player, _itemId)) {
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

    function removeItem(address _player, uint256 _itemId) internal {
        require(
            inventory[_player][_itemId].quantity > 0,
            "Item not found in inventory"
        );

        // Xóa item khỏi mapping
        delete inventory[_player][_itemId];

        // Xóa item khỏi mảng playerItems
        uint256[] storage items = playerItems[_player];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] == _itemId) {
                // Thay thế phần tử cần xóa bằng phần tử cuối cùng
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }

        emit ItemRemoved(_player, _itemId);
    }

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

    function getItems(
        address _playerAddress
    ) external view returns (InventoryItem[] memory) {
        uint256 itemCount = playerItems[_playerAddress].length;
        InventoryItem[] memory items = new InventoryItem[](itemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            items[i] = inventory[_playerAddress][
                playerItems[_playerAddress][i]
            ];
        }
        return items;
    }

    function getItem(
        address _player,
        uint256 _itemId
    ) external view returns (InventoryItem memory) {
        return inventory[_player][_itemId];
    }

    function exists(
        address _player,
        uint256 _itemId
    ) external view returns (bool) {
        return inventory[_player][_itemId].quantity > 0;
    }
}
