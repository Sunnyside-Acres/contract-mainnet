//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import '../../contracts/struct/SkinMarket.sol';
interface ISkinMarketComponent {
    
    
    function recordTransaction(address _player, uint256 _npcId, string memory _typeSkin, uint256 _quantity, uint256 _pricePerUnit, uint256 _totalPrice, bool _isBuy) external returns (uint256);
    function addUserPurchase(uint256 _npcId, string memory _typeSkin, address _user, uint256 _quantity) external;

     /**
     * @notice Creates a new NPC Market (admin only)
     * @param _npcId ID of the NPC
     * @param _name Name of the NPC Market
     * @param _minTransactionAmount Minimum transaction amount in wei
     * @param _maxTransactionAmount Maximum transaction amount in wei
     */
    function createNPCMarket(
        uint256 _npcId,
        string memory _name,
        uint256 _minTransactionAmount,
        uint256 _maxTransactionAmount
    ) external;

    /**
     * @notice Adds an item to the NPC Market (admin only)
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _limitPerUser Purchase limit per user (0 = unlimited)
     * @param _pricePerUnit Price per unit in wei
     * @param _isSelling Whether NPC is selling (true) or buying (false)
     */
    function addItemToMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external;

    /**
     * @notice Updates an item's details in the NPC Market (admin only)
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _limitPerUser New purchase limit per user
     * @param _pricePerUnit New price per unit in wei
     */
    function updateItemInMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _limitPerUser,
        uint256 _pricePerUnit
    ) external;

    /**
     * @notice Removes an item from the NPC Market (admin only)
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     */
    function removeItemFromMarket(uint256 _npcId, string memory _typeSkin) external;

    /**
     * @notice Sets market active status (admin only)
     * @param _npcId ID of the NPC market
     * @param _isActive Whether market is active
     */
    function setMarketActive(uint256 _npcId, bool _isActive) external;

    /**
     * @notice Allows a player to purchase items from an NPC with ETH
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _quantity Quantity to purchase
     * @return transactionId ID of the transaction
     */
    function buyItemFromNPC(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity
    ) external payable returns (uint256);

    /**
     * @notice Allows a player to sell items to an NPC for ETH
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _quantity Quantity to sell
     * @return transactionId ID of the transaction
     */
    function sellItemToNPC(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity
    ) external returns (uint256);

    /**
     * @notice Resets a user's purchase history (admin only)
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _user Address of the user
     */
    function resetUserPurchases(
        uint256 _npcId,
        string memory _typeSkin,
        address _user
    ) external;

    /**
     * @notice Emergency withdrawal of all ETH (admin only)
     * @param _to Address to receive the ETH
     * @return success Whether withdrawal was successful
     */
    function emergencyWithdraw(address payable _to) external returns (bool);

    // ============ READ FUNCTIONS ============

    /**
     * @notice Gets market item information
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @return MarketItemView struct with item details
     */
    function getMarketItem(uint256 _npcId, string memory _typeSkin) external view returns (SkinMarket.MarketItemView memory);

    /**
     * @notice Gets all items in an NPC market
     * @param _npcId ID of the NPC market
     * @return Array of MarketItemView structs
     */
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketItemView[] memory);

    /**
     * @notice Gets all item IDs in an NPC market
     * @param _npcId ID of the NPC market
     * @return Array of item IDs
     */
    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory);

    /**
     * @notice Gets basic information about an NPC market
     * @param _npcId ID of the NPC market
     * @return npcId ID of the NPC
     * @return name Name of the market
     * @return isActive Whether market is active
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
        );

    /**
     * @notice Checks if an NPC market is open
     * @param _npcId ID of the NPC market
     * @return True if market is open
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool);

    /**
     * @notice Calculates the total price to buy items
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _quantity Quantity to purchase
     * @return totalPrice Total price in wei
     */
    function calculateBuyPrice(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity
    ) external view returns (uint256);

    /**
     * @notice Calculates the total price when selling items
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _quantity Quantity to sell
     * @return totalPrice Total price in wei
     */
    function calculateSellPrice(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity
    ) external view returns (uint256);

    /**
     * @notice Gets user's purchase count for an item
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _user Address of the user
     * @return Total quantity purchased by the user
     */
    function getUserPurchases(
        uint256 _npcId,
        string memory _typeSkin,
        address _user
    ) external view returns (uint256);

    /**
     * @notice Checks if a user can purchase additional quantity
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _user Address of the user
     * @param _additionalQuantity Additional quantity to check
     * @return True if user can purchase more
     */
    function canUserPurchaseMore(uint256 _npcId, string memory _typeSkin, address _user, uint256 _additionalQuantity) external view returns (bool);

    /**
     * @notice Gets remaining purchase limit for a user
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _user Address of the user
     * @return Remaining limit (max uint256 if unlimited, 0 if limit reached)
     */
    function getRemainingUserLimit(
        uint256 _npcId,
        string memory _typeSkin,
        address _user
    ) external view returns (uint256);

    /**
     * @notice Gets transaction record by ID
     * @param _transactionId ID of the transaction
     * @return TransactionRecord struct
     */
    function getTransactionRecord(
        uint256 _transactionId
    ) external view returns (SkinMarket.TransactionRecord memory);

    /**
     * @notice Gets market statistics
     * @param _npcId ID of the NPC market
     * @return MarketStats struct
     */
    function getMarketStats(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketStats memory);

    /**
     * @notice Gets user statistics for a market
     * @param _npcId ID of the NPC market
     * @param _user Address of the user
     * @return UserMarketStats struct
     */
    function getUserMarketStats(
        uint256 _npcId,
        address _user
    ) external view returns (SkinMarket.UserMarketStats memory);

    /**
     * @notice Checks if a player can buy an item
     * @param _player Address of the player
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _quantity Quantity to buy
     * @return canBuy True if player can buy
     * @return reason Explanation if cannot buy
     */
    function canPlayerBuyItem(
        address _player,
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity
    ) external view returns (bool canBuy, string memory reason);

    /**
     * @notice Checks if a player can sell an item
     * @param _player Address of the player
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _quantity Quantity to sell
     * @return canSell True if player can sell
     * @return reason Explanation if cannot sell
     */
    function canPlayerSellItem(
        address _player,
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _quantity
    ) external view returns (bool canSell, string memory reason);

    /**
     * @notice Gets contract's ETH balance
     * @return Balance in wei
     */
    function getContractBalance() external view returns (uint256);

    function updateNPCMarketConfig(
        uint256 _npcId,
        string memory _name,
        uint256 _minTransactionAmount,
        uint256 _maxTransactionAmount
    ) external; 
}