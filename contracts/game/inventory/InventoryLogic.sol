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

    event AdminTrading(
        address indexed player1,
        address indexed player2,
        uint256[] item1Ids,
        uint256[] item1Amounts,
        uint256[] item2Ids,
        uint256[] item2Amounts,
        uint256 player1Sunlight,
        uint256 player2Sunlight
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

    function adminTrading(
        address _player1,
        address _player2,
        uint256[] calldata _item1Ids,
        uint256[] calldata _item1Amounts,
        uint256[] calldata _item2Ids,
        uint256[] calldata _item2Amounts,
        uint256 _player1Sunlight,
        uint256 _player2Sunlight
    ) external onlyAdmin {
        // Validate input
        require(_player1 != address(0), "Invalid player1 address");
        require(_player2 != address(0), "Invalid player2 address");
        require(_player1 != _player2, "Cannot trade with self");
        require(
            _item1Ids.length == _item1Amounts.length,
            "Item1 arrays length mismatch"
        );
        require(
            _item2Ids.length == _item2Amounts.length,
            "Item2 arrays length mismatch"
        );
        require(
            _item1Ids.length > 0 || _item2Ids.length > 0,
            "At least one item must be traded"
        );

        // Check if both players exist
        Player memory player1Data = playerProxy.getPlayer(_player1);
        require(player1Data.level > 0, "Player1 not initialized");

        Player memory player2Data = playerProxy.getPlayer(_player2);
        require(player2Data.level > 0, "Player2 not initialized");

        // Validate and check player1's items
        for (uint256 i = 0; i < _item1Ids.length; i++) {
            require(
                _item1Amounts[i] > 0,
                "Item1 amount must be greater than 0"
            );
            require(
                _item1Amounts[i] <= MAX_QUANTITY,
                "Item1 amount exceeds maximum limit"
            );
            require(
                itemProxy.exists(_item1Ids[i]),
                "Item1 does not exist in game"
            );

            InventoryItem memory player1Item = inventoryProxy.getItem(
                _player1,
                _item1Ids[i]
            );
            require(
                player1Item.quantity >= _item1Amounts[i],
                "Player1 does not have enough item"
            );
            require(
                player1Item.quantity > 0,
                "Item does not exist in player1's inventory"
            );
        }

        // Validate and check player2's items
        for (uint256 i = 0; i < _item2Ids.length; i++) {
            require(
                _item2Amounts[i] > 0,
                "Item2 amount must be greater than 0"
            );
            require(
                _item2Amounts[i] <= MAX_QUANTITY,
                "Item2 amount exceeds maximum limit"
            );
            require(
                itemProxy.exists(_item2Ids[i]),
                "Item2 does not exist in game"
            );

            InventoryItem memory player2Item = inventoryProxy.getItem(
                _player2,
                _item2Ids[i]
            );
            require(
                player2Item.quantity >= _item2Amounts[i],
                "Player2 does not have enough item"
            );
            require(
                player2Item.quantity > 0,
                "Item does not exist in player2's inventory"
            );
        }

        // Check sunlight availability
        require(
            player1Data.sunlight >= _player1Sunlight,
            "Player1 does not have enough sunlight"
        );
        require(
            player2Data.sunlight >= _player2Sunlight,
            "Player2 does not have enough sunlight"
        );

        // Process player1's items (remove items being traded away)
        for (uint256 i = 0; i < _item1Ids.length; i++) {
            InventoryItem memory player1Item = inventoryProxy.getItem(
                _player1,
                _item1Ids[i]
            );
            uint256 newQuantity = player1Item.quantity - _item1Amounts[i];

            IInventoryComponent(address(inventoryProxy)).setItem(
                _player1,
                _item1Ids[i],
                newQuantity,
                player1Item.durability,
                player1Item.expiration
            );
        }

        // Process player2's items (remove items being traded away)
        for (uint256 i = 0; i < _item2Ids.length; i++) {
            InventoryItem memory player2Item = inventoryProxy.getItem(
                _player2,
                _item2Ids[i]
            );
            uint256 newQuantity = player2Item.quantity - _item2Amounts[i];

            IInventoryComponent(address(inventoryProxy)).setItem(
                _player2,
                _item2Ids[i],
                newQuantity,
                player2Item.durability,
                player2Item.expiration
            );
        }

        // Add player2's items to player1's inventory
        for (uint256 i = 0; i < _item2Ids.length; i++) {
            InventoryItem memory player1ExistingItem = inventoryProxy.getItem(
                _player1,
                _item2Ids[i]
            );
            InventoryItem memory player2Item = inventoryProxy.getItem(
                _player2,
                _item2Ids[i]
            );

            uint256 newQuantity = player1ExistingItem.quantity +
                _item2Amounts[i];
            require(
                newQuantity >= player1ExistingItem.quantity,
                "Player1 item quantity overflow"
            );
            require(
                newQuantity <= MAX_QUANTITY,
                "Player1 item exceeds maximum quantity"
            );

            if (player1ExistingItem.quantity > 0) {
                // Keep player1's existing durability and expiration
                IInventoryComponent(address(inventoryProxy)).setItem(
                    _player1,
                    _item2Ids[i],
                    newQuantity,
                    player1ExistingItem.durability,
                    player1ExistingItem.expiration
                );
            } else {
                // Use player2's durability and expiration for new item
                IInventoryComponent(address(inventoryProxy)).setItem(
                    _player1,
                    _item2Ids[i],
                    newQuantity,
                    player2Item.durability,
                    player2Item.expiration
                );
            }
        }

        // Add player1's items to player2's inventory
        for (uint256 i = 0; i < _item1Ids.length; i++) {
            InventoryItem memory player2ExistingItem = inventoryProxy.getItem(
                _player2,
                _item1Ids[i]
            );
            InventoryItem memory player1Item = inventoryProxy.getItem(
                _player1,
                _item1Ids[i]
            );

            uint256 newQuantity = player2ExistingItem.quantity +
                _item1Amounts[i];
            require(
                newQuantity >= player2ExistingItem.quantity,
                "Player2 item quantity overflow"
            );
            require(
                newQuantity <= MAX_QUANTITY,
                "Player2 item exceeds maximum quantity"
            );

            if (player2ExistingItem.quantity > 0) {
                // Keep player2's existing durability and expiration
                IInventoryComponent(address(inventoryProxy)).setItem(
                    _player2,
                    _item1Ids[i],
                    newQuantity,
                    player2ExistingItem.durability,
                    player2ExistingItem.expiration
                );
            } else {
                // Use player1's durability and expiration for new item
                IInventoryComponent(address(inventoryProxy)).setItem(
                    _player2,
                    _item1Ids[i],
                    newQuantity,
                    player1Item.durability,
                    player1Item.expiration
                );
            }
        }

        // Update sunlight for both players
        if (_player1Sunlight > 0) {
            playerProxy.subtractSunlight(_player1, _player1Sunlight);
            playerProxy.addSunlight(_player2, _player1Sunlight);
        }
        if (_player2Sunlight > 0) {
            playerProxy.subtractSunlight(_player2, _player2Sunlight);
            playerProxy.addSunlight(_player1, _player2Sunlight);
        }

        emit AdminTrading(
            _player1,
            _player2,
            _item1Ids,
            _item1Amounts,
            _item2Ids,
            _item2Amounts,
            _player1Sunlight,
            _player2Sunlight
        );
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
