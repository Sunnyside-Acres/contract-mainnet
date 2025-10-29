// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INPCMarketNative.sol";
import "./NPCMarketNativeComponent.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/NPCMarketNative.sol";
import "../../struct/Inventory.sol";
import "../../struct/Item.sol";
import "../../struct/Player.sol";

/**
 * @title NPCMarketNativeLogic
 * @author RYG.Labs
 * @notice Logic contract for NPC Market system using native token (ETH)
 * @dev Manages all gameplay mechanics for buying and selling items with NPCs using ETH
 *
 * Key Features:
 * - Manage NPC markets with ETH payments
 * - Buy items from NPCs with per-user limits
 * - Sell items to NPCs for ETH
 * - Track player transaction history
 * - Manage prices and trade limits in wei
 * - Daily purchase limit resets
 * - Reentrancy protection
 * - Emergency withdrawal functionality
 */
contract NPCMarketNativeLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice NPC Market component for market data
    NPCMarketNativeComponent public npcMarketProxy;
    /// @notice Item component for item information
    IItemComponent public itemProxy;
    /// @notice Inventory component for player inventory management
    IInventoryComponent public inventoryProxy;
    /// @notice Player component for player data
    IPlayerComponent public playerProxy;

    // ============ CONSTANTS ============

    /// @notice Maximum amount allowed per transaction
    uint256 public constant MAX_TRANSACTION_AMOUNT = 1000000;

    /// @notice Number of seconds in a day for daily reset calculations
    uint256 public constant SECONDS_PER_DAY = 86400;

    // ============ STATE VARIABLES ============

    /// @dev Reentrancy guard flag
    bool private _locked;

    /// @notice Tracks last reset day for each NPC market
    mapping(uint256 => uint256) public lastResetDay;

    // ============ EVENTS ============

    /// @notice Emitted when a player purchases items from an NPC with ETH
    event ItemPurchasedWithETH(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice,
        uint256 transactionId
    );

    /// @notice Emitted when a player sells items to an NPC for ETH
    event ItemSoldForETH(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice,
        uint256 transactionId
    );

    /// @notice Emitted when a new NPC market is created
    event NPCMarketCreated(
        uint256 indexed npcId,
        string name,
        uint256 minTransactionAmount,
        uint256 maxTransactionAmount
    );

    /// @notice Emitted when an item is added to a market
    event ItemAddedToMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 limitPerUser,
        uint256 pricePerUnit,
        bool isSelling
    );

    /// @notice Emitted when an item's details are updated in a market
    event ItemUpdatedInMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 limitPerUser,
        uint256 pricePerUnit
    );

    /// @notice Emitted when an item is removed from a market
    event ItemRemovedFromMarket(uint256 indexed npcId, uint256 indexed itemId);

    /// @notice Emitted when market state changes
    event MarketStateChanged(uint256 indexed npcId, bool isActive);

    /// @notice Emitted when emergency withdrawal is executed
    event EmergencyWithdraw(
        address indexed admin,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when user purchases are reset
    event UserPurchasesReset(
        uint256 indexed npcId,
        uint256 indexed itemId,
        address indexed user
    );

    // ============ MODIFIERS ============

    /**
     * @dev Prevents reentrancy attacks
     * @notice Locks the contract during execution
     */
    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    /**
     * @dev Modifier to restrict access to admin only
     * @notice Reverts if caller is not an admin
     */
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /**
     * @dev Modifier to restrict access to registered logic contracts only
     * @notice Reverts if caller is not a registered logic contract
     */
    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    // ============ CONSTRUCTOR ============

    /**
     * @dev Initializes the NPCMarketNativeLogic contract with required dependencies
     * @param _world Address of the World contract
     * @param _npcMarketProxy Address of the NPCMarketNativeComponent proxy
     * @param _itemProxy Address of the ItemComponent proxy
     * @param _inventoryProxy Address of the InventoryComponent proxy
     * @param _playerProxy Address of the PlayerComponent proxy
     */
    constructor(
        address _world,
        address _npcMarketProxy,
        address _itemProxy,
        address _inventoryProxy,
        address _playerProxy
    ) {
        world = IWorld(_world);
        npcMarketProxy = NPCMarketNativeComponent(_npcMarketProxy);
        itemProxy = IItemComponent(_itemProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @dev Creates a new NPC Market (admin only)
     * @notice Initializes a new market for a specific NPC with ETH payment settings
     * @param _npcId ID of the NPC
     * @param _name Name of the NPC Market
     * @param _minTransactionAmount Minimum transaction amount in wei
     * @param _maxTransactionAmount Maximum transaction amount in wei
     *
     * Process:
     * 1. Validate input parameters
     * 2. Create NPC Market in component
     * 3. Emit NPCMarketCreated event
     */
    function createNPCMarket(
        uint256 _npcId,
        string memory _name,
        uint256 _minTransactionAmount,
        uint256 _maxTransactionAmount
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_name).length > 0, "NPC name cannot be empty");
        require(
            _minTransactionAmount > 0,
            "Min transaction amount must be greater than 0"
        );
        require(
            _maxTransactionAmount >= _minTransactionAmount,
            "Max must be >= min"
        );

        npcMarketProxy.createNPCMarket(
            _npcId,
            _name,
            _minTransactionAmount,
            _maxTransactionAmount
        );

        emit NPCMarketCreated(
            _npcId,
            _name,
            _minTransactionAmount,
            _maxTransactionAmount
        );
    }

    /**
     * @notice Adds an item to the NPC Market (admin only)
     * @dev Validates input parameters and checks if item exists before adding to market
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to add
     * @param _limitPerUser Purchase limit per user (0 = unlimited)
     * @param _pricePerUnit Price per unit in wei
     * @param _isSelling Whether NPC is selling (true) or buying (false) this item
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Valid Item ID (> 0)
     * - Price must be greater than 0
     * - Item must exist in the system
     *
     * Emits {ItemAddedToMarket} event
     */
    function addItemToMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_pricePerUnit > 0, "Price must be greater than 0");

        // Kiểm tra item tồn tại
        ItemStructs.Item memory itemData = itemProxy.getItem(_itemId);
        require(itemData.id > 0, "Item does not exist");

        npcMarketProxy.addItemToMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit,
            _isSelling
        );

        emit ItemAddedToMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit,
            _isSelling
        );
    }

    /**
     * @notice Updates an item's details in the NPC Market (admin only)
     * @dev Validates input parameters before updating item information
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to update
     * @param _limitPerUser New purchase limit per user (0 = unlimited)
     * @param _pricePerUnit New price per unit in wei
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Valid Item ID (> 0)
     * - Price must be greater than 0
     * - Item must already exist in the market
     *
     * Emits {ItemUpdatedInMarket} event
     */
    function updateItemInMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_pricePerUnit > 0, "Price must be greater than 0");

        npcMarketProxy.updateItemInMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit
        );

        emit ItemUpdatedInMarket(_npcId, _itemId, _limitPerUser, _pricePerUnit);
    }

    /**
     * @notice Removes an item from the NPC Market (admin only)
     * @dev Validates input parameters before removing item from market
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to remove
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Valid Item ID (> 0)
     *
     * Emits {ItemRemovedFromMarket} event
     */
    function removeItemFromMarket(
        uint256 _npcId,
        uint256 _itemId
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");

        npcMarketProxy.removeItemFromMarket(_npcId, _itemId);

        emit ItemRemovedFromMarket(_npcId, _itemId);
    }

    /**
     * @notice Sets market active status (admin only)
     * @param _npcId ID of the NPC market
     * @param _isActive Whether market is active
     */
    function setMarketActive(
        uint256 _npcId,
        bool _isActive
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        npcMarketProxy.setMarketActive(_npcId, _isActive);
        emit MarketStateChanged(_npcId, _isActive);
    }

    /**
     * @notice Allows a player to purchase items from an NPC with ETH
     * @dev Processes a buy transaction with reentrancy protection
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to purchase
     * @param _quantity The quantity to purchase
     * @return transactionId ID of the transaction
     *
     * Requirements:
     * - Valid NPC ID (> 0) and Item ID (> 0)
     * - Quantity must be between 1 and MAX_TRANSACTION_AMOUNT
     * - Market must be open
     * - Item must be available and NPC must be selling it
     * - Player must not exceed purchase limit for this item
     * - Player must send enough ETH
     * - Player must be initialized
     * - Item must not be banned
     *
     * Process:
     * 1. Validates all input parameters and market state
     * 2. Checks item availability and selling status
     * 3. Verifies user purchase limit
     * 4. Calculates total price with overflow protection
     * 5. Validates ETH amount sent
     * 6. Adds item to player's inventory
     * 7. Tracks purchase history
     * 8. Records transaction
     *
     * Emits {ItemPurchasedWithETH} event
     */
    function buyItemFromNPC(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external payable nonReentrant returns (uint256) {
        address player = msg.sender;

        // Validate inputs
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(
            _quantity <= MAX_TRANSACTION_AMOUNT,
            "Quantity exceeds maximum"
        );

        // Check if market is open
        require(npcMarketProxy.isMarketOpen(_npcId), "Market is closed");

        // Get market item
        NPCMarketNativeStructs.MarketItemView memory marketItem = npcMarketProxy
            .getMarketItem(_npcId, _itemId);
        require(marketItem.active, "Item not available in market");
        require(marketItem.isSelling, "NPC is not selling this item");

        // Check user purchase limit
        require(
            npcMarketProxy.canUserPurchaseMore(
                _npcId,
                _itemId,
                player,
                _quantity
            ),
            "Purchase limit exceeded for this user"
        );

        // Calculate total price (check for overflow)
        uint256 totalPrice = marketItem.pricePerUnit * _quantity;
        require(
            totalPrice / _quantity == marketItem.pricePerUnit,
            "Price overflow"
        );

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");

        // Validate ETH amount sent
        require(msg.value >= totalPrice, "Not enough ETH sent");

        // Get market info for validation
        (
            ,
            ,
            ,
            ,
            uint256 minTransactionAmount,
            uint256 maxTransactionAmount,
            ,

        ) = npcMarketProxy.getNPCMarketInfo(_npcId);

        require(
            msg.value >= minTransactionAmount,
            "Below minimum transaction amount"
        );
        require(
            msg.value <= maxTransactionAmount,
            "Above maximum transaction amount"
        );

        // Validate item exists and is not banned
        ItemStructs.Item memory itemData = itemProxy.getItem(_itemId);
        require(itemData.id > 0, "Item does not exist");
        require(!itemData.isBanned, "Item is banned");

        // Process transaction
        // 1. Add item to player inventory
        InventoryItem memory currentItem = inventoryProxy.getItem(
            player,
            _itemId
        );
        uint256 newQuantity = currentItem.quantity + _quantity;

        inventoryProxy.setItem(
            player,
            _itemId,
            newQuantity,
            currentItem.durability,
            currentItem.expiration
        );

        // 2. Track user purchase
        npcMarketProxy.addUserPurchase(_npcId, _itemId, player, _quantity);

        // 3. Record transaction
        uint256 transactionId = npcMarketProxy.recordTransaction(
            player,
            _npcId,
            _itemId,
            _quantity,
            marketItem.pricePerUnit,
            totalPrice,
            true // isBuy
        );

        // 4. Refund excess ETH if any
        if (msg.value > totalPrice) {
            uint256 refundAmount = msg.value - totalPrice;
            (bool refundSuccess, ) = payable(player).call{value: refundAmount}(
                ""
            );
            require(refundSuccess, "Refund failed");
        }

        emit ItemPurchasedWithETH(
            player,
            _npcId,
            _itemId,
            _quantity,
            totalPrice,
            transactionId
        );
        return transactionId;
    }

    /**
     * @notice Allows a player to sell items to an NPC for ETH
     * @dev Processes a sell transaction with reentrancy protection
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to sell
     * @param _quantity The quantity to sell
     * @return transactionId ID of the transaction
     *
     * Requirements:
     * - Valid NPC ID (> 0) and Item ID (> 0)
     * - Quantity must be between 1 and MAX_TRANSACTION_AMOUNT
     * - Market must be open
     * - Item must be available and NPC must be buying it
     * - Player must be initialized
     * - Player must have enough items in inventory
     * - Item must not be banned
     *
     * Process:
     * 1. Validates all input parameters and market state
     * 2. Checks item availability and buying status
     * 3. Verifies player has enough items
     * 4. Calculates total price with overflow protection
     * 5. Removes items from player's inventory
     * 6. Sends ETH to player
     * 7. Tracks sale history
     * 8. Records transaction
     *
     * Emits {ItemSoldForETH} event
     */
    function sellItemToNPC(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external nonReentrant returns (uint256) {
        address player = msg.sender;

        // Validate inputs
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(
            _quantity <= MAX_TRANSACTION_AMOUNT,
            "Quantity exceeds maximum"
        );

        // Check if market is open
        require(npcMarketProxy.isMarketOpen(_npcId), "Market is closed");

        // Get market item
        NPCMarketNativeStructs.MarketItemView memory marketItem = npcMarketProxy
            .getMarketItem(_npcId, _itemId);
        require(marketItem.active, "Item not available in market");
        require(!marketItem.isSelling, "NPC is not buying this item");

        // Check if player exists and has enough items
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");

        // Validate item exists and is not banned
        ItemStructs.Item memory itemData = itemProxy.getItem(_itemId);
        require(itemData.id > 0, "Item does not exist");
        require(!itemData.isBanned, "Item is banned");

        InventoryItem memory playerItem = inventoryProxy.getItem(
            player,
            _itemId
        );
        require(playerItem.quantity >= _quantity, "Not enough items to sell");

        // Calculate total price (check for overflow)
        uint256 totalPrice = marketItem.pricePerUnit * _quantity;
        require(
            totalPrice / _quantity == marketItem.pricePerUnit,
            "Price overflow"
        );

        // Check if contract has enough ETH
        require(
            address(this).balance >= totalPrice,
            "Insufficient contract balance"
        );

        // Process transaction
        // 1. Remove item from player inventory
        inventoryProxy.setItem(
            player,
            _itemId,
            playerItem.quantity - _quantity,
            playerItem.durability,
            playerItem.expiration
        );

        // 2. Track user sale
        npcMarketProxy.addUserPurchase(_npcId, _itemId, player, _quantity);

        // 3. Record transaction
        uint256 transactionId = npcMarketProxy.recordTransaction(
            player,
            _npcId,
            _itemId,
            _quantity,
            marketItem.pricePerUnit,
            totalPrice,
            false // isBuy
        );

        // 4. Send ETH to player
        (bool transferSuccess, ) = payable(player).call{value: totalPrice}("");
        require(transferSuccess, "ETH transfer failed");

        emit ItemSoldForETH(
            player,
            _npcId,
            _itemId,
            _quantity,
            totalPrice,
            transactionId
        );
        return transactionId;
    }

    /**
     * @notice Resets a user's purchase history for a specific item (admin only)
     * @dev Validates input parameters before resetting user's purchase record
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _user The address of the user to reset
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Valid Item ID (> 0)
     * - Valid user address (not zero address)
     *
     * Emits {UserPurchasesReset} event
     */
    function resetUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_user != address(0), "Invalid user address");

        npcMarketProxy.resetUserPurchases(_npcId, _itemId, _user);

        emit UserPurchasesReset(_npcId, _itemId, _user);
    }

    /**
     * @notice Emergency withdrawal of all ETH (admin only)
     * @dev Allows admin to withdraw all ETH in case of emergency
     * @param _to Address to receive the ETH
     * @return success Whether withdrawal was successful
     */
    function emergencyWithdraw(
        address payable _to
    ) external onlyAdmin nonReentrant returns (bool) {
        require(_to != address(0), "Invalid recipient address");

        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");

        // Chuyển toàn bộ ETH trong contract (sử dụng call() thay vì transfer())
        (bool success, ) = _to.call{value: contractBalance}("");
        require(success, "Transfer failed");

        emit EmergencyWithdraw(msg.sender, contractBalance, block.timestamp);

        return true;
    }

    // ============ READ FUNCTIONS (EXTERNAL VIEW) ============

    /**
     * @notice Gets market item information
     * @dev Retrieves basic market item details from the component
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @return MarketItemView struct containing item's market information
     */
    function getMarketItem(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (NPCMarketNativeStructs.MarketItemView memory) {
        return npcMarketProxy.getMarketItem(_npcId, _itemId);
    }

    /**
     * @notice Gets all items available in an NPC market
     * @dev Retrieves array of all market items for the specified NPC
     * @param _npcId The ID of the NPC market
     * @return Array of MarketItemView structs containing all market items
     */
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (NPCMarketNativeStructs.MarketItemView[] memory) {
        return npcMarketProxy.getAllMarketItems(_npcId);
    }

    /**
     * @notice Gets IDs of all items in an NPC market
     * @dev Retrieves array of item IDs available in the market
     * @param _npcId The ID of the NPC market
     * @return Array of item IDs
     */
    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory) {
        return npcMarketProxy.getMarketItemIds(_npcId);
    }

    /**
     * @notice Gets basic information about an NPC market
     * @dev Retrieves the market's metadata including name, status, and item count
     * @param _npcId The ID of the NPC market
     * @return npcId The ID of the NPC
     * @return name The name of the NPC market
     * @return isActive Whether the market is currently active
     * @return itemCount Total number of items in the market
     * @return minTransactionAmount Minimum transaction amount
     * @return maxTransactionAmount Maximum transaction amount
     * @return totalEarnings Total ETH earned by NPC
     * @return totalSpent Total ETH spent by NPC
     */
    function getNPCMarketInfo(
        uint256 _npcId
    )
        external
        view
        returns (
            uint256 npcId,
            string memory name,
            bool isActive,
            uint256 itemCount,
            uint256 minTransactionAmount,
            uint256 maxTransactionAmount,
            uint256 totalEarnings,
            uint256 totalSpent
        )
    {
        return npcMarketProxy.getNPCMarketInfo(_npcId);
    }

    /**
     * @notice Checks if an NPC market is currently open
     * @dev Queries the market's active status
     * @param _npcId The ID of the NPC market
     * @return True if the market is open for trading, false otherwise
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool) {
        return npcMarketProxy.isMarketOpen(_npcId);
    }

    /**
     * @notice Calculates the total price to buy items from the NPC
     * @dev Multiplies the item's market price by the quantity
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _quantity The quantity to purchase
     * @return totalPrice The total price in wei
     *
     * Requirements:
     * - Item must be active in the market
     * - NPC must be selling this item
     */
    function calculateBuyPrice(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (uint256 totalPrice) {
        NPCMarketNativeStructs.MarketItemView memory marketItem = npcMarketProxy
            .getMarketItem(_npcId, _itemId);
        require(marketItem.active && marketItem.isSelling, "Item not for sale");
        return marketItem.pricePerUnit * _quantity;
    }

    /**
     * @notice Calculates the total price when selling items to the NPC
     * @dev Multiplies the item's market price by the quantity
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _quantity The quantity to sell
     * @return totalPrice The total price in wei
     *
     * Requirements:
     * - Item must be active in the market
     * - NPC must be buying this item
     */
    function calculateSellPrice(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (uint256 totalPrice) {
        NPCMarketNativeStructs.MarketItemView memory marketItem = npcMarketProxy
            .getMarketItem(_npcId, _itemId);
        require(
            marketItem.active && !marketItem.isSelling,
            "Item not accepted for purchase"
        );
        return marketItem.pricePerUnit * _quantity;
    }

    /**
     * @notice Gets the total quantity a user has purchased/sold for an item
     * @dev Retrieves the user's transaction history count from the component
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _user The address of the user
     * @return The total quantity the user has purchased or sold
     */
    function getUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256) {
        return npcMarketProxy.getUserPurchases(_npcId, _itemId, _user);
    }

    /**
     * @notice Checks if a user can purchase/sell additional quantity
     * @dev Validates if adding the quantity would exceed the user's limit
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _user The address of the user
     * @param _additionalQuantity The additional quantity to check
     * @return True if the user can purchase/sell more, false otherwise
     */
    function canUserPurchaseMore(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _additionalQuantity
    ) external view returns (bool) {
        return
            npcMarketProxy.canUserPurchaseMore(
                _npcId,
                _itemId,
                _user,
                _additionalQuantity
            );
    }

    /**
     * @notice Gets the remaining purchase/sell limit for a user
     * @dev Calculates remaining limit by subtracting used from total limit
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _user The address of the user
     * @return The remaining limit (max uint256 = unlimited, 0 = limit reached)
     */
    function getRemainingUserLimit(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256) {
        NPCMarketNativeStructs.MarketItemView memory marketItem = npcMarketProxy
            .getMarketItem(_npcId, _itemId);
        uint256 purchased = npcMarketProxy.getUserPurchases(
            _npcId,
            _itemId,
            _user
        );

        if (marketItem.limitPerUser == 0) {
            return type(uint256).max;
        }

        if (purchased >= marketItem.limitPerUser) {
            return 0;
        }

        return marketItem.limitPerUser - purchased;
    }

    /**
     * @notice Gets transaction record by ID
     * @param _transactionId ID of the transaction
     * @return TransactionRecord struct
     */
    function getTransactionRecord(
        uint256 _transactionId
    ) external view returns (NPCMarketNativeStructs.TransactionRecord memory) {
        return npcMarketProxy.getTransactionRecord(_transactionId);
    }

    /**
     * @notice Gets market statistics
     * @param _npcId ID of the NPC market
     * @return MarketStats struct
     */
    function getMarketStats(
        uint256 _npcId
    ) external view returns (NPCMarketNativeStructs.MarketStats memory) {
        return npcMarketProxy.getMarketStats(_npcId);
    }

    /**
     * @notice Gets user statistics for a market
     * @param _npcId ID of the NPC market
     * @param _user Address of the user
     * @return UserMarketStats struct
     */
    function getUserMarketStats(
        uint256 _npcId,
        address _user
    ) external view returns (NPCMarketNativeStructs.UserMarketStats memory) {
        return npcMarketProxy.getUserMarketStats(_npcId, _user);
    }

    /**
     * @notice Checks if a player can buy an item
     * @dev Validates all requirements for a purchase without executing the transaction
     * @param _player The address of the player
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to buy
     * @param _quantity The quantity to purchase
     * @return canBuy True if the player can make the purchase, false otherwise
     * @return reason Explanation if the purchase cannot be made (empty if successful)
     */
    function canPlayerBuyItem(
        address _player,
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (bool canBuy, string memory reason) {
        // Check if market is open
        if (!npcMarketProxy.isMarketOpen(_npcId)) {
            return (false, "Market is closed");
        }

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }

        // Check market item
        try npcMarketProxy.getMarketItem(_npcId, _itemId) returns (
            NPCMarketNativeStructs.MarketItemView memory marketItem
        ) {
            if (!marketItem.active) {
                return (false, "Item not available in market");
            }
            if (!marketItem.isSelling) {
                return (false, "NPC is not selling this item");
            }

            // Check user limit
            if (
                !npcMarketProxy.canUserPurchaseMore(
                    _npcId,
                    _itemId,
                    _player,
                    _quantity
                )
            ) {
                return (false, "Purchase limit exceeded for this user");
            }

            // Check price calculation
            uint256 totalPrice = marketItem.pricePerUnit * _quantity;
            if (totalPrice / _quantity != marketItem.pricePerUnit) {
                return (false, "Price overflow");
            }

            return (true, "");
        } catch {
            return (false, "Item not found in market");
        }
    }

    /**
     * @notice Checks if a player can sell an item
     * @dev Validates all requirements for a sale without executing the transaction
     * @param _player The address of the player
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to sell
     * @param _quantity The quantity to sell
     * @return canSell True if the player can make the sale, false otherwise
     * @return reason Explanation if the sale cannot be made (empty if successful)
     */
    function canPlayerSellItem(
        address _player,
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (bool canSell, string memory reason) {
        // Check if market is open
        if (!npcMarketProxy.isMarketOpen(_npcId)) {
            return (false, "Market is closed");
        }

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }

        // Check player's inventory
        InventoryItem memory playerItem = inventoryProxy.getItem(
            _player,
            _itemId
        );
        if (playerItem.quantity < _quantity) {
            return (false, "Not enough items to sell");
        }

        // Check market item
        try npcMarketProxy.getMarketItem(_npcId, _itemId) returns (
            NPCMarketNativeStructs.MarketItemView memory marketItem
        ) {
            if (!marketItem.active) {
                return (false, "Item not accepted by market");
            }
            if (marketItem.isSelling) {
                return (false, "NPC is not buying this item");
            }

            // Check user sell limit
            if (
                !npcMarketProxy.canUserPurchaseMore(
                    _npcId,
                    _itemId,
                    _player,
                    _quantity
                )
            ) {
                return (false, "Sell limit exceeded for this user");
            }

            // Check price calculation
            uint256 totalPrice = marketItem.pricePerUnit * _quantity;
            if (totalPrice / _quantity != marketItem.pricePerUnit) {
                return (false, "Price overflow");
            }

            // Check if contract has enough ETH
            if (address(this).balance < totalPrice) {
                return (false, "Insufficient contract balance");
            }

            return (true, "");
        } catch {
            return (false, "Item not accepted by NPC");
        }
    }

    /**
     * @notice Gets contract's ETH balance
     * @return Balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ============ RECEIVE FUNCTION ============

    /**
     * @notice Allows contract to receive ETH
     * @dev This function is called when ETH is sent to the contract
     */
    receive() external payable {
        // Contract can receive ETH for NPC market operations
    }
}
