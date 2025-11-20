// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INPCMarket.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/NPCMarket.sol";
import "../../struct/Inventory.sol";
import "../../struct/Item.sol";
import "../../struct/Player.sol";

/**
 * @title NPCMarketLogic
 * @dev Logic contract for NPC Market system - enables player trading with NPCs
 * @notice This contract manages all gameplay mechanics for buying and selling items with NPCs
 *
 * Key Features:
 * - Manage NPC markets
 * - Buy items from NPCs with per-user limits
 * - Sell items to NPCs
 * - Track player transaction history
 * - Manage prices and trade limits
 * - Daily purchase limit resets
 * - Reentrancy protection
 */
contract NPCMarketLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice NPC Market component for market data
    INPCMarketComponent public npcMarketProxy;
    /// @notice Item component for item information
    IItemComponent public itemProxy;
    /// @notice Inventory component for player inventory management
    IInventoryComponent public inventoryProxy;
    /// @notice Player component for player data and currency
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

    /// @notice Emitted when a player purchases items from an NPC
    event ItemPurchased(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice
    );

    /// @notice Emitted when a player sells items to an NPC
    event ItemSold(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice
    );

    /// @notice Emitted when a market's state changes
    event MarketStateChanged(uint256 indexed npcId, bool isOpen);

    /// @notice Emitted when a new NPC market is created
    event NPCMarketCreated(uint256 indexed npcId, string name);

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

    /// @notice Emitted when a user's purchase history is reset
    event UserPurchasesReset(
        uint256 indexed npcId,
        uint256 indexed itemId,
        address indexed user
    );

    /// @notice Emitted when daily reset is executed
    event DailyResetExecuted(
        uint256 indexed npcId,
        uint256 itemCount,
        uint256 userCount
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
     * @dev Initializes the NPCMarketLogic contract with required dependencies
     * @param _world Address of the World contract
     * @param _npcMarketProxy Address of the NPCMarketComponent proxy
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
        npcMarketProxy = INPCMarketComponent(_npcMarketProxy);
        itemProxy = IItemComponent(_itemProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @dev Creates a new NPC Market (admin only)
     * @notice Initializes a new market for a specific NPC
     * @param _npcId ID of the NPC
     * @param _name Name of the NPC Market
     *
     * Process:
     * 1. Validate input parameters
     * 2. Create NPC Market in component
     * 3. Emit NPCMarketCreated event
     */
    function createNPCMarket(
        uint256 _npcId,
        string memory _name
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(bytes(_name).length > 0, "NPC name cannot be empty");

        npcMarketProxy.createNPCMarket(_npcId, _name);

        emit NPCMarketCreated(_npcId, _name);
    }

    /**
     * @notice Adds an item to the NPC Market (admin only)
     * @dev Validates input parameters and checks if item exists before adding to market
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to add
     * @param _limitPerUser Purchase limit per user (0 = unlimited)
     * @param _pricePerUnit Price per unit of the item
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
     * @param _pricePerUnit New price per unit
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
     * @notice Allows a player to purchase items from an NPC
     * @dev Processes a buy transaction with reentrancy protection
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to purchase
     * @param _quantity The quantity to purchase
     *
     * Requirements:
     * - Valid NPC ID (> 0) and Item ID (> 0)
     * - Quantity must be between 1 and MAX_TRANSACTION_AMOUNT
     * - Market must be open
     * - Item must be available and NPC must be selling it
     * - Player must not exceed purchase limit for this item
     * - Player must have enough sunlight (currency)
     * - Player must be initialized
     * - Item must not be banned
     *
     * Process:
     * 1. Validates all input parameters and market state
     * 2. Checks item availability and selling status
     * 3. Verifies user purchase limit
     * 4. Calculates total price with overflow protection
     * 5. Deducts currency from player
     * 6. Adds item to player's inventory
     * 7. Tracks purchase history
     *
     * Emits {ItemPurchased} event
     */
    function buyItemFromNPC(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external nonReentrant {
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
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
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

        // Check if player exists and has enough currency
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");
        require(playerData.sunlight >= totalPrice, "Not enough currency");

        // Validate item exists and is not banned
        ItemStructs.Item memory itemData = itemProxy.getItem(_itemId);
        require(itemData.id > 0, "Item does not exist");
        require(!itemData.isBanned, "Item is banned");

        // Process transaction
        // 1. Deduct currency from player
        playerProxy.subtractSunlight(player, totalPrice);

        // 2. Add item to player inventory
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

        // 3. Track user purchase
        npcMarketProxy.addUserPurchase(_npcId, _itemId, player, _quantity);

        emit ItemPurchased(player, _npcId, _itemId, _quantity, totalPrice);
    }

    /**
     * @notice Allows a player to sell items to an NPC
     * @dev Processes a sell transaction with reentrancy protection
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item to sell
     * @param _quantity The quantity to sell
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
     * 6. Adds currency to player
     * 7. Tracks sale history
     *
     * Emits {ItemSold} event
     */
    function sellItemToNPC(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _quantity
    ) external nonReentrant {
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
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
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

        // Process transaction
        // 1. Remove item from player inventory
        inventoryProxy.setItem(
            player,
            _itemId,
            playerItem.quantity - _quantity,
            playerItem.durability,
            playerItem.expiration
        );

        // 2. Add currency to player
        playerProxy.addSunlight(player, totalPrice);

        // 3. Track user sale
        npcMarketProxy.addUserPurchase(_npcId, _itemId, player, _quantity);

        emit ItemSold(player, _npcId, _itemId, _quantity, totalPrice);
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
     * @notice Resets purchase history for multiple users for a specific item (admin only)
     * @dev Batch operation to reset multiple users' purchase records at once
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _users Array of user addresses to reset (max 100 users)
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Valid Item ID (> 0)
     * - Users array must not be empty
     * - Users array length must not exceed 100
     * - All user addresses must be valid (not zero address)
     *
     * Emits {UserPurchasesReset} event for each user
     */
    function resetMultipleUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address[] calldata _users
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_itemId > 0, "Invalid Item ID");
        require(_users.length > 0, "Users array cannot be empty");
        require(_users.length <= 100, "Too many users in one batch");

        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid user address");
            npcMarketProxy.resetUserPurchases(_npcId, _itemId, _users[i]);
            emit UserPurchasesReset(_npcId, _itemId, _users[i]);
        }
    }

    /**
     * @notice Resets all user purchases for all items in an NPC market (admin only)
     * @dev Batch operation to reset multiple users across all items in a market
     * @param _npcId The ID of the NPC market
     * @param _users Array of user addresses to reset (max 50 users)
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Users array must not be empty
     * - Users array length must not exceed 50
     * - NPC market must have at least one item
     * - All user addresses must be valid (not zero address)
     *
     * Process:
     * 1. Retrieves all items in the NPC market
     * 2. Resets purchase history for all users on all items
     *
     * Emits {UserPurchasesReset} event for each user-item combination
     */
    function resetAllUserPurchasesForNPCMarket(
        uint256 _npcId,
        address[] calldata _users
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_users.length > 0, "Users array cannot be empty");
        require(_users.length <= 50, "Too many users in one batch");

        // Lấy tất cả items trong market
        uint256[] memory itemIds = npcMarketProxy.getMarketItemIds(_npcId);
        require(itemIds.length > 0, "No items in this NPC market");

        for (uint256 i = 0; i < itemIds.length; i++) {
            for (uint256 j = 0; j < _users.length; j++) {
                require(_users[j] != address(0), "Invalid user address");
                npcMarketProxy.resetUserPurchases(
                    _npcId,
                    itemIds[i],
                    _users[j]
                );
                emit UserPurchasesReset(_npcId, itemIds[i], _users[j]);
            }
        }
    }

    /**
     * @notice Resets all user purchases for an item across multiple NPC markets (admin only)
     * @dev Batch operation to reset multiple users for a specific item across multiple markets
     * @param _npcIds Array of NPC market IDs (max 20 NPCs)
     * @param _itemId The ID of the item
     * @param _users Array of user addresses to reset (max 30 users)
     *
     * Requirements:
     * - Caller must be admin
     * - NPC IDs array must not be empty and not exceed 20
     * - Valid Item ID (> 0)
     * - Users array must not be empty and not exceed 30
     * - All NPC IDs must be valid (> 0)
     * - All user addresses must be valid (not zero address)
     *
     * Process:
     * 1. Validates all input parameters
     * 2. Resets purchase history for all users across all specified NPC markets
     *
     * Emits {UserPurchasesReset} event for each NPC-item-user combination
     */
    function resetAllUserPurchasesForItem(
        uint256[] calldata _npcIds,
        uint256 _itemId,
        address[] calldata _users
    ) external onlyAdmin {
        require(_npcIds.length > 0, "NPC IDs array cannot be empty");
        require(_npcIds.length <= 20, "Too many NPCs in one batch");
        require(_itemId > 0, "Invalid Item ID");
        require(_users.length > 0, "Users array cannot be empty");
        require(_users.length <= 30, "Too many users in one batch");

        for (uint256 i = 0; i < _npcIds.length; i++) {
            require(_npcIds[i] > 0, "Invalid NPC ID");
            for (uint256 j = 0; j < _users.length; j++) {
                require(_users[j] != address(0), "Invalid user address");
                npcMarketProxy.resetUserPurchases(
                    _npcIds[i],
                    _itemId,
                    _users[j]
                );
                emit UserPurchasesReset(_npcIds[i], _itemId, _users[j]);
            }
        }
    }

    /**
     * @notice Executes daily reset for an NPC market (admin only)
     * @dev Resets all user purchases for all items in the specified NPC market
     * @param _npcId The ID of the NPC market to reset
     * @param _users Array of user addresses to reset (max 50 users)
     *
     * Requirements:
     * - Caller must be admin
     * - Valid NPC ID (> 0)
     * - Users array must not be empty
     * - Users array length must not exceed 50
     * - NPC market must have at least one item
     * - All user addresses must be valid (not zero address)
     *
     * Note: Daily reset validation is currently commented out
     *
     * Process:
     * 1. Retrieves all items in the NPC market
     * 2. Resets purchase history for all users on all items
     *
     * Emits {UserPurchasesReset} event for each user-item combination
     * Emits {DailyResetExecuted} event with total counts
     */
    function executeDailyReset(
        uint256 _npcId,
        address[] calldata _users
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_users.length > 0, "Users array cannot be empty");
        require(_users.length <= 50, "Too many users in one batch");

        // uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        // require(
        //     lastResetDay[_npcId] < currentDay,
        //     "Daily reset already executed for this NPC today"
        // );

        // Lấy tất cả items trong market
        uint256[] memory itemIds = npcMarketProxy.getMarketItemIds(_npcId);
        require(itemIds.length > 0, "No items in this NPC market");

        uint256 totalResets = 0;

        // Reset tất cả user purchases cho tất cả items
        for (uint256 i = 0; i < itemIds.length; i++) {
            for (uint256 j = 0; j < _users.length; j++) {
                require(_users[j] != address(0), "Invalid user address");
                npcMarketProxy.resetUserPurchases(
                    _npcId,
                    itemIds[i],
                    _users[j]
                );
                emit UserPurchasesReset(_npcId, itemIds[i], _users[j]);
                totalResets++;
            }
        }

        emit DailyResetExecuted(_npcId, itemIds.length, _users.length);
    }

    /**
     * @notice Checks if the NPC market has been reset today
     * @dev Compares last reset day with current day
     * @param _npcId The ID of the NPC market
     * @return True if reset has been executed today, false otherwise
     */
    function isDailyResetExecuted(uint256 _npcId) external view returns (bool) {
        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        return lastResetDay[_npcId] >= currentDay;
    }

    /**
     * @notice Gets the last reset day for an NPC market
     * @dev Returns the day number when the market was last reset
     * @param _npcId The ID of the NPC market
     * @return The last reset day (calculated as timestamp / SECONDS_PER_DAY)
     */
    function getLastResetDay(uint256 _npcId) external view returns (uint256) {
        return lastResetDay[_npcId];
    }

    /**
     * @notice Gets the current day number
     * @dev Returns the current day calculated from block timestamp
     * @return The current day (calculated as block.timestamp / SECONDS_PER_DAY)
     */
    function getCurrentDay() external view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
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
    ) external view returns (MarketItemView memory) {
        return npcMarketProxy.getMarketItem(_npcId, _itemId);
    }

    /**
     * @notice Gets market item information with full item details
     * @dev Retrieves both market data and complete item information
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @return marketItem MarketItemView struct with market information
     * @return itemDetails Complete Item struct with all item properties
     */
    function getMarketItemWithDetails(
        uint256 _npcId,
        uint256 _itemId
    )
        external
        view
        returns (
            MarketItemView memory marketItem,
            ItemStructs.Item memory itemDetails
        )
    {
        marketItem = npcMarketProxy.getMarketItem(_npcId, _itemId);
        itemDetails = itemProxy.getItem(_itemId);
        return (marketItem, itemDetails);
    }

    /**
     * @notice Gets market item information with item details and user-specific data
     * @dev Retrieves market data, item details, and calculates user's purchase limits
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _user The address of the user
     * @return marketItem MarketItemView struct with market information
     * @return itemDetails Complete Item struct with all item properties
     * @return userPurchased Total quantity the user has purchased
     * @return remainingLimit Remaining purchase limit for the user (max uint256 if unlimited)
     */
    function getMarketItemWithDetailsAndUserInfo(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    )
        external
        view
        returns (
            MarketItemView memory marketItem,
            ItemStructs.Item memory itemDetails,
            uint256 userPurchased,
            uint256 remainingLimit
        )
    {
        marketItem = npcMarketProxy.getMarketItem(_npcId, _itemId);
        itemDetails = itemProxy.getItem(_itemId);
        userPurchased = npcMarketProxy.getUserPurchases(_npcId, _itemId, _user);

        // Tính toán giới hạn còn lại
        if (marketItem.limitPerUser == 0) {
            remainingLimit = type(uint256).max; // Không giới hạn
        } else if (userPurchased >= marketItem.limitPerUser) {
            remainingLimit = 0; // Đã hết giới hạn
        } else {
            remainingLimit = marketItem.limitPerUser - userPurchased;
        }

        return (marketItem, itemDetails, userPurchased, remainingLimit);
    }

    /**
     * @notice Gets all items available in an NPC market
     * @dev Retrieves array of all market items for the specified NPC
     * @param _npcId The ID of the NPC market
     * @return Array of MarketItemView structs containing all market items
     */
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (MarketItemView[] memory) {
        return npcMarketProxy.getAllMarketItems(_npcId);
    }

    /**
     * @notice Gets all market items with their complete item details
     * @dev Retrieves market items and fetches corresponding item information
     * @param _npcId The ID of the NPC market
     * @return marketItems Array of MarketItemView structs
     * @return itemDetails Array of complete Item structs with all properties
     */
    function getAllMarketItemsWithDetails(
        uint256 _npcId
    )
        external
        view
        returns (
            MarketItemView[] memory marketItems,
            ItemStructs.Item[] memory itemDetails
        )
    {
        marketItems = npcMarketProxy.getAllMarketItems(_npcId);
        itemDetails = new ItemStructs.Item[](marketItems.length);

        for (uint256 i = 0; i < marketItems.length; i++) {
            itemDetails[i] = itemProxy.getItem(marketItems[i].itemId);
        }

        return (marketItems, itemDetails);
    }

    /**
     * @notice Gets all market items with details and user-specific information
     * @dev Retrieves market items, item details, and calculates user limits for each item
     * @param _npcId The ID of the NPC market
     * @param _user The address of the user
     * @return marketItems Array of MarketItemView structs
     * @return itemDetails Array of complete Item structs
     * @return userPurchased Array of quantities purchased by the user for each item
     * @return remainingLimit Array of remaining purchase limits for the user (max uint256 if unlimited)
     */
    function getAllMarketItemsWithDetailsAndUserInfo(
        uint256 _npcId,
        address _user
    )
        external
        view
        returns (
            MarketItemView[] memory marketItems,
            ItemStructs.Item[] memory itemDetails,
            uint256[] memory userPurchased,
            uint256[] memory remainingLimit
        )
    {
        marketItems = npcMarketProxy.getAllMarketItems(_npcId);
        itemDetails = new ItemStructs.Item[](marketItems.length);
        userPurchased = new uint256[](marketItems.length);
        remainingLimit = new uint256[](marketItems.length);

        for (uint256 i = 0; i < marketItems.length; i++) {
            itemDetails[i] = itemProxy.getItem(marketItems[i].itemId);
            userPurchased[i] = npcMarketProxy.getUserPurchases(
                _npcId,
                marketItems[i].itemId,
                _user
            );

            // Tính toán giới hạn còn lại
            if (marketItems[i].limitPerUser == 0) {
                remainingLimit[i] = type(uint256).max; // Không giới hạn
            } else if (userPurchased[i] >= marketItems[i].limitPerUser) {
                remainingLimit[i] = 0; // Đã hết giới hạn
            } else {
                remainingLimit[i] =
                    marketItems[i].limitPerUser -
                    userPurchased[i];
            }
        }

        return (marketItems, itemDetails, userPurchased, remainingLimit);
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
     * @notice Gets IDs of all items in an NPC market with their details
     * @dev Retrieves item IDs and fetches complete information for each item
     * @param _npcId The ID of the NPC market
     * @return itemIds Array of item IDs
     * @return itemDetails Array of complete Item structs with all properties
     */
    function getMarketItemIdsWithDetails(
        uint256 _npcId
    )
        external
        view
        returns (
            uint256[] memory itemIds,
            ItemStructs.Item[] memory itemDetails
        )
    {
        itemIds = npcMarketProxy.getMarketItemIds(_npcId);
        itemDetails = new ItemStructs.Item[](itemIds.length);

        for (uint256 i = 0; i < itemIds.length; i++) {
            itemDetails[i] = itemProxy.getItem(itemIds[i]);
        }

        return (itemIds, itemDetails);
    }

    /**
     * @notice Gets basic information about an NPC market
     * @dev Retrieves the market's metadata including name, status, and item count
     * @param _npcId The ID of the NPC market
     * @return npcId The ID of the NPC
     * @return name The name of the NPC market
     * @return isActive Whether the market is currently active
     * @return itemCount Total number of items in the market
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
            uint256 itemCount
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
     * @notice Checks if a player can buy an item from the NPC market
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
            MarketItemView memory marketItem
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

            // Check currency
            uint256 totalPrice = marketItem.pricePerUnit * _quantity;
            if (playerData.sunlight < totalPrice) {
                return (false, "Not enough currency");
            }

            return (true, "");
        } catch {
            return (false, "Item not found in market");
        }
    }

    /**
     * @notice Checks if a player can sell an item to the NPC market
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
            MarketItemView memory marketItem
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

            return (true, "");
        } catch {
            return (false, "Item not accepted by NPC");
        }
    }

    /**
     * @notice Calculates the total price to buy items from the NPC
     * @dev Multiplies the item's market price by the quantity
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _quantity The quantity to purchase
     * @return totalPrice The total price (pricePerUnit * quantity)
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
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        require(marketItem.active && marketItem.isSelling, "Item not for sale");
        return marketItem.pricePerUnit * _quantity;
    }

    /**
     * @notice Calculates the total price when selling items to the NPC
     * @dev Multiplies the item's market price by the quantity
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @param _quantity The quantity to sell
     * @return totalPrice The total price (pricePerUnit * quantity)
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
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
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
     * @notice Gets the purchase/sell limit per user for an item
     * @dev Retrieves the limit from the market item configuration
     * @param _npcId The ID of the NPC market
     * @param _itemId The ID of the item
     * @return The limit per user (0 = unlimited)
     */
    function getItemLimitPerUser(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (uint256) {
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
        return marketItem.limitPerUser;
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
        MarketItemView memory marketItem = npcMarketProxy.getMarketItem(
            _npcId,
            _itemId
        );
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
}
