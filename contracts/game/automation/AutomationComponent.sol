// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Automation.sol";
import "../../interfaces/IWorld.sol";

contract AutomationComponent {
    address public world;
    address public implementation;

    // Storage must be same with Component
    mapping(address => mapping(uint256 => ItemAutoStruct)) public listItemAuto;
    event ItemAutoUpdated(
        address indexed player,
        uint256 itemId,
        uint256 itemAmount,
        uint256[] itemIdDrop,
        uint256[] itemAmountDrop,
        uint64 startTime,
        uint64 endTime
    );
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[AutomationComponent] Unauthorized"
        );
        _;
    }

    /**
     * @notice Set automation items for a player
     * @param player The address of the player
     * @param _itemId The ID of the item to set automation
     * @param _itemAmount The amount of the item to set automation for
     * @param _itemIdDrop The IDs of the items to drop
     * @param _itemAmountDrop The amounts of the items to drop
     * @param _startTime The start time for the automation
     * @param _endTime The end time for the automation
     */
    function setItemsAuto(
        address player,
        uint256 _itemId,
        uint256 _itemAmount,
        uint256[] calldata _itemIdDrop,
        uint256[] calldata _itemAmountDrop,
        uint64 _startTime,
        uint64 _endTime
    ) external onlyAuthorized {
        listItemAuto[player][_itemId] = ItemAutoStruct({
            itemAmount: _itemAmount,
            itemIdDrop: _itemIdDrop,
            itemAmountDrop: _itemAmountDrop,
            startTime: _startTime,
            endTime: _endTime
        });
        emit ItemAutoUpdated(
            player,
            _itemId,
            _itemAmount,
            _itemIdDrop,
            _itemAmountDrop,
            _startTime,
            _endTime
        );
    }

    /**
     * @notice Get automation info for an item
     * @param player The address of the player
     * @param _itemId ID of the item
     * @return ItemAutoStruct containing automation details
     */
    function getItemAutoInfo(
        address player,
        uint256 _itemId
    ) external view returns (ItemAutoStruct memory) {
        return listItemAuto[player][_itemId];
    }

    /**
     * @notice Check if automation for an item is completed
     * @param player The address of the player
     * @param _itemId ID of the item
     * @return bool indicating if automation is completed
     */
    function checkItemsAutoIsCompleted(
        address player,
        uint256 _itemId
    ) external view returns (bool) {
        return listItemAuto[player][_itemId].endTime <= uint64(block.timestamp);
    }
}
