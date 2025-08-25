// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Gacha.sol";
import "../struct/Item.sol";

interface IGacha {
    // ============ EVENTS ============
    event GachaPoolCreated(
        uint256 indexed poolId,
        string name,
        GachaStructs.GachaType gachaType,
        GachaStructs.PaymentType paymentType,
        uint256 price
    );

    event GachaPoolUpdated(
        uint256 indexed poolId,
        bool isActive,
        bool isPaused
    );

    event GachaItemAdded(
        uint256 indexed poolId,
        uint256 indexed itemId,
        ItemStructs.Rarity rarity,
        uint256 probability
    );

    event GachaItemRemoved(uint256 indexed poolId, uint256 indexed itemId);

    event GachaPulled(
        uint256 indexed pullId,
        uint256 indexed poolId,
        address indexed player,
        uint256 itemId,
        uint256 quantity,
        ItemStructs.Rarity rarity,
        uint256 cost
    );

    event GachaPoolPaused(uint256 indexed poolId);
    event GachaPoolResumed(uint256 indexed poolId);

    // ============ ADMIN FUNCTIONS ============
    function createGachaPool(
        string memory _name,
        string memory _description,
        GachaStructs.GachaType _gachaType,
        GachaStructs.PaymentType _paymentType,
        uint256 _price,
        address _erc20Token,
        uint256 _maxPulls,
        uint256 _startTime,
        uint256 _endTime
    ) external returns (uint256);

    function updateGachaPool(
        uint256 _poolId,
        bool _isActive,
        bool _isPaused
    ) external;

    function addGachaItem(
        uint256 _poolId,
        uint256 _itemId,
        ItemStructs.Rarity _rarity,
        uint256 _probability,
        uint256 _minQuantity,
        uint256 _maxQuantity,
        bool _isGuaranteed,
        uint256 _guaranteedPulls
    ) external;

    function removeGachaItem(uint256 _poolId, uint256 _itemId) external;

    function pauseGachaPool(uint256 _poolId) external;

    function resumeGachaPool(uint256 _poolId) external;

    // ============ USER FUNCTIONS ============
    function pullGacha(uint256 _poolId) external returns (uint256);

    function pullGachaMultiple(
        uint256 _poolId,
        uint256 _count
    ) external returns (uint256[] memory);

    // ============ INTERNAL FUNCTIONS ============
    function recordGachaPull(
        uint256 _poolId,
        address _player,
        uint256 _itemId,
        uint256 _quantity,
        ItemStructs.Rarity _rarity,
        uint256 _cost,
        GachaStructs.PaymentType _paymentType
    ) external returns (uint256);

    function incrementPoolPulls(uint256 _poolId) external;

    function updatePlayerStats(
        address _player,
        uint256 _poolId,
        uint256 _cost
    ) external;

    function updatePoolStats(
        uint256 _poolId,
        uint256 _cost,
        ItemStructs.Rarity _rarity,
        uint256 _itemId
    ) external;

    // ============ VIEW FUNCTIONS ============
    function getGachaPool(
        uint256 _poolId
    ) external view returns (GachaStructs.GachaPool memory);

    function getGachaItems(
        uint256 _poolId
    ) external view returns (GachaStructs.GachaItem[] memory);

    function getGachaResult(
        uint256 _pullId
    ) external view returns (GachaStructs.GachaResult memory);

    function getPlayerStats(
        address _player
    )
        external
        view
        returns (
            uint256 totalPulls,
            uint256 totalSpent,
            uint256[] memory poolIds,
            uint256[] memory pullsPerPool,
            uint256[] memory spentPerPool
        );

    function getPoolStats(
        uint256 _poolId
    )
        external
        view
        returns (
            uint256 totalPulls,
            uint256 totalRevenue,
            uint256[] memory rarityCounts,
            uint256[] memory itemPulls
        );

    function getAvailablePools() external view returns (uint256[] memory);

    function getPoolItemProbabilities(
        uint256 _poolId
    )
        external
        view
        returns (uint256[] memory itemIds, uint256[] memory probabilities);

    function canPullGacha(
        uint256 _poolId,
        address _player
    ) external view returns (bool, string memory);

    // ============ ADDITIONAL VIEW FUNCTIONS ============
    function getPlayerPullsInPool(
        address _player,
        uint256 _poolId
    ) external view returns (uint256);

    function getPlayerSpentInPool(
        address _player,
        uint256 _poolId
    ) external view returns (uint256);

    function getPoolTotalPulls(uint256 _poolId) external view returns (uint256);

    function getPoolTotalRevenue(
        uint256 _poolId
    ) external view returns (uint256);

    function getPoolRarityCount(
        uint256 _poolId,
        ItemStructs.Rarity _rarity
    ) external view returns (uint256);

    function getPoolItemPulls(
        uint256 _poolId,
        uint256 _itemId
    ) external view returns (uint256);

    function getPoolIds() external view returns (uint256[] memory);

    function getActivePoolIds() external view returns (uint256[] memory);

    function isPoolActive(uint256 _poolId) external view returns (bool);

    function isPoolPaused(uint256 _poolId) external view returns (bool);

    function getPoolTimeRange(
        uint256 _poolId
    ) external view returns (uint256 startTime, uint256 endTime);

    function getPoolCurrentPulls(
        uint256 _poolId
    ) external view returns (uint256);

    function getPoolMaxPulls(uint256 _poolId) external view returns (uint256);

    function getNextPullId() external view returns (uint256);

    function getNextPoolId() external view returns (uint256);

    function getPoolPrice(uint256 _poolId) external view returns (uint256);

    function getTotalPools() external view returns (uint256);

    function getGachaItem(
        uint256 _poolId,
        uint256 _itemId
    ) external view returns (GachaStructs.GachaItem memory);

    function getPlayerGuaranteedPulls(
        address _player,
        uint256 _poolId
    ) external view returns (uint256);

    function getPoolPaymentType(
        uint256 _poolId
    ) external view returns (GachaStructs.PaymentType);

    function getPoolERC20Token(uint256 _poolId) external view returns (address);
}
