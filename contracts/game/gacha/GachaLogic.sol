// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IGacha.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IERC20.sol";
import "../../struct/Gacha.sol";
import "../../struct/Player.sol";
import "../../struct/Inventory.sol";
import "../../struct/Item.sol";

/**
 * @title GachaLogic
 * @dev Logic contract cho hệ thống Gacha - xử lý logic gacha, thanh toán và random
 *
 * Tính năng chính:
 * - Tạo và quản lý gacha pools
 * - Xử lý gacha pulls với random
 * - Thanh toán bằng Sunny, Sunlight, ERC20
 * - Hệ thống đảm bảo (guaranteed) items
 * - Thống kê và báo cáo
 */
contract GachaLogic {
    IWorld public world;
    IGacha public gachaProxy;
    IPlayerComponent public playerProxy;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    address public deployerWallet; // Địa chỉ ví deploy để nhận ERC20 tokens

    // ============ CONSTANTS ============
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant MAX_PULLS_PER_TX = 10; // Giới hạn số lần pull mỗi transaction

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
    event DeployerWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet
    );
    event ERC20PaymentProcessed(
        address indexed player,
        address indexed token,
        uint256 amount,
        address indexed deployerWallet
    );

    // ============ MODIFIERS ============
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
        address _gachaProxy,
        address _playerProxy,
        address _inventoryProxy,
        address _itemProxy,
        address _deployerWallet
    ) {
        world = IWorld(_world);
        gachaProxy = IGacha(_gachaProxy);
        playerProxy = IPlayerComponent(_playerProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
        deployerWallet = _deployerWallet;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Admin tạo gacha pool mới
     */
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
    ) external onlyAdmin returns (uint256) {
        require(_price > 0, "Price must be greater than 0");
        require(_startTime < _endTime, "Start time must be before end time");
        require(
            _startTime > block.timestamp,
            "Start time must be in the future"
        );

        if (_paymentType == GachaStructs.PaymentType.ERC20) {
            require(_erc20Token != address(0), "ERC20 token address required");
        }

        uint256 poolId = gachaProxy.createGachaPool(
            _name,
            _description,
            _gachaType,
            _paymentType,
            _price,
            _erc20Token,
            _maxPulls,
            _startTime,
            _endTime
        );

        emit GachaPoolCreated(poolId, _name, _gachaType, _paymentType, _price);
        return poolId;
    }

    /**
     * @dev Admin cập nhật trạng thái gacha pool
     */
    function updateGachaPool(
        uint256 _poolId,
        bool _isActive,
        bool _isPaused
    ) external onlyAdmin {
        gachaProxy.updateGachaPool(_poolId, _isActive, _isPaused);
        emit GachaPoolUpdated(_poolId, _isActive, _isPaused);
    }

    /**
     * @dev Admin thêm item vào gacha pool
     */
    function addGachaItem(
        uint256 _poolId,
        uint256 _itemId,
        ItemStructs.Rarity _rarity,
        uint256 _probability,
        uint256 _minQuantity,
        uint256 _maxQuantity,
        bool _isGuaranteed,
        uint256 _guaranteedPulls
    ) external onlyAdmin {
        require(_probability <= BASIS_POINTS, "Probability cannot exceed 100%");
        require(
            _minQuantity <= _maxQuantity,
            "Min quantity cannot exceed max quantity"
        );
        require(_minQuantity > 0, "Min quantity must be greater than 0");

        gachaProxy.addGachaItem(
            _poolId,
            _itemId,
            _rarity,
            _probability,
            _minQuantity,
            _maxQuantity,
            _isGuaranteed,
            _guaranteedPulls
        );

        emit GachaItemAdded(_poolId, _itemId, _rarity, _probability);
    }

    /**
     * @dev Admin xóa item khỏi gacha pool
     */
    function removeGachaItem(
        uint256 _poolId,
        uint256 _itemId
    ) external onlyAdmin {
        gachaProxy.removeGachaItem(_poolId, _itemId);
        emit GachaItemRemoved(_poolId, _itemId);
    }

    /**
     * @dev Admin tạm dừng gacha pool
     */
    function pauseGachaPool(uint256 _poolId) external onlyAdmin {
        gachaProxy.updateGachaPool(_poolId, true, true);
        emit GachaPoolPaused(_poolId);
    }

    /**
     * @dev Admin tiếp tục gacha pool
     */
    function resumeGachaPool(uint256 _poolId) external onlyAdmin {
        gachaProxy.updateGachaPool(_poolId, true, false);
        emit GachaPoolResumed(_poolId);
    }

    /**
     * @dev Admin cập nhật địa chỉ ví deploy
     */
    function updateDeployerWallet(
        address _newDeployerWallet
    ) external onlyAdmin {
        require(
            _newDeployerWallet != address(0),
            "Invalid deployer wallet address"
        );
        address oldWallet = deployerWallet;
        deployerWallet = _newDeployerWallet;
        emit DeployerWalletUpdated(oldWallet, _newDeployerWallet);
    }

    /**
     * @dev Admin rút ERC20 tokens từ contract (emergency)
     */
    function emergencyWithdrawERC20(
        address _token,
        address _to
    ) external onlyAdmin {
        require(_to != address(0), "Invalid recipient address");
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        require(token.transfer(_to, balance), "ERC20 transfer failed");
    }

    // ============ USER FUNCTIONS ============

    /**
     * @dev User pull gacha một lần
     */
    function pullGacha(uint256 _poolId) external returns (uint256) {
        (bool canPull, string memory reason) = _canPullGacha(
            _poolId,
            msg.sender
        );
        require(canPull, reason);

        // Xử lý thanh toán
        uint256 cost = gachaProxy.getGachaPool(_poolId).price;
        processPayment(_poolId, cost);

        // Thực hiện gacha
        (
            uint256 itemId,
            uint256 quantity,
            ItemStructs.Rarity rarity
        ) = performGacha(_poolId, msg.sender);

        // Ghi nhận kết quả
        uint256 pullId = gachaProxy.recordGachaPull(
            _poolId,
            msg.sender,
            itemId,
            quantity,
            rarity,
            cost,
            gachaProxy.getGachaPool(_poolId).paymentType
        );

        // Cập nhật thống kê
        gachaProxy.incrementPoolPulls(_poolId);
        gachaProxy.updatePlayerStats(msg.sender, _poolId, cost);
        gachaProxy.updatePoolStats(_poolId, cost, rarity, itemId);

        // Thêm item vào inventory
        addItemToInventory(msg.sender, itemId, quantity);

        emit GachaPulled(
            pullId,
            _poolId,
            msg.sender,
            itemId,
            quantity,
            rarity,
            cost
        );
        return pullId;
    }

    /**
     * @dev User pull gacha nhiều lần
     */
    function pullGachaMultiple(
        uint256 _poolId,
        uint256 _count
    ) external returns (uint256[] memory) {
        require(_count > 0 && _count <= MAX_PULLS_PER_TX, "Invalid pull count");

        (bool canPull, string memory reason) = _canPullGacha(
            _poolId,
            msg.sender
        );
        require(canPull, reason);

        uint256 cost = gachaProxy.getGachaPool(_poolId).price * _count;
        processPayment(_poolId, cost);

        uint256[] memory pullIds = new uint256[](_count);

        for (uint256 i = 0; i < _count; i++) {
            // Thực hiện gacha
            (
                uint256 itemId,
                uint256 quantity,
                ItemStructs.Rarity rarity
            ) = performGacha(_poolId, msg.sender);

            // Ghi nhận kết quả
            uint256 pullId = gachaProxy.recordGachaPull(
                _poolId,
                msg.sender,
                itemId,
                quantity,
                rarity,
                cost / _count,
                gachaProxy.getGachaPool(_poolId).paymentType
            );

            pullIds[i] = pullId;

            // Thêm item vào inventory
            addItemToInventory(msg.sender, itemId, quantity);

            emit GachaPulled(
                pullId,
                _poolId,
                msg.sender,
                itemId,
                quantity,
                rarity,
                cost / _count
            );
        }

        // Cập nhật thống kê
        gachaProxy.incrementPoolPulls(_poolId);
        gachaProxy.updatePlayerStats(msg.sender, _poolId, cost);
        gachaProxy.updatePoolStats(_poolId, cost, ItemStructs.Rarity.Common, 0); // Placeholder values

        return pullIds;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Xử lý thanh toán cho gacha
     */
    function processPayment(uint256 _poolId, uint256 _cost) internal {
        GachaStructs.PaymentType paymentType = gachaProxy
            .getGachaPool(_poolId)
            .paymentType;

        if (paymentType == GachaStructs.PaymentType.Sunny) {
            // Trừ Sunny từ player
            playerProxy.subtractSunny(msg.sender, _cost);
        } else if (paymentType == GachaStructs.PaymentType.Sunlight) {
            // Trừ Sunlight từ player
            playerProxy.subtractSunlight(msg.sender, _cost);
        } else if (paymentType == GachaStructs.PaymentType.ERC20) {
            // Transfer ERC20 token từ player đến ví deploy
            address erc20Token = gachaProxy.getGachaPool(_poolId).erc20Token;
            require(erc20Token != address(0), "Invalid ERC20 token");
            require(deployerWallet != address(0), "Deployer wallet not set");

            // Kiểm tra allowance
            IERC20 token = IERC20(erc20Token);
            require(
                token.allowance(msg.sender, address(this)) >= _cost,
                "Insufficient ERC20 allowance"
            );
            require(
                token.balanceOf(msg.sender) >= _cost,
                "Insufficient ERC20 balance"
            );

            // Transfer từ player đến ví deploy
            require(
                token.transferFrom(msg.sender, deployerWallet, _cost),
                "ERC20 transfer failed"
            );

            // Emit event
            emit ERC20PaymentProcessed(
                msg.sender,
                erc20Token,
                _cost,
                deployerWallet
            );
        }
    }

    /**
     * @dev Thực hiện gacha và trả về kết quả
     */
    function performGacha(
        uint256 _poolId,
        address _player
    )
        internal
        view
        returns (uint256 itemId, uint256 quantity, ItemStructs.Rarity rarity)
    {
        GachaStructs.GachaItem[] memory items = gachaProxy.getGachaItems(
            _poolId
        );
        require(items.length > 0, "No items in gacha pool");

        // Kiểm tra guaranteed items
        uint256 playerPulls = gachaProxy.getPlayerPullsInPool(_player, _poolId);

        for (uint256 i = 0; i < items.length; i++) {
            if (
                items[i].isGuaranteed &&
                (playerPulls + 1) % items[i].guaranteedPulls == 0
            ) {
                // Đảm bảo item này
                return (
                    items[i].itemId,
                    _getRandomQuantity(
                        items[i].minQuantity,
                        items[i].maxQuantity
                    ),
                    items[i].rarity
                );
            }
        }

        // Random item dựa trên probability
        uint256 randomValue = _generateRandomNumber() % BASIS_POINTS;
        uint256 cumulativeProbability = 0;

        for (uint256 i = 0; i < items.length; i++) {
            cumulativeProbability += items[i].probability;
            if (randomValue < cumulativeProbability) {
                return (
                    items[i].itemId,
                    _getRandomQuantity(
                        items[i].minQuantity,
                        items[i].maxQuantity
                    ),
                    items[i].rarity
                );
            }
        }

        // Fallback: trả về item đầu tiên
        return (
            items[0].itemId,
            _getRandomQuantity(items[0].minQuantity, items[0].maxQuantity),
            items[0].rarity
        );
    }

    /**
     * @dev Thêm item vào inventory của player
     */
    function addItemToInventory(
        address _player,
        uint256 _itemId,
        uint256 _quantity
    ) internal {
        // Thêm item vào inventory với durability và expiration mặc định
        inventoryProxy.setItem(_player, _itemId, _quantity, 100, 0); // 100% durability, không expiration
    }

    /**
     * @dev Tạo số ngẫu nhiên (đơn giản)
     */
    function _generateRandomNumber() internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.prevrandao,
                        msg.sender,
                        block.number
                    )
                )
            );
    }

    /**
     * @dev Lấy số lượng ngẫu nhiên trong khoảng min-max
     */
    function _getRandomQuantity(
        uint256 _min,
        uint256 _max
    ) internal view returns (uint256) {
        if (_min == _max) return _min;

        uint256 random = _generateRandomNumber();
        return _min + (random % (_max - _min + 1));
    }

    // ============ VIEW FUNCTIONS ============

    function getGachaPool(
        uint256 _poolId
    ) external view returns (GachaStructs.GachaPool memory) {
        return gachaProxy.getGachaPool(_poolId);
    }

    function getGachaItems(
        uint256 _poolId
    ) external view returns (GachaStructs.GachaItem[] memory) {
        return gachaProxy.getGachaItems(_poolId);
    }

    function getGachaResult(
        uint256 _pullId
    ) external view returns (GachaStructs.GachaResult memory) {
        return gachaProxy.getGachaResult(_pullId);
    }

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
        )
    {
        uint256[] memory allPoolIds = gachaProxy.getPoolIds();
        poolIds = new uint256[](allPoolIds.length);
        pullsPerPool = new uint256[](allPoolIds.length);
        spentPerPool = new uint256[](allPoolIds.length);

        totalPulls = 0;
        totalSpent = 0;

        for (uint256 i = 0; i < allPoolIds.length; i++) {
            poolIds[i] = allPoolIds[i];
            pullsPerPool[i] = gachaProxy.getPlayerPullsInPool(
                _player,
                allPoolIds[i]
            );
            spentPerPool[i] = gachaProxy.getPlayerSpentInPool(
                _player,
                allPoolIds[i]
            );
            totalPulls += pullsPerPool[i];
            totalSpent += spentPerPool[i];
        }
    }

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
        )
    {
        totalPulls = gachaProxy.getPoolTotalPulls(_poolId);
        totalRevenue = gachaProxy.getPoolTotalRevenue(_poolId);

        rarityCounts = new uint256[](5); // 5 rarities
        for (uint256 i = 0; i < 5; i++) {
            rarityCounts[i] = gachaProxy.getPoolRarityCount(
                _poolId,
                ItemStructs.Rarity(i)
            );
        }

        GachaStructs.GachaItem[] memory items = gachaProxy.getGachaItems(
            _poolId
        );
        itemPulls = new uint256[](items.length);
        for (uint256 i = 0; i < items.length; i++) {
            itemPulls[i] = gachaProxy.getPoolItemPulls(
                _poolId,
                items[i].itemId
            );
        }
    }

    function getAvailablePools() external view returns (uint256[] memory) {
        return gachaProxy.getActivePoolIds();
    }

    function getPoolItemProbabilities(
        uint256 _poolId
    )
        external
        view
        returns (uint256[] memory itemIds, uint256[] memory probabilities)
    {
        GachaStructs.GachaItem[] memory items = gachaProxy.getGachaItems(
            _poolId
        );
        itemIds = new uint256[](items.length);
        probabilities = new uint256[](items.length);

        for (uint256 i = 0; i < items.length; i++) {
            itemIds[i] = items[i].itemId;
            probabilities[i] = items[i].probability;
        }
    }

    function _canPullGacha(
        uint256 _poolId,
        address _player
    ) internal view returns (bool, string memory) {
        // Kiểm tra pool có tồn tại và active không
        if (!gachaProxy.isPoolActive(_poolId)) {
            return (false, "Pool is not active");
        }

        if (gachaProxy.isPoolPaused(_poolId)) {
            return (false, "Pool is paused");
        }

        // Kiểm tra thời gian
        (uint256 startTime, uint256 endTime) = gachaProxy.getPoolTimeRange(
            _poolId
        );
        if (block.timestamp < startTime || block.timestamp > endTime) {
            return (false, "Pool is not available at this time");
        }

        // Kiểm tra số lần pull tối đa
        uint256 currentPulls = gachaProxy.getPoolCurrentPulls(_poolId);
        uint256 maxPulls = gachaProxy.getPoolMaxPulls(_poolId);
        if (currentPulls >= maxPulls) {
            return (false, "Pool has reached maximum pulls");
        }

        // Kiểm tra balance
        uint256 cost = gachaProxy.getGachaPool(_poolId).price;
        GachaStructs.PaymentType paymentType = gachaProxy
            .getGachaPool(_poolId)
            .paymentType;

        if (paymentType == GachaStructs.PaymentType.Sunny) {
            try playerProxy.getPlayer(_player) returns (Player memory player) {
                if (player.sunny < cost) {
                    return (false, "Insufficient Sunny balance");
                }
            } catch {
                return (false, "Player not found");
            }
        } else if (paymentType == GachaStructs.PaymentType.Sunlight) {
            try playerProxy.getPlayer(_player) returns (Player memory player) {
                if (player.sunlight < cost) {
                    return (false, "Insufficient Sunlight balance");
                }
            } catch {
                return (false, "Player not found");
            }
        } else if (paymentType == GachaStructs.PaymentType.ERC20) {
            // Kiểm tra ERC20 balance và allowance
            address erc20Token = gachaProxy.getGachaPool(_poolId).erc20Token;
            if (erc20Token == address(0)) {
                return (false, "Invalid ERC20 token");
            }

            IERC20 token = IERC20(erc20Token);
            if (token.balanceOf(_player) < cost) {
                return (false, "Insufficient ERC20 balance");
            }
            if (token.allowance(_player, address(this)) < cost) {
                return (false, "Insufficient ERC20 allowance");
            }
        }

        return (true, "Can pull gacha");
    }

    function canPullGacha(
        uint256 _poolId,
        address _player
    ) external view returns (bool, string memory) {
        return _canPullGacha(_poolId, _player);
    }
}
