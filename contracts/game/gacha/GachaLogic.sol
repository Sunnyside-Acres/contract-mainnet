// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../struct/Player.sol";
import "../../struct/Inventory.sol";
import "../../struct/Item.sol";

/**
 * @title GachaLogic
 * @dev Logic contract cho hệ thống mở item - xử lý logic mở item và random drop
 *
 * Tính năng chính:
 * - Mở item để nhận drop items
 * - Random drop dựa trên probability của item
 * - Thêm items vào inventory
 */
contract GachaLogic {
    IWorld public world;
    IPlayerComponent public playerProxy;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;

    // ============ CONSTANTS ============
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points

    // ============ EVENTS ============
    event ItemOpened(
        uint256 indexed itemId,
        address indexed player,
        uint256 droppedItemId,
        uint256 droppedQuantity
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
    constructor(
        address _world,
        address _playerProxy,
        address _inventoryProxy,
        address _itemProxy
    ) {
        world = IWorld(_world);
        playerProxy = IPlayerComponent(_playerProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
    }

    // ============ USER FUNCTIONS ============

    /**
     * @dev User mở item để nhận drop items
     * @param _itemId ID của item cần mở
     */
    function openItem(uint256 _itemId) external {
        // Kiểm tra item có tồn tại không
        require(itemProxy.exists(_itemId), "Item does not exist");

        // Kiểm tra player có item này trong inventory không
        require(
            inventoryProxy.exists(msg.sender, _itemId),
            "You don't have this item"
        );

        // Lấy thông tin drop của item
        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(_itemId);
        require(drops.length > 0, "This item has no drops");

        // Xử lý random drop - chỉ chọn 1 item
        uint256 randomValue = _generateRandomNumber() % BASIS_POINTS;
        uint256 cumulativeProbability = 0;
        uint256 selectedItemId = 0;
        uint256 selectedQuantity = 0;
        bool foundDrop = false;

        // Tìm item đầu tiên có probability phù hợp
        for (uint256 i = 0; i < drops.length; i++) {
            cumulativeProbability += drops[i].probability;
            if (randomValue < cumulativeProbability) {
                selectedItemId = drops[i].itemId;
                selectedQuantity = drops[i].yield;
                foundDrop = true;
                break;
            }
        }

        // Nếu có item được drop, thêm vào inventory
        if (foundDrop) {
            // Lấy số lượng hiện tại của item trong inventory
            InventoryItem memory existingItem = inventoryProxy.getItem(
                msg.sender,
                selectedItemId
            );
            uint256 currentQuantity = existingItem.quantity;
            uint256 newQuantity1 = currentQuantity + selectedQuantity;

            // Thêm item vào inventory (cộng thêm vào số lượng đã có)
            inventoryProxy.setItem(
                msg.sender,
                selectedItemId,
                newQuantity1,
                100, // 100% durability
                0 // Không expiration
            );

            // Emit event với 1 item duy nhất
            emit ItemOpened(
                _itemId,
                msg.sender,
                selectedItemId,
                selectedQuantity
            );
        } else {
            // Nếu không có item nào được drop, emit event với 0
            emit ItemOpened(_itemId, msg.sender, 0, 0);
        }

        // Trừ 1 item đã mở khỏi inventory
        InventoryItem memory currentItem = inventoryProxy.getItem(
            msg.sender,
            _itemId
        );
        require(currentItem.quantity > 0, "No items to consume");

        uint256 newQuantity = currentItem.quantity - 1;
        inventoryProxy.setItem(
            msg.sender,
            _itemId,
            newQuantity,
            currentItem.durability,
            currentItem.expiration
        );
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Tạo số ngẫu nhiên
     */
    function _generateRandomNumber() internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.gaslimit,
                        msg.sender,
                        block.number,
                        blockhash(block.number - 1)
                    )
                )
            );
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Lấy thông tin drop của item
     */
    function getItemDrops(
        uint256 _itemId
    ) external view returns (ItemStructs.ItemDrop[] memory) {
        return itemProxy.getItemDrops(_itemId);
    }

    /**
     * @dev Kiểm tra player có thể mở item không
     */
    function canOpenItem(
        uint256 _itemId,
        address _player
    ) external view returns (bool, string memory) {
        // Kiểm tra item có tồn tại không
        if (!itemProxy.exists(_itemId)) {
            return (false, "Item does not exist");
        }

        // Kiểm tra player có item này trong inventory không
        if (!inventoryProxy.exists(_player, _itemId)) {
            return (false, "You don't have this item");
        }

        // Kiểm tra item có drop không
        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(_itemId);
        if (drops.length == 0) {
            return (false, "This item has no drops");
        }

        return (true, "Can open item");
    }
}
