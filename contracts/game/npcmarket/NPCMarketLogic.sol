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
 * @dev Logic contract cho hệ thống NPC Market - cho phép người chơi mua bán item với NPC
 *
 * Tính năng chính:
 * - Quản lý market của các NPC
 * - Mua item từ NPC với giới hạn per user
 * - Bán item cho NPC
 * - Theo dõi lịch sử giao dịch của người chơi
 * - Quản lý giá cả và giới hạn mua bán
 */
contract NPCMarketLogic {
    IWorld public world;
    INPCMarketComponent public npcMarketProxy;
    IItemComponent public itemProxy;
    IInventoryComponent public inventoryProxy;
    IPlayerComponent public playerProxy;

    // ============ CONSTANTS ============

    uint256 public constant MAX_TRANSACTION_AMOUNT = 1000000;

    // ============ STATE VARIABLES ============

    // Reentrancy guard
    bool private _locked;

    // Daily reset tracking
    mapping(uint256 => uint256) public lastResetDay; // npcId => last reset day
    uint256 public constant SECONDS_PER_DAY = 86400;

    // ============ EVENTS ============

    event ItemPurchased(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice
    );

    event ItemSold(
        address indexed player,
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 totalPrice
    );

    event MarketStateChanged(uint256 indexed npcId, bool isOpen);

    event NPCMarketCreated(uint256 indexed npcId, string name);

    event ItemAddedToMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 limitPerUser,
        uint256 pricePerUnit,
        bool isSelling
    );

    event ItemUpdatedInMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 limitPerUser,
        uint256 pricePerUnit
    );

    event ItemRemovedFromMarket(uint256 indexed npcId, uint256 indexed itemId);

    event UserPurchasesReset(
        uint256 indexed npcId,
        uint256 indexed itemId,
        address indexed user
    );

    event DailyResetExecuted(
        uint256 indexed npcId,
        uint256 resetDay,
        uint256 itemCount,
        uint256 userCount
    );

    // ============ MODIFIERS ============

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

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
     * @dev Tạo NPC Market mới (chỉ admin)
     * @param _npcId ID của NPC
     * @param _name Tên của NPC Market
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Tạo NPC Market trong component
     * 3. Emit event NPCMarketCreated
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
     * @dev Thêm item vào NPC Market (chỉ admin)
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _limitPerUser Giới hạn mua bán per user (0 = không giới hạn)
     * @param _pricePerUnit Giá per unit
     * @param _isSelling NPC bán item (true) hay mua item (false)
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Kiểm tra item tồn tại
     * 3. Thêm item vào market
     * 4. Emit event ItemAddedToMarket
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
     * @dev Cập nhật item trong NPC Market (chỉ admin)
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _limitPerUser Giới hạn mới per user
     * @param _pricePerUnit Giá mới per unit
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Kiểm tra item tồn tại trong market
     * 3. Cập nhật thông tin item
     * 4. Emit event ItemUpdatedInMarket
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
     * @dev Xóa item khỏi NPC Market (chỉ admin)
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Xóa item khỏi market
     * 3. Emit event ItemRemovedFromMarket
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
     * @dev Mua item từ NPC (người chơi gọi)
     * @param _npcId ID của NPC
     * @param _itemId ID của item muốn mua
     * @param _quantity Số lượng muốn mua
     *
     * Quy trình:
     * 1. Validate input và kiểm tra market mở
     * 2. Kiểm tra item có sẵn và NPC đang bán
     * 3. Kiểm tra giới hạn mua của user
     * 4. Tính toán giá và kiểm tra đủ currency
     * 5. Trừ currency, thêm item vào inventory
     * 6. Track purchase history
     * 7. Emit event ItemPurchased
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
     * @dev Bán item cho NPC (người chơi gọi)
     * @param _npcId ID của NPC
     * @param _itemId ID của item muốn bán
     * @param _quantity Số lượng muốn bán
     *
     * Quy trình:
     * 1. Validate input và kiểm tra market mở
     * 2. Kiểm tra item có sẵn và NPC đang mua
     * 3. Kiểm tra giới hạn bán của user
     * 4. Kiểm tra đủ item trong inventory
     * 5. Tính toán giá và trừ item, cộng currency
     * 6. Track sale history
     * 7. Emit event ItemSold
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
     * @dev Reset lịch sử mua bán của user (chỉ admin)
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _user Địa chỉ user
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Reset purchase history của user
     * 3. Emit event UserPurchasesReset
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
     * @dev Reset tất cả user purchases cho một item trong NPC market (chỉ admin)
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _users Mảng địa chỉ users cần reset
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Reset purchase history cho tất cả users trong mảng
     * 3. Emit events cho mỗi user
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
     * @dev Reset tất cả user purchases cho tất cả items trong một NPC market (chỉ admin)
     * @param _npcId ID của NPC
     * @param _users Mảng địa chỉ users cần reset
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Lấy tất cả items trong market
     * 3. Reset purchase history cho tất cả users trên tất cả items
     * 4. Emit events cho mỗi user-item combination
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
     * @dev Reset tất cả user purchases cho một item trên tất cả NPC markets (chỉ admin)
     * @param _npcIds Mảng ID của các NPC
     * @param _itemId ID của item
     * @param _users Mảng địa chỉ users cần reset
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Reset purchase history cho tất cả users trên item này ở tất cả NPC markets
     * 3. Emit events cho mỗi user-npc-item combination
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
     * @dev Thực hiện daily reset cho một NPC market (chỉ admin)
     * @param _npcId ID của NPC
     * @param _users Mảng users cần reset (tối đa 50 users)
     *
     * Quy trình:
     * 1. Kiểm tra xem đã reset hôm nay chưa
     * 2. Reset tất cả user purchases cho tất cả items
     * 3. Cập nhật lastResetDay
     * 4. Emit event DailyResetExecuted
     */
    function executeDailyReset(
        uint256 _npcId,
        address[] calldata _users
    ) external onlyAdmin {
        require(_npcId > 0, "Invalid NPC ID");
        require(_users.length > 0, "Users array cannot be empty");
        require(_users.length <= 50, "Too many users in one batch");

        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        require(
            lastResetDay[_npcId] < currentDay,
            "Daily reset already executed for this NPC today"
        );

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

        // Cập nhật lastResetDay
        lastResetDay[_npcId] = currentDay;

        emit DailyResetExecuted(
            _npcId,
            currentDay,
            itemIds.length,
            _users.length
        );
    }

    /**
     * @dev Kiểm tra xem NPC market đã được reset hôm nay chưa
     * @param _npcId ID của NPC
     * @return bool True nếu đã reset hôm nay
     */
    function isDailyResetExecuted(uint256 _npcId) external view returns (bool) {
        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        return lastResetDay[_npcId] >= currentDay;
    }

    /**
     * @dev Lấy ngày reset cuối cùng của NPC market
     * @param _npcId ID của NPC
     * @return uint256 Ngày reset cuối cùng (timestamp / SECONDS_PER_DAY)
     */
    function getLastResetDay(uint256 _npcId) external view returns (uint256) {
        return lastResetDay[_npcId];
    }

    /**
     * @dev Lấy ngày hiện tại (timestamp / SECONDS_PER_DAY)
     * @return uint256 Ngày hiện tại
     */
    function getCurrentDay() external view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }

    // ============ READ FUNCTIONS (EXTERNAL VIEW) ============

    /**
     * @dev Lấy thông tin item trong market
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @return Thông tin MarketItemView
     */
    function getMarketItem(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (MarketItemView memory) {
        return npcMarketProxy.getMarketItem(_npcId, _itemId);
    }

    /**
     * @dev Lấy thông tin item trong market kèm chi tiết item
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @return marketItem Thông tin market item
     * @return itemDetails Chi tiết item
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
     * @dev Lấy thông tin item trong market kèm thông tin user
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _user Địa chỉ user
     * @return marketItem Thông tin market item
     * @return itemDetails Chi tiết item
     * @return userPurchased Số lượng user đã mua
     * @return remainingLimit Giới hạn còn lại
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
     * @dev Lấy tất cả item trong market của NPC
     * @param _npcId ID của NPC
     * @return Mảng MarketItemView
     */
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (MarketItemView[] memory) {
        return npcMarketProxy.getAllMarketItems(_npcId);
    }

    /**
     * @dev Lấy tất cả item trong market kèm chi tiết
     * @param _npcId ID của NPC
     * @return marketItems Mảng market items
     * @return itemDetails Mảng chi tiết item
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
     * @dev Lấy tất cả item trong market kèm thông tin user
     * @param _npcId ID của NPC
     * @param _user Địa chỉ user
     * @return marketItems Mảng market items
     * @return itemDetails Mảng chi tiết item
     * @return userPurchased Mảng số lượng user đã mua
     * @return remainingLimit Mảng giới hạn còn lại
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
     * @dev Lấy ID của tất cả item trong market
     * @param _npcId ID của NPC
     * @return Mảng ID của các item
     */
    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory) {
        return npcMarketProxy.getMarketItemIds(_npcId);
    }

    /**
     * @dev Lấy ID của tất cả item kèm chi tiết
     * @param _npcId ID của NPC
     * @return itemIds Mảng ID của các item
     * @return itemDetails Mảng chi tiết item
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
     * @dev Kiểm tra market có mở không
     * @param _npcId ID của NPC
     * @return bool True nếu market đang mở
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool) {
        return npcMarketProxy.isMarketOpen(_npcId);
    }

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
     * @dev Tính giá mua item
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _quantity Số lượng
     * @return totalPrice Tổng giá
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
     * @dev Tính giá bán item
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _quantity Số lượng
     * @return totalPrice Tổng giá
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
     * @dev Lấy số lượng user đã mua bán
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _user Địa chỉ user
     * @return Số lượng đã mua bán
     */
    function getUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256) {
        return npcMarketProxy.getUserPurchases(_npcId, _itemId, _user);
    }

    /**
     * @dev Kiểm tra user có thể mua bán thêm không
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _user Địa chỉ user
     * @param _additionalQuantity Số lượng muốn thêm
     * @return bool True nếu có thể mua bán thêm
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
     * @dev Lấy giới hạn mua bán per user của item
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @return Giới hạn per user (0 = không giới hạn)
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
     * @dev Lấy giới hạn còn lại của user
     * @param _npcId ID của NPC
     * @param _itemId ID của item
     * @param _user Địa chỉ user
     * @return Giới hạn còn lại (max uint256 = không giới hạn)
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

        // Nếu limitPerUser = 0, không giới hạn (trả về max uint256)
        if (marketItem.limitPerUser == 0) {
            return type(uint256).max;
        }

        if (purchased >= marketItem.limitPerUser) {
            return 0;
        }

        return marketItem.limitPerUser - purchased;
    }
}
