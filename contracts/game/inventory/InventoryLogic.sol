// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/Inventory.sol";
import "../../struct/Player.sol";

contract InventoryLogic {
    IWorld public world;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    IPlayerComponent public playerProxy;

    event ItemAdded(
        address indexed player,
        uint256 indexed itemId,
        uint256 quantity
    );
    event ItemTransferred(
        address indexed player,
        address indexed to,
        uint256 indexed itemId
    );

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

    constructor(
        address _world,
        address _inventoryProxy,
        address _itemProxy,
        address _playerProxy
    ) {
        world = IWorld(_world);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    uint256 constant MAX_QUANTITY = 1000000;

    function addItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity
    ) external onlyAdmin {
        // Validate input
        require(_player != address(0), "Invalid player address");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_quantity <= MAX_QUANTITY, "Quantity exceeds maximum limit");

        // Check if item exists in game
        require(itemProxy.exists(_itemId), "Item does not exist in game");

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(_player);
        require(playerData.level > 0, "Player not initialized");

        // Check if item already exists in player's inventory
        bool itemExists = inventoryProxy.exists(_player, _itemId);

        uint256 newQuantity;
        uint256 durability;
        uint256 expiration;

        if (itemExists) {
            // Get current item data
            InventoryItem memory currentItem = inventoryProxy.getItem(
                _player,
                _itemId
            );

            // Calculate new quantity with overflow check
            newQuantity = currentItem.quantity + _quantity;
            require(newQuantity >= currentItem.quantity, "Quantity overflow");
            require(newQuantity <= MAX_QUANTITY, "Exceeds maximum quantity");

            // Keep existing values
            durability = currentItem.durability;
            expiration = currentItem.expiration;
        } else {
            // Item doesn't exist, set new quantity directly
            newQuantity = _quantity;
            require(newQuantity <= MAX_QUANTITY, "Exceeds maximum quantity");

            // Set default values for new item
            durability = 100;
            expiration = 0;
        }

        // Update inventory
        IInventoryComponent(address(inventoryProxy)).setItem(
            _player,
            _itemId,
            newQuantity,
            durability,
            expiration
        );

        emit ItemAdded(_player, _itemId, _quantity);
    }

    function transferItem(
        address to,
        uint256 itemId,
        uint256 quantity
    ) external {
        // Validate input
        require(to != address(0), "Invalid recipient address");
        require(to != msg.sender, "Cannot transfer to self");
        require(quantity > 0, "Quantity must be greater than 0");
        require(quantity <= MAX_QUANTITY, "Quantity exceeds maximum limit");

        address player = msg.sender;

        // Check if both players exist
        Player memory senderData = playerProxy.getPlayer(player);
        require(senderData.level > 0, "Sender not initialized");

        Player memory recipientData = playerProxy.getPlayer(to);
        require(recipientData.level > 0, "Recipient not initialized");

        // Check sender's item
        InventoryItem memory senderItem = inventoryProxy.getItem(
            player,
            itemId
        );
        require(senderItem.quantity >= quantity, "Not enough items");
        require(
            senderItem.quantity > 0,
            "Item does not exist in sender's inventory"
        );

        // Calculate new quantities with checks
        uint256 senderNewQuantity = senderItem.quantity - quantity;

        // Get recipient's current item
        InventoryItem memory recipientItem = inventoryProxy.getItem(to, itemId);
        uint256 recipientNewQuantity = recipientItem.quantity + quantity;

        // Check for recipient's quantity overflow
        require(
            recipientNewQuantity >= recipientItem.quantity,
            "Recipient quantity overflow"
        );
        require(
            recipientNewQuantity <= MAX_QUANTITY,
            "Recipient exceeds maximum quantity"
        );

        // Update sender's inventory
        IInventoryComponent(address(inventoryProxy)).setItem(
            player,
            itemId,
            senderNewQuantity,
            senderItem.durability,
            senderItem.expiration
        );

        // Update recipient's inventory
        if (recipientItem.quantity > 0) {
            // Keep recipient's existing durability and expiration
            IInventoryComponent(address(inventoryProxy)).setItem(
                to,
                itemId,
                recipientNewQuantity,
                recipientItem.durability,
                recipientItem.expiration
            );
        } else {
            // Use sender's durability and expiration for new item
            IInventoryComponent(address(inventoryProxy)).setItem(
                to,
                itemId,
                recipientNewQuantity,
                senderItem.durability,
                senderItem.expiration
            );
        }

        emit ItemTransferred(player, to, itemId);
    }

    function getItem(
        address _playerAddress,
        uint256 _itemId
    ) external view returns (InventoryItem memory) {
        return inventoryProxy.getItem(_playerAddress, _itemId);
    }

    function getInventory(
        address _playerAddress
    ) external view returns (InventoryItem[] memory) {
        return inventoryProxy.getItems(_playerAddress);
    }

    function cleanupPlayerItems(address _player) external onlyAdmin {
        inventoryProxy.cleanupPlayerItems(_player);
    }
}
