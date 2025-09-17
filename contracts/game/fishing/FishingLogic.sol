// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IWeather.sol";
import "../../struct/Weather.sol";
import "../../struct/Item.sol";

contract FishingLogic {
    IWorld public world;
    IInventoryComponent public inventoryComponent;
    IItemComponent public itemComponent;
    IPlayerComponent public playerComponent;
    IWeatherComponent public weatherComponent;

    uint256 public fishingCooldown = 30 seconds;
    uint256 public constant FISHING_ROD_ID = 9; // ID của cần câu
    uint256 public constant FISHING_CHEST_ID = 33; // ID của rương câu cá

    // Lưu thời gian câu cá gần nhất của người chơi
    mapping(address => uint256) public lastFishingTime;
    uint256 private nonce; // Biến nonce để tạo số ngẫu nhiên

    constructor(
        address _world,
        address _inventoryComponent,
        address _itemComponent,
        address _playerComponent,
        address _weatherComponent
    ) {
        world = IWorld(_world);
        inventoryComponent = IInventoryComponent(_inventoryComponent);
        itemComponent = IItemComponent(_itemComponent);
        playerComponent = IPlayerComponent(_playerComponent);
        weatherComponent = IWeatherComponent(_weatherComponent);
    }

    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    // Events
    event FishingStarted(address indexed player, uint256 timestamp);
    event FishingCompleted(
        address indexed player,
        uint256 itemId,
        uint256 quantity
    );
    event ChestOpened(
        address indexed player,
        uint256 chestId,
        uint256[] itemIds,
        uint256[] amounts
    );

    struct Reward {
        uint256 itemId;
        uint256 amount;
    }

    /**
     * @dev Thực hiện câu cá
     */
    function fishing() external {
        // Kiểm tra cooldown
        require(
            block.timestamp >= lastFishingTime[msg.sender] + fishingCooldown,
            "Fishing cooldown has not expired"
        );

        // Kiểm tra level người chơi
        Player memory player = playerComponent.getPlayer(msg.sender);
        require(player.level >= 1, "Player level must be at least 1");

        // Kiểm tra có cần câu không
        InventoryItem memory fishingRod = inventoryComponent.getItem(
            msg.sender,
            FISHING_ROD_ID
        );
        require(
            fishingRod.quantity > 0,
            "Player must have at least 1 fishing rod"
        );

        // Emit event bắt đầu câu cá
        emit FishingStarted(msg.sender, block.timestamp);

        // Lấy thông tin thời tiết hiện tại
        WeatherStructs.Weather memory currentWeather = weatherComponent
            .getCurrentWeather();

        // Xác định tỉ lệ nhận rương dựa trên thời tiết
        uint256 chestProbability = _getChestProbabilityByWeather(
            currentWeather.state
        );

        // Tạo số ngẫu nhiên từ 1-100
        uint256 randomNum = _generateRandomNumber(100) + 1;

        // Kiểm tra xem có nhận được rương không
        if (randomNum <= chestProbability) {
            // Thêm rương vào túi đồ người chơi
            inventoryComponent.setItem(
                msg.sender,
                FISHING_CHEST_ID, // ID rương
                1, // Số lượng
                100, // Độ bền
                0 // Thời gian hết hạn
            );

            emit FishingCompleted(msg.sender, FISHING_CHEST_ID, 1);
        } else {
            // Không nhận được gì
            emit FishingCompleted(msg.sender, 0, 0);
        }

        // Giảm độ bền cần câu
        _reduceFishingRodDurability(msg.sender);

        // Cập nhật thời gian câu cá gần nhất
        lastFishingTime[msg.sender] = block.timestamp;
    }

    /**
     * @dev Mở rương câu cá
     * @param _chestId ID của rương cần mở
     */
    function openChest(uint256 _chestId) external {
        // Kiểm tra rương có tồn tại trong inventory không
        InventoryItem memory chest = inventoryComponent.getItem(
            msg.sender,
            _chestId
        );
        require(chest.quantity > 0, "Chest not found");

        // Lấy danh sách vật phẩm có thể rơi từ rương
        ItemStructs.ItemDrop[] memory drops = itemComponent.getItemDrops(
            _chestId
        );
        require(drops.length > 0, "No item drops configured");
        require(drops.length <= 20, "Too many item drops"); // Giới hạn gas

        // Kiểm tra và tính tổng xác suất
        uint256 totalProbability = 0;
        for (uint256 i = 0; i < drops.length; i++) {
            require(drops[i].probability > 0, "Invalid probability");
            require(drops[i].yield > 0, "Invalid yield");
            totalProbability += drops[i].probability;
        }

        // Chọn tối đa 3 vật phẩm
        Reward[] memory rewards = new Reward[](3);
        uint256 rewardCount = 0;

        // Tạo số ngẫu nhiên cho mỗi lần chọn
        for (uint256 i = 0; i < 3 && rewardCount < drops.length; i++) {
            uint256 random = _generateRandomNumber(totalProbability);
            uint256 roll = random + 1;

            // Chọn vật phẩm dựa trên xác suất tích lũy
            uint256 cumulativeProbability = 0;
            bool selected = false;

            for (uint256 j = 0; j < drops.length; j++) {
                cumulativeProbability += drops[j].probability;
                if (roll <= cumulativeProbability) {
                    // Kiểm tra xem vật phẩm đã được chọn chưa
                    bool alreadySelected = false;
                    for (uint256 k = 0; k < rewardCount; k++) {
                        if (rewards[k].itemId == drops[j].itemId) {
                            alreadySelected = true;
                            break;
                        }
                    }

                    if (!alreadySelected) {
                        uint256 itemAmount = drops[j].yield;
                        if (itemAmount > 3) {
                            itemAmount = 3; // Giới hạn số lượng mỗi vật phẩm
                        }
                        if (itemAmount == 0) {
                            itemAmount = 1;
                        }

                        rewards[rewardCount] = Reward(
                            drops[j].itemId,
                            itemAmount
                        );
                        rewardCount++;
                        selected = true;
                        break;
                    }
                }
            }

            if (!selected) {
                break; // Không còn vật phẩm nào để chọn
            }
        }

        // Đảm bảo ít nhất 1 vật phẩm nếu không chọn được
        if (rewardCount == 0) {
            rewards[0] = Reward(drops[0].itemId, 1);
            rewardCount = 1;
        }

        // Xóa rương khỏi túi đồ
        inventoryComponent.setItem(
            msg.sender,
            _chestId,
            chest.quantity - 1,
            chest.durability,
            chest.expiration
        );

        // Thêm vật phẩm vào inventory
        uint256[] memory itemIds = new uint256[](rewardCount);
        uint256[] memory amounts = new uint256[](rewardCount);

        for (uint256 i = 0; i < rewardCount; i++) {
            // Kiểm tra xem item đã tồn tại trong inventory chưa
            InventoryItem memory existingItem = inventoryComponent.getItem(
                msg.sender,
                rewards[i].itemId
            );

            uint256 newQuantity;
            uint256 durability;
            uint256 expiration;

            if (existingItem.quantity > 0) {
                // Item đã tồn tại, cộng dồn quantity với kiểm tra overflow
                newQuantity = existingItem.quantity + rewards[i].amount;
                require(
                    newQuantity >= existingItem.quantity,
                    "Quantity overflow"
                );
                durability = existingItem.durability;
                expiration = existingItem.expiration;
            } else {
                // Item chưa tồn tại, tạo mới
                newQuantity = rewards[i].amount;
                durability = 100;
                expiration = 0;
            }

            inventoryComponent.setItem(
                msg.sender,
                rewards[i].itemId,
                newQuantity,
                durability,
                expiration
            );
            itemIds[i] = rewards[i].itemId;
            amounts[i] = rewards[i].amount;
        }

        // Phát sự kiện
        emit ChestOpened(msg.sender, _chestId, itemIds, amounts);
    }

    /**
     * @dev Lấy thời gian cooldown còn lại
     * @param _player Địa chỉ người chơi
     * @return Thời gian cooldown còn lại (timestamp)
     */
    function getFishingCooldown(
        address _player
    ) external view returns (uint256) {
        uint256 nextFishingTime = lastFishingTime[_player] + fishingCooldown;
        if (block.timestamp >= nextFishingTime) {
            return 0;
        }
        return nextFishingTime;
    }

    /**
     * @dev Thiết lập thời gian cooldown câu cá (chỉ admin)
     * @param _fishingCooldown Thời gian cooldown mới (giây)
     */
    function setFishingCooldown(uint256 _fishingCooldown) external onlyAdmin {
        fishingCooldown = _fishingCooldown;
    }

    /**
     * @dev Lấy tỉ lệ nhận rương dựa trên thời tiết
     * @param weatherState Trạng thái thời tiết
     * @return Tỉ lệ phần trăm (0-100)
     */
    function _getChestProbabilityByWeather(
        WeatherStructs.WeatherState weatherState
    ) internal pure returns (uint256) {
        if (weatherState == WeatherStructs.WeatherState.Sunny) {
            return 70; // 70% cơ hội
        } else if (weatherState == WeatherStructs.WeatherState.Rainy) {
            return 80; // 80% cơ hội
        } else if (weatherState == WeatherStructs.WeatherState.Stormy) {
            return 90; // 90% cơ hội
        } else {
            return 50; // 50% cơ hội (Cloudy hoặc khác)
        }
    }

    /**
     * @dev Tạo số ngẫu nhiên
     * @param max Giá trị tối đa (exclusive)
     * @return Số ngẫu nhiên từ 0 đến max-1
     */
    function _generateRandomNumber(uint256 max) internal returns (uint256) {
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    nonce
                )
            )
        );
        nonce++;
        return random % max;
    }

    /**
     * @dev Trừ 1 cần câu khi câu cá
     * @param player Địa chỉ người chơi
     */
    function _reduceFishingRodDurability(address player) internal {
        InventoryItem memory fishingRod = inventoryComponent.getItem(
            player,
            FISHING_ROD_ID
        );

        // Luôn trừ 1 cần câu khi câu cá
        inventoryComponent.setItem(
            player,
            FISHING_ROD_ID,
            fishingRod.quantity - 1,
            fishingRod.durability,
            fishingRod.expiration
        );
    }
}
