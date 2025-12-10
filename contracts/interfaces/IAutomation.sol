// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Automation.sol";

interface IAutomationComponent {
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
    ) external;

    /**
     * @notice Get automation info for an item
     * @param player The address of the player
     * @param _itemId ID of the item
     * @return ItemAutoStruct containing automation details
     */
    function getItemAutoInfo(
        address player,
        uint256 _itemId
    ) external view returns (ItemAutoStruct memory);

    /**
     * @notice Check if automation for an item is completed
     * @param player The address of the player
     * @param _itemId ID of the item
     * @return bool indicating if automation is completed
     */
    function checkItemsAutoIsCompleted(
        address player,
        uint256 _itemId
    ) external view returns (bool);
}
