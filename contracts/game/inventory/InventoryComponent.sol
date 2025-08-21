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
            // Nếu quantity = 0, xóa item
            removeItem(_player, _itemId);
        } else {
            // Kiểm tra xem item đã tồn tại chưa
            bool itemExists = inventory[_player][_itemId].quantity > 0;

            if (itemExists) {
                // Cập nhật thông tin item đã tồn tại
                inventory[_player][_itemId].quantity = _quantity;
                inventory[_player][_itemId].durability = _durability;
                inventory[_player][_itemId].expiration = _expiration;
            } else {
                // Tạo item mới với đầy đủ thông tin
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

                // Thêm vào danh sách playerItems
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
                if (i < items.length - 1) {
                    items[i] = items[items.length - 1];
                }
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
        uint256[] storage itemIds = playerItems[_playerAddress];
        uint256 validItemCount = 0;

        // Đếm số lượng item hợp lệ
        for (uint256 i = 0; i < itemIds.length; i++) {
            if (inventory[_playerAddress][itemIds[i]].quantity > 0) {
                validItemCount++;
            }
        }

        // Tạo mảng với kích thước chính xác
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

    // Hàm dọn dẹp playerItems array, loại bỏ những item không còn tồn tại
    function cleanupPlayerItems(address _player) external onlyAuthorized {
        uint256[] storage items = playerItems[_player];
        uint256 i = 0;
        while (i < items.length) {
            if (inventory[_player][items[i]].quantity == 0) {
                // Thay thế phần tử cần xóa bằng phần tử cuối cùng
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
