// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../struct/ItemPass.sol";
import "../../struct/Inventory.sol";
import "../../struct/Item.sol";

contract ItemPassLogic {
    /// @notice Reference to the World contract that manages system authorization
    IWorld public world;

    /// @notice Inventory component contract
    IInventoryComponent public inventoryProxy;

    /// @notice Item component contract
    IItemComponent public itemProxy;

    /// @notice Mapping lưu trữ thông tin ItemPass của từng người chơi
    mapping(address => ItemPassStruct) public listPassActive; // để qua component

    /// @notice Sự kiện được bắn ra khi kích hoạt thành công
    event ItemPassActivated(
        address indexed player,
        uint256 itemId,
        uint256 beginTime,
        uint256 endTime
    );

    constructor(address _world, address _inventoryProxy, address _itemProxy) {
        world = IWorld(_world);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
    }

    /**
     * @notice Kích hoạt Item Pass cho người chơi
     * @dev Kiểm tra số lượng item, trừ item và cập nhật thời gian active
     * @param _itemId ID của vật phẩm dùng để kích hoạt
     */
    function activeItemPass(uint256 _itemId) external {
        address player = msg.sender;

        InventoryItem memory userItem = inventoryProxy.getItem(player, _itemId);

        require(userItem.quantity > 0, "ItemPass: Insufficient item quantity");

        uint64 duration = uint64(
            itemProxy.getItemAttribute(
                _itemId,
                ItemStructs.Attribute.GrowthRate
            )
        );

        require(duration > 0, "ItemPass: Item has no duration attribute");

        ItemPassStruct storage pass = listPassActive[player];
        uint64 currentTime = uint64(block.timestamp);

        if (pass.endTime < currentTime) {
            // Trường hợp 1: Chưa có pass hoặc pass cũ đã hết hạn
            // beginTime là thời gian hiện tại
            pass.beginTime = currentTime;
            // endTime là hiện tại + duration
            pass.endTime = currentTime + duration;
        } else {
            // Trường hợp 2: Pass đang còn hiệu lực -> Cộng dồn thời gian
            // beginTime giữ nguyên
            // endTime được cộng thêm duration vào thời gian kết thúc cũ
            pass.endTime += duration;
        }

        // Giảm số lượng đi 1, giữ nguyên durability và expiration cũ
        inventoryProxy.setItem(
            player,
            _itemId,
            userItem.quantity - 1,
            userItem.durability,
            userItem.expiration
        );

        emit ItemPassActivated(player, _itemId, pass.beginTime, pass.endTime);
    }

    /**
     * @notice Lấy thông tin Pass hiện tại của người chơi
     * @param _player The address of the player
     */
    function getItemPass(
        address _player
    ) external view returns (ItemPassStruct memory) {
        return listPassActive[_player];
    }

    /**
     * @notice check player has active item pass
     * @param _player The address of the player
     */
    function checkActiveItemPass(address _player) external view returns (bool) {
        ItemPassStruct storage pass = listPassActive[_player];
        uint64 currentTime = uint64(block.timestamp);
        return pass.endTime > currentTime;
    }
}
