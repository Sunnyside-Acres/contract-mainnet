// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Gacha.sol";

/**
 * @title GachaComponent
 * @dev Component contract cho hệ thống Gacha - lưu trữ dữ liệu gacha pools, items và kết quả
 *
 * Tính năng chính:
 * - Lưu trữ thông tin gacha pools
 * - Quản lý danh sách items trong từng pool
 * - Lưu trữ kết quả gacha pulls
 * - Thống kê người chơi và pool
 */
contract GachaComponent {
    address public world;
    address public admin;
    address public implementation;

    // ============ STORAGE ============
    uint256 public nextPoolId = 1;
    uint256 public nextPullId = 1;

    // Mapping từ poolId đến GachaPool
    mapping(uint256 => GachaStructs.GachaPool) public gachaPools;

    // Mapping từ poolId đến danh sách items
    mapping(uint256 => GachaStructs.GachaItem[]) public gachaItems;

    // Mapping từ poolId và itemId đến GachaItem
    mapping(uint256 => mapping(uint256 => GachaStructs.GachaItem))
        public gachaItemMap;

    // Mapping từ pullId đến GachaResult
    mapping(uint256 => GachaStructs.GachaResult) public gachaResults;

    // Mapping từ player address đến PlayerGachaStats
    mapping(address => GachaStructs.PlayerGachaStats) public playerStats;

    // Mapping từ poolId đến GachaPoolStats
    mapping(uint256 => GachaStructs.GachaPoolStats) public poolStats;

    // Danh sách tất cả pool IDs
    uint256[] public allPoolIds;

    // Danh sách active pool IDs
    uint256[] public activePoolIds;

    // ============ MODIFIERS ============
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    // ============ WRITE FUNCTIONS ============

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
    ) external onlyAuthorized returns (uint256) {
        uint256 poolId = nextPoolId++;

        gachaPools[poolId] = GachaStructs.GachaPool({
            id: poolId,
            name: _name,
            description: _description,
            gachaType: _gachaType,
            paymentType: _paymentType,
            price: _price,
            erc20Token: _erc20Token,
            maxPulls: _maxPulls,
            currentPulls: 0,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            isPaused: false
        });

        allPoolIds.push(poolId);
        activePoolIds.push(poolId);

        return poolId;
    }

    function updateGachaPool(
        uint256 _poolId,
        bool _isActive,
        bool _isPaused
    ) external onlyAuthorized {
        require(gachaPools[_poolId].id != 0, "Pool does not exist");

        gachaPools[_poolId].isActive = _isActive;
        gachaPools[_poolId].isPaused = _isPaused;

        // Cập nhật activePoolIds
        if (_isActive) {
            bool exists = false;
            for (uint256 i = 0; i < activePoolIds.length; i++) {
                if (activePoolIds[i] == _poolId) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                activePoolIds.push(_poolId);
            }
        } else {
            for (uint256 i = 0; i < activePoolIds.length; i++) {
                if (activePoolIds[i] == _poolId) {
                    activePoolIds[i] = activePoolIds[activePoolIds.length - 1];
                    activePoolIds.pop();
                    break;
                }
            }
        }
    }

    function addGachaItem(
        uint256 _poolId,
        uint256 _itemId,
        ItemStructs.Rarity _rarity,
        uint256 _probability,
        uint256 _minQuantity,
        uint256 _maxQuantity,
        bool _isGuaranteed,
        uint256 _guaranteedPulls
    ) external onlyAuthorized {
        require(gachaPools[_poolId].id != 0, "Pool does not exist");
        require(
            gachaItemMap[_poolId][_itemId].itemId == 0,
            "Item already exists in pool"
        );

        GachaStructs.GachaItem memory newItem = GachaStructs.GachaItem({
            itemId: _itemId,
            rarity: _rarity,
            probability: _probability,
            minQuantity: _minQuantity,
            maxQuantity: _maxQuantity,
            isGuaranteed: _isGuaranteed,
            guaranteedPulls: _guaranteedPulls
        });

        gachaItems[_poolId].push(newItem);
        gachaItemMap[_poolId][_itemId] = newItem;
    }

    function removeGachaItem(
        uint256 _poolId,
        uint256 _itemId
    ) external onlyAuthorized {
        require(gachaPools[_poolId].id != 0, "Pool does not exist");
        require(
            gachaItemMap[_poolId][_itemId].itemId != 0,
            "Item does not exist in pool"
        );

        // Xóa khỏi mapping
        delete gachaItemMap[_poolId][_itemId];

        // Xóa khỏi array
        GachaStructs.GachaItem[] storage items = gachaItems[_poolId];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i].itemId == _itemId) {
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }
    }

    function recordGachaPull(
        uint256 _poolId,
        address _player,
        uint256 _itemId,
        uint256 _quantity,
        ItemStructs.Rarity _rarity,
        uint256 _cost,
        GachaStructs.PaymentType _paymentType
    ) external onlyAuthorized returns (uint256) {
        uint256 pullId = nextPullId++;

        gachaResults[pullId] = GachaStructs.GachaResult({
            pullId: pullId,
            gachaPoolId: _poolId,
            player: _player,
            itemId: _itemId,
            quantity: _quantity,
            rarity: _rarity,
            timestamp: block.timestamp,
            cost: _cost,
            paymentType: _paymentType
        });

        return pullId;
    }

    function incrementPoolPulls(uint256 _poolId) external onlyAuthorized {
        gachaPools[_poolId].currentPulls++;
    }

    function updatePlayerStats(
        address _player,
        uint256 _poolId,
        uint256 _cost
    ) external onlyAuthorized {
        GachaStructs.PlayerGachaStats storage stats = playerStats[_player];
        stats.player = _player;
        stats.totalPulls++;
        stats.totalSpent += _cost;
        stats.pullsPerPool[_poolId]++;
        stats.spentPerPool[_poolId] += _cost;
    }

    function updatePoolStats(
        uint256 _poolId,
        uint256 _cost,
        ItemStructs.Rarity _rarity,
        uint256 _itemId
    ) external onlyAuthorized {
        GachaStructs.GachaPoolStats storage stats = poolStats[_poolId];
        stats.totalPulls++;
        stats.totalRevenue += _cost;
        stats.itemsPulled[_rarity]++;
        stats.itemPulls[_itemId]++;
    }

    // ============ READ FUNCTIONS ============

    function getGachaPool(
        uint256 _poolId
    ) external view returns (GachaStructs.GachaPool memory) {
        return gachaPools[_poolId];
    }

    function getGachaItem(
        uint256 _poolId,
        uint256 _itemId
    ) external view returns (GachaStructs.GachaItem memory) {
        return gachaItemMap[_poolId][_itemId];
    }

    function getGachaItems(
        uint256 _poolId
    ) external view returns (GachaStructs.GachaItem[] memory) {
        return gachaItems[_poolId];
    }

    function getGachaResult(
        uint256 _pullId
    ) external view returns (GachaStructs.GachaResult memory) {
        return gachaResults[_pullId];
    }

    function getPlayerPullsInPool(
        address _player,
        uint256 _poolId
    ) external view returns (uint256) {
        return playerStats[_player].pullsPerPool[_poolId];
    }

    function getPlayerSpentInPool(
        address _player,
        uint256 _poolId
    ) external view returns (uint256) {
        return playerStats[_player].spentPerPool[_poolId];
    }

    function getPlayerGuaranteedPulls(
        address _player,
        uint256 _poolId
    ) external view returns (uint256) {
        return playerStats[_player].guaranteedPulls[_poolId];
    }

    function getPoolTotalPulls(
        uint256 _poolId
    ) external view returns (uint256) {
        return poolStats[_poolId].totalPulls;
    }

    function getPoolTotalRevenue(
        uint256 _poolId
    ) external view returns (uint256) {
        return poolStats[_poolId].totalRevenue;
    }

    function getPoolRarityCount(
        uint256 _poolId,
        ItemStructs.Rarity _rarity
    ) external view returns (uint256) {
        return poolStats[_poolId].itemsPulled[_rarity];
    }

    function getPoolItemPulls(
        uint256 _poolId,
        uint256 _itemId
    ) external view returns (uint256) {
        return poolStats[_poolId].itemPulls[_itemId];
    }

    function getNextPullId() external view returns (uint256) {
        return nextPullId;
    }

    function getNextPoolId() external view returns (uint256) {
        return nextPoolId;
    }

    function isPoolActive(uint256 _poolId) external view returns (bool) {
        return gachaPools[_poolId].isActive;
    }

    function isPoolPaused(uint256 _poolId) external view returns (bool) {
        return gachaPools[_poolId].isPaused;
    }

    function getPoolPrice(uint256 _poolId) external view returns (uint256) {
        return gachaPools[_poolId].price;
    }

    function getPoolPaymentType(
        uint256 _poolId
    ) external view returns (GachaStructs.PaymentType) {
        return gachaPools[_poolId].paymentType;
    }

    function getPoolERC20Token(
        uint256 _poolId
    ) external view returns (address) {
        return gachaPools[_poolId].erc20Token;
    }

    function getPoolMaxPulls(uint256 _poolId) external view returns (uint256) {
        return gachaPools[_poolId].maxPulls;
    }

    function getPoolCurrentPulls(
        uint256 _poolId
    ) external view returns (uint256) {
        return gachaPools[_poolId].currentPulls;
    }

    function getPoolTimeRange(
        uint256 _poolId
    ) external view returns (uint256 startTime, uint256 endTime) {
        GachaStructs.GachaPool memory pool = gachaPools[_poolId];
        return (pool.startTime, pool.endTime);
    }

    function getTotalPools() external view returns (uint256) {
        return allPoolIds.length;
    }

    function getPoolIds() external view returns (uint256[] memory) {
        return allPoolIds;
    }

    function getActivePoolIds() external view returns (uint256[] memory) {
        return activePoolIds;
    }
}
