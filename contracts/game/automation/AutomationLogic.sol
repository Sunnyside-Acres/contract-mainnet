// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IAutomation.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract AutomationLogic {
    IWorld public world;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    IAutomationComponent public automationProxy;

    /// @notice Nonces for replay protection
    mapping(address => uint256) public nonces;

    event ItemActivated(
        address indexed player,
        uint256 itemId,
        uint256 itemAmount,
        uint256[] itemIdSupport,
        uint256[] itemAmountSupport,
        uint256[] itemIdDrop,
        uint256[] itemAmountDrop,
        uint64 startTime,
        uint64 endTime
    );

    constructor(
        address _world,
        address _inventoryProxy,
        address _itemProxy,
        address _automationProxy
    ) {
        world = IWorld(_world);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
        automationProxy = IAutomationComponent(_automationProxy);
    }

    function activeAuto(
        uint256[] calldata _itemIdActives,
        uint256[] calldata _itemAmountActives,
        uint256 _itemId,
        uint256 _itemAmount,
        uint256[] calldata _itemIdSupport,
        uint256[] calldata _itemAmountSupport,
        bytes calldata _proof
    ) external {
        bytes32 message = keccak256(
            abi.encodePacked(
                msg.sender,
                address(this),
                _itemIdActives,
                _itemAmountActives,
                _itemId,
                _itemAmount,
                _itemIdSupport,
                _itemAmountSupport,
                nonces[msg.sender]
            )
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            message
        );
        address signer = ECDSA.recover(ethSignedMessageHash, _proof);
        require(
            IWorld(world).isAdmin(signer),
            "Invalid proof: not signed by admin"
        );
        nonces[msg.sender]++;

        _validateAndDeductItems(
            msg.sender,
            _itemIdActives,
            _itemAmountActives,
            _itemId,
            _itemAmount,
            _itemIdSupport,
            _itemAmountSupport
        );

        // Get automation info for the item
        // ItemAutoStruct memory itemAutoInfo = automationProxy.getItemAutoInfo(
        //     msg.sender,
        //     _itemId
        // );
        // if (itemAutoInfo.startTime > 0) {
        //     ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        //     if (item.itemType == ItemStructs.ItemType.Livestock) {
        //         automationProxy.setItemsAuto(
        //             msg.sender,
        //             _itemId,
        //             itemAutoInfo.itemAmount,
        //             itemAutoInfo.itemIdDrop,
        //             itemAutoInfo.,
        //             uint64(block.timestamp),
        //             itemAutoInfo.
        //         );
        //     }
        // }

        // uint256 itemAmountDrop =
        // emit ItemActivated(
        //     msg.sender,
        //     _itemId,
        //     _itemAmount,
        //     _itemIdSupport,
        //     _itemAmountSupport,
        //     itemProxy.getItemDrops(_itemId).itemId,
        //     itemProxy.getItemDrops(_itemId).itemAmountDrop,
        //     itemAutoInfo.itemAmountDrop,
        //     itemAutoInfo.startTime,
        //     itemAutoInfo.endTime
        // );
    }

    function _validateAndDeductItems(
        address player,
        uint256[] calldata _itemIdActives,
        uint256[] calldata _itemAmountActives,
        uint256 _itemId,
        uint256 _itemAmount,
        uint256[] calldata _itemIdSupport,
        uint256[] calldata _itemAmountSupport
    ) internal {
        require(automationProxy.checkItemsAutoIsCompleted(player, _itemId), "Item is not completed");
        require(
            _itemIdActives.length == _itemAmountActives.length,
            "Array length item active mismatch"
        );

        for (uint8 i = 0; i < _itemIdActives.length; i++) {
            require(
                inventoryProxy.exists(player, _itemIdActives[i]),
                "Item active not exists"
            );
            InventoryItem memory itemActive = inventoryProxy.getItem(
                player,
                _itemIdActives[i]
            );
            require(
                itemActive.quantity >= _itemAmountActives[i],
                "Insufficient item active quantity"
            );
            inventoryProxy.setItem(
                player,
                _itemIdActives[i],
                itemActive.quantity - _itemAmountActives[i],
                itemActive.durability,
                itemActive.expiration
            );
        }

        require(inventoryProxy.exists(player, _itemId), "Item not exists");
        InventoryItem memory item = inventoryProxy.getItem(player, _itemId);
        require(item.quantity >= _itemAmount, "Insufficient item quantity");
        inventoryProxy.setItem(
            player,
            _itemId,
            item.quantity - _itemAmount,
            item.durability,
            item.expiration
        );

        require(
            (_itemIdSupport.length == _itemAmountSupport.length),
            "Array length item support mismatch"
        );

        for (uint8 i = 0; i < _itemIdSupport.length; i++) {
            require(
                inventoryProxy.exists(player, _itemId),
                "Item support not exists"
            );
            InventoryItem memory supportItem = inventoryProxy.getItem(
                player,
                _itemIdSupport[i]
            );
            require(
                supportItem.quantity >= _itemAmountSupport[i],
                "Insufficient support item quantity"
            );
            inventoryProxy.setItem(
                player,
                _itemIdSupport[i],
                supportItem.quantity - _itemAmountSupport[i],
                supportItem.durability,
                supportItem.expiration
            );
        }
    }
}
