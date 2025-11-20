// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../struct/ItemPass.sol";
import "../../struct/Inventory.sol";
import "../../struct/Item.sol";
import "../../interfaces/IItemPass.sol";

contract ItemPassLogic {
    IWorld public world;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    IItemPassComponent public itemPassProxy;

    event ItemPassActivated(
        address indexed player,
        uint256 itemId,
        uint256 beginTime,
        uint256 endTime
    );

    constructor(
        address _world,
        address _inventoryProxy,
        address _itemProxy,
        address _itemPassProxy
    ) {
        world = IWorld(_world);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
        itemPassProxy = IItemPassComponent(_itemPassProxy);
    }

    function activeItemPass(uint256 _itemId) external {
        require(
            _itemId == 120 ||
                _itemId == 121 ||
                _itemId == 122 ||
                _itemId == 123 ||
                _itemId == 124,
            "ItemPass: Invalid Pass Item ID"
        );
        address player = msg.sender;

        // Get item from inventory to check a quantity
        InventoryItem memory userItem = inventoryProxy.getItem(player, _itemId);
        require(userItem.quantity > 0, "ItemPass: Insufficient item quantity");

        // Get information duration from Item attribute
        uint64 duration = uint64(
            itemProxy.getItemAttribute(
                _itemId,
                ItemStructs.Attribute.GrowthRate
            )
        );
        require(duration > 0, "ItemPass: Item has no duration attribute");

        // Get current pass from Component
        ItemPassStruct memory pass = itemPassProxy.getPass(player);
        uint64 currentTime = uint64(block.timestamp);

        uint64 newBeginTime;
        uint64 newEndTime;

        // Calculator logic time
        if (pass.endTime < currentTime) {
            // Old Pass expired or not yet -> Reset
            newBeginTime = currentTime;
            newEndTime = currentTime + duration;
        } else {
            // Pass is stilling valid -> cumulative
            newBeginTime = pass.beginTime;
            newEndTime = pass.endTime + duration;
        }

        // Deduct item in Inventory
        inventoryProxy.setItem(
            player,
            _itemId,
            userItem.quantity - 1,
            userItem.durability,
            userItem.expiration
        );

        // Save new data into Component
        itemPassProxy.setPass(player, newBeginTime, newEndTime);

        emit ItemPassActivated(player, _itemId, newBeginTime, newEndTime);
    }

    function getItemPass(
        address _player
    ) external view returns (ItemPassStruct memory) {
        return itemPassProxy.getPass(_player);
    }

    function checkActiveItemPass(address _player) external view returns (bool) {
        ItemPassStruct memory pass = itemPassProxy.getPass(_player);
        uint64 currentTime = uint64(block.timestamp);
        return pass.endTime > currentTime;
    }
}
