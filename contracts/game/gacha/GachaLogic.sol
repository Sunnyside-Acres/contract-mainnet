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
 * @author RYG.Labs
 * @notice Logic contract for the item opening system - handles item opening and random drops
 * @dev Implements gacha/lootbox mechanics with weighted probability
 *
 * Key Features:
 * - Open items to receive drop items
 * - Random drop based on item probability
 * - Add items to inventory
 */
contract GachaLogic {
    /// @notice World contract for access control
    IWorld public world;

    /// @notice Player component contract
    IPlayerComponent public playerProxy;

    /// @notice Inventory component contract
    IInventoryComponent public inventoryProxy;

    /// @notice Item component contract
    IItemComponent public itemProxy;

    // ============ CONSTANTS ============
    /// @notice Basis points for probability calculations (100% = 10000 basis points)
    uint256 public constant BASIS_POINTS = 10000;

    // ============ EVENTS ============
    /// @notice Emitted when an item is opened
    /// @param itemId The ID of the item opened
    /// @param player The address of the player
    /// @param droppedItemId The ID of the dropped item
    /// @param droppedQuantity The quantity of the dropped item
    event ItemOpened(
        uint256 indexed itemId,
        address indexed player,
        uint256 droppedItemId,
        uint256 droppedQuantity
    );

    // ============ MODIFIERS ============
    /// @notice Restricts access to admin only
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Restricts access to registered logic contracts only
    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    // ============ CONSTRUCTOR ============
    /**
     * @notice Constructor to initialize the gacha logic contract
     * @param _world The address of the World contract
     * @param _playerProxy The address of the Player component
     * @param _inventoryProxy The address of the Inventory component
     * @param _itemProxy The address of the Item component
     */
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
     * @notice Open an item to receive drop items
     * @dev Randomly selects one item from the drop table based on probability
     * @param _itemId The ID of the item to open
     */
    function openItem(uint256 _itemId) external {
        // Check if item exists
        require(itemProxy.exists(_itemId), "Item does not exist");

        // Check if player has this item in inventory
        require(
            inventoryProxy.exists(msg.sender, _itemId),
            "You don't have this item"
        );

        // Get item drop information
        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(_itemId);
        require(drops.length > 0, "This item has no drops");

        // Process random drop - select only 1 item
        uint256 randomValue = _generateRandomNumber() % BASIS_POINTS;
        uint256 cumulativeProbability = 0;
        uint256 selectedItemId = 0;
        uint256 selectedQuantity = 0;
        bool foundDrop = false;

        // Find first item with matching probability
        for (uint256 i = 0; i < drops.length; i++) {
            cumulativeProbability += drops[i].probability;
            if (randomValue < cumulativeProbability) {
                selectedItemId = drops[i].itemId;
                selectedQuantity = drops[i].yield;
                foundDrop = true;
                break;
            }
        }

        // If item was dropped, add to inventory
        if (foundDrop) {
            // Get current quantity of item in inventory
            InventoryItem memory existingItem = inventoryProxy.getItem(
                msg.sender,
                selectedItemId
            );
            uint256 currentQuantity = existingItem.quantity;
            uint256 newQuantity1 = currentQuantity + selectedQuantity;

            // Add item to inventory (add to existing quantity)
            inventoryProxy.setItem(
                msg.sender,
                selectedItemId,
                newQuantity1,
                100, // 100% durability
                0 // No expiration
            );

            // Emit event with single item
            emit ItemOpened(
                _itemId,
                msg.sender,
                selectedItemId,
                selectedQuantity
            );
        } else {
            // If no item was dropped, emit event with 0
            emit ItemOpened(_itemId, msg.sender, 0, 0);
        }

        // Remove 1 opened item from inventory
        // Note: exists() check at line 101-104 already ensures quantity > 0
        InventoryItem memory currentItem = inventoryProxy.getItem(
            msg.sender,
            _itemId
        );

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
     * @dev Generate a random number
     * @return A random uint256 value
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
     * @notice Get drop information for an item
     * @param _itemId The ID of the item
     * @return Array of ItemDrop structs
     */
    function getItemDrops(
        uint256 _itemId
    ) external view returns (ItemStructs.ItemDrop[] memory) {
        return itemProxy.getItemDrops(_itemId);
    }

    /**
     * @notice Check if a player can open an item
     * @param _itemId The ID of the item
     * @param _player The player's address
     * @return success True if player can open the item
     * @return message Description of the result
     */
    function canOpenItem(
        uint256 _itemId,
        address _player
    ) external view returns (bool, string memory) {
        // Check if item exists
        if (!itemProxy.exists(_itemId)) {
            return (false, "Item does not exist");
        }

        // Check if player has this item in inventory (quantity > 0)
        if (!inventoryProxy.exists(_player, _itemId)) {
            return (false, "You don't have this item");
        }

        // Check if item has drops
        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(_itemId);
        if (drops.length == 0) {
            return (false, "This item has no drops");
        }

        return (true, "Can open item");
    }
}
