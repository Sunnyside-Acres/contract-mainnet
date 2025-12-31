//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/SkinMarket.sol";
contract SkinMarketComponent {
    address public world;
    address public implementation;

    /// @notice Mapping from NPC ID to NPCMarket struct
    mapping(uint256 => SkinMarket.NPCMarket) public npcMarkets;

    /// @notice Mapping from transaction ID to TransactionRecord
    mapping(uint256 => SkinMarket.TransactionRecord)
        public transactions;

    /// @notice Mapping from NPC ID to MarketStats
    mapping(uint256 => SkinMarket.MarketStats) public marketStats;
    /// @notice Mapping from (npcId, user) to UserMarketStats
    mapping(uint256 => mapping(address => SkinMarket.UserMarketStats))
        public userMarketStats;

    /// @notice Counter for transaction IDs
    uint256 public transactionCounter;

    // ============ EVENTS ============

    /// @notice Emitted when the implementation contract is upgraded
    event ComponentUpdated(address indexed newImplementation);

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
        string indexed typeSkin,
        uint256 limitPerUser,
        uint256 pricePerUnit,
        bool isSelling
    );

    /// @notice Emitted when an item's details are updated in a market
    event ItemUpdatedInMarket(
        uint256 indexed npcId,
        string indexed typeSkin,
        uint256 limitPerUser,
        uint256 pricePerUnit
    );

    /// @notice Emitted when an item is removed from a market
    event ItemRemovedFromMarket(uint256 indexed npcId, string indexed typeSkin);

    /// @notice Emitted when market state changes
    event MarketStateChanged(uint256 indexed npcId, bool isActive);

    /// @notice Emitted when a transaction is recorded
    event TransactionRecorded(
        uint256 indexed transactionId,
        address indexed player,
        uint256 indexed npcId,
        string typeSkin,
        uint256 quantity,
        uint256 totalPrice,
        bool isBuy
    );

    // ============ MODIFIERS ============

    /**
     * @dev Modifier to restrict access to authorized logic contracts only
     * @notice Reverts if caller is not a registered logic contract
     */
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @dev Creates a new NPC Market
     * @notice Initializes a market for a specific NPC with ETH payment settings
     * @param _npcId ID of the NPC
     * @param _name Name of the market/NPC
     * @param _minTransactionAmount Minimum transaction amount in wei
     * @param _maxTransactionAmount Maximum transaction amount in wei
     */
    function createNPCMarket(
        uint256 _npcId,
        string memory _name,
        uint256 _minTransactionAmount,
        uint256 _maxTransactionAmount
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(!npcMarkets[_npcId].isActive, "NPC market already exists");
        require(
            _minTransactionAmount > 0,
            "Min transaction amount must be greater than 0"
        );
        require(
            _maxTransactionAmount >= _minTransactionAmount,
            "Max must be >= min"
        );

        npcMarkets[_npcId].npcId = _npcId;
        npcMarkets[_npcId].name = _name;
        npcMarkets[_npcId].isActive = true;
        npcMarkets[_npcId].minTransactionAmount = _minTransactionAmount;
        npcMarkets[_npcId].maxTransactionAmount = _maxTransactionAmount;
        npcMarkets[_npcId].totalEarnings = 0;
        npcMarkets[_npcId].totalSpent = 0;

        emit NPCMarketCreated(
            _npcId,
            _name,
            _minTransactionAmount,
            _maxTransactionAmount
        );
    }

    /**
     * @dev Adds an item to an NPC market
     * @notice Sets up an item for buying or selling in the market
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin to add
     * @param _limitPerUser Maximum quantity per user (0 = unlimited)
     * @param _pricePerUnit Price per unit in wei
     * @param _isSelling Whether the NPC is selling (true) or buying (false) this item
     */
    function addItemToMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(bytes(_typeSkin).length > 0, "Invalid Skin Type");
        require(_pricePerUnit > 0, "Price per unit must be greater than 0");
        require(
            !npcMarkets[_npcId].items[_typeSkin].active,
            "Item already exists in market"
        );

        // Add item to market
        npcMarkets[_npcId].items[_typeSkin].skinType = _typeSkin;
        npcMarkets[_npcId].items[_typeSkin].limitPerUser = _limitPerUser;
        npcMarkets[_npcId].items[_typeSkin].pricePerUnit = _pricePerUnit;
        npcMarkets[_npcId].items[_typeSkin].isSelling = _isSelling;
        npcMarkets[_npcId].items[_typeSkin].active = true;
        npcMarkets[_npcId].items[_typeSkin].lastPriceUpdate = block.timestamp;

        // Add itemId to list for iteration
        npcMarkets[_npcId].skinTypes.push(_typeSkin);

        emit ItemAddedToMarket(
            _npcId,
            _typeSkin,
            _limitPerUser,
            _pricePerUnit,
            _isSelling
        );
    }

    /**
     * @dev Updates an item's details in the market
     * @notice Modifies price and purchase limit for an existing market item
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin to update
     * @param _newLimitPerUser New maximum quantity per user
     * @param _newPrice New price per unit in wei
     */
    function updateItemInMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _newLimitPerUser,
        uint256 _newPrice
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(bytes(_typeSkin).length > 0, "Invalid Skin Type");
        require(
            npcMarkets[_npcId].items[_typeSkin].active,
            "Item not found in market"
        );
        require(_newPrice > 0, "Price must be greater than 0");

        npcMarkets[_npcId].items[_typeSkin].limitPerUser = _newLimitPerUser;
        npcMarkets[_npcId].items[_typeSkin].pricePerUnit = _newPrice;
        npcMarkets[_npcId].items[_typeSkin].lastPriceUpdate = block.timestamp;

        emit ItemUpdatedInMarket(_npcId, _typeSkin, _newLimitPerUser, _newPrice);
    }

    /**
     * @dev Removes an item from the market
     * @notice Marks item as inactive and removes from item list
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin to remove
     */
    function removeItemFromMarket(
        uint256 _npcId,
        string memory _typeSkin
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(bytes(_typeSkin).length > 0, "Invalid Skin Type");
        require(
            npcMarkets[_npcId].items[_typeSkin].active,
            "Item not found in market"
        );

        // Mark item as inactive
        npcMarkets[_npcId].items[_typeSkin].active = false;

        // Remove itemId from list
        string[] storage skinTypes = npcMarkets[_npcId].skinTypes;
        for (uint256 i = 0; i < skinTypes.length; i++) {
            if (keccak256(abi.encodePacked(skinTypes[i])) == keccak256(abi.encodePacked(_typeSkin))) {
                skinTypes[i] = skinTypes[skinTypes.length - 1];
                skinTypes.pop();
                break;
            }
        }

        emit ItemRemovedFromMarket(_npcId, _typeSkin);
    }

    /**
     * @dev Sets market active status
     * @param _npcId ID of the NPC market
     * @param _isActive Whether market is active
     */
    function setMarketActive(
        uint256 _npcId,
        bool _isActive
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        npcMarkets[_npcId].isActive = _isActive;
        emit MarketStateChanged(_npcId, _isActive);
    }

    /**
     * @dev Records a transaction
     * @param _player Address of the player
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin
     * @param _quantity Quantity traded
     * @param _pricePerUnit Price per unit at time of transaction
     * @param _totalPrice Total price paid/received
     * @param _isBuy True if player bought, false if sold
     * @return transactionId ID of the recorded transaction
     */
    function recordTransaction(
        address _player,
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity,
        uint256 _pricePerUnit,
        uint256 _totalPrice,
        bool _isBuy
    ) external onlyAuthorized returns (uint256) {
        transactionCounter++;
        uint256 transactionId = transactionCounter;

        transactions[transactionId] = SkinMarket.TransactionRecord({
            transactionId: transactionId,
            player: _player,
            npcId: _npcId,
            skinType: _typeSkin,
            quantity: _quantity,
            pricePerUnit: _pricePerUnit,
            totalPrice: _totalPrice,
            isBuy: _isBuy,
            timestamp: block.timestamp
        });

        // Update market stats
        marketStats[_npcId].totalTransactions++;
        marketStats[_npcId].totalVolume += _totalPrice;
        marketStats[_npcId].lastActivity = block.timestamp;

        if (_isBuy) {
            marketStats[_npcId].totalBuyTransactions++;
            marketStats[_npcId].totalBuyVolume += _totalPrice;
            npcMarkets[_npcId].totalEarnings += _totalPrice;
        } else {
            marketStats[_npcId].totalSellTransactions++;
            marketStats[_npcId].totalSellVolume += _totalPrice;
            npcMarkets[_npcId].totalSpent += _totalPrice;
        }

        // Update user stats
        userMarketStats[_npcId][_player].totalTransactions++;
        userMarketStats[_npcId][_player].totalVolume += _totalPrice;
        userMarketStats[_npcId][_player].lastActivity = block.timestamp;

        if (_isBuy) {
            userMarketStats[_npcId][_player].totalBuyTransactions++;
            userMarketStats[_npcId][_player].totalBuyVolume += _totalPrice;
        } else {
            userMarketStats[_npcId][_player].totalSellTransactions++;
            userMarketStats[_npcId][_player].totalSellVolume += _totalPrice;
        }

        emit TransactionRecorded(
            transactionId,
            _player,
            _npcId,
            _typeSkin,
            _quantity,
            _totalPrice,
            _isBuy
        );

        return transactionId;
    }

    /**
     * @dev Tracks user purchases for limit enforcement
     * @notice Increments the purchase count for a specific user and item
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin
     * @param _user Address of the user
     * @param _quantity Quantity purchased to add
     */
    function addUserPurchase(
        uint256 _npcId,
        string memory _typeSkin,
        address _user,
        uint256 _quantity
    ) external onlyAuthorized {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_typeSkin].active,
            "Item not found in market"
        );

        npcMarkets[_npcId].items[_typeSkin].userPurchases[_user] += _quantity;
    }

    /**
     * @dev Resets user purchase count for a specific item
     * @notice Admin function to reset purchase limits
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin
     * @param _user Address of the user
     */
    function resetUserPurchases(
        uint256 _npcId,
        string memory _typeSkin,
        address _user
    ) external onlyAuthorized {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_typeSkin].active,
            "Item not found in market"
        );

        npcMarkets[_npcId].items[_typeSkin].userPurchases[_user] = 0;
    }

    // ============ READ FUNCTIONS ============

    /**
     * @dev Gets detailed information about a specific market item
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin
     * @return MarketItemView struct with item details
     */
    function getMarketItem(
        uint256 _npcId,
        string memory _typeSkin
    ) external view returns (SkinMarket.MarketItemView memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_typeSkin].active,
            "Item not found in market"
        );

        SkinMarket.MarketItem storage item = npcMarkets[_npcId]
            .items[_typeSkin];
        return
            SkinMarket.MarketItemView({
                skinType: item.skinType,
                limitPerUser: item.limitPerUser,
                pricePerUnit: item.pricePerUnit,
                isSelling: item.isSelling,
                active: item.active,
                lastPriceUpdate: item.lastPriceUpdate
            });
    }

    /**
     * @dev Gets all items in a market
     * @param _npcId ID of the NPC market
     * @return Array of MarketItemView structs
     */
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketItemView[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");

        string[] memory skinTypes = npcMarkets[_npcId].skinTypes;
        SkinMarket.MarketItemView[]
            memory items = new SkinMarket.MarketItemView[](
                skinTypes.length
            );

        for (uint256 i = 0; i < skinTypes.length; i++) {
            SkinMarket.MarketItem storage item = npcMarkets[_npcId]
                .items[skinTypes[i]];
            items[i] = SkinMarket.MarketItemView({
                skinType: item.skinType,
                limitPerUser: item.limitPerUser,
                pricePerUnit: item.pricePerUnit,
                isSelling: item.isSelling,
                active: item.active,
                lastPriceUpdate: item.lastPriceUpdate
            });
        }

        return items;
    }

    /**
     * @dev Gets all item IDs in a market
     * @param _npcId ID of the NPC market
     * @return Array of item IDs
     */
    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (string[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        return npcMarkets[_npcId].skinTypes;
    }

    /**
     * @dev Gets basic information about an NPC market
     * @param _npcId ID of the NPC market
     * @return npcId ID of the NPC
     * @return name Name of the market
     * @return isActive Whether the market is active
     * @return itemCount Number of items in the market
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
        SkinMarket.NPCMarket storage market = npcMarkets[_npcId];
        return (
            market.npcId,
            market.name,
            market.isActive,
            market.skinTypes.length,
            market.minTransactionAmount,
            market.maxTransactionAmount,
            market.totalEarnings,
            market.totalSpent
        );
    }

    /**
     * @dev Checks if a market is currently open/active
     * @param _npcId ID of the NPC market
     * @return True if market is active, false otherwise
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool) {
        SkinMarket.NPCMarket storage market = npcMarkets[_npcId];
        return market.isActive;
    }

    /**
     * @dev Gets the total quantity purchased by a user
     * @param _npcId ID of the NPC market
     * @param _skinType Skin type of the item
     * @param _user Address of the user
     * @return Total quantity purchased by the user
     */
    function getUserPurchases(
        uint256 _npcId,
        string memory _skinType,
        address _user
    ) external view returns (uint256) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_skinType].active,
            "Item not found in market"
        );

        return npcMarkets[_npcId].items[_skinType].userPurchases[_user];
    }

    /**
     * @dev Checks if a user can purchase additional quantity
     * @notice Verifies against per-user purchase limit
     * @param _npcId ID of the NPC market
     * @param _skinType Skin type of the item
     * @param _user Address of the user
     * @param _additionalQuantity Quantity user wants to purchase
     * @return True if user can purchase, false otherwise
     */
    function canUserPurchaseMore(
        uint256 _npcId,
        string memory _skinType,
        address _user,
        uint256 _additionalQuantity
    ) external view returns (bool) {
        if (!npcMarkets[_npcId].isActive) return false;
        if (!npcMarkets[_npcId].items[_skinType].active) return false;

        uint256 limitPerUser = npcMarkets[_npcId].items[_skinType].limitPerUser;

        // If limit = 0, unlimited
        if (limitPerUser == 0) return true;

        uint256 currentPurchases = npcMarkets[_npcId]
            .items[_skinType]
            .userPurchases[_user];
        return (currentPurchases + _additionalQuantity) <= limitPerUser;
    }

    /**
     * @dev Gets transaction record by ID
     * @param _transactionId ID of the transaction
     * @return TransactionRecord struct
     */
    function getTransactionRecord(
        uint256 _transactionId
    ) external view returns (SkinMarket.TransactionRecord memory) {
        require(
            _transactionId > 0 && _transactionId <= transactionCounter,
            "Transaction not found"
        );
        return transactions[_transactionId];
    }

    /**
     * @dev Gets market statistics
     * @param _npcId ID of the NPC market
     * @return MarketStats struct
     */
    function getMarketStats(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketStats memory) {
        return marketStats[_npcId];
    }

    /**
     * @dev Gets user statistics for a market
     * @param _npcId ID of the NPC market
     * @param _user Address of the user
     * @return UserMarketStats struct
     */
    function getUserMarketStats(
        uint256 _npcId,
        address _user
    ) external view returns (SkinMarket.UserMarketStats memory) {
        return userMarketStats[_npcId][_user];
    }

    /**
     * @dev Gets the next transaction ID
     * @return Next transaction ID
     */
    function getNextTransactionId() external view returns (uint256) {
        return transactionCounter + 1;
    }
}
