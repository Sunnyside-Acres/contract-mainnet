// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IRaising.sol";
import "../../interfaces/IWeather.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../struct/Raising.sol";
import "../../struct/Weather.sol";
import "../../struct/Item.sol";
import "../../struct/Inventory.sol";

contract RaisingLogic {
    IWorld public world;
    IRaisingComponent public raisingProxy;
    IInventoryComponent public inventoryProxy;
    IWeatherComponent public weatherProxy;
    IItemComponent public itemProxy;

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

    event RaisingStarted(
        uint256 indexed raisingId,
        address indexed player,
        uint256 itemId
    );

    event RaisingHarvestedWithCooldown(
        address indexed player,
        uint256 indexed raisingId,
        uint256[] itemIds,
        uint256[] itemAmounts,
        uint256 harvestCount
    );

    event RaisingSlaughtered(
        address indexed player,
        uint256 indexed raisingId,
        uint256[] itemIds,
        uint256[] itemAmounts
    );

    event RaisingFed(
        uint256 indexed raisingId,
        WeatherStructs.WeatherState weatherState
    );

    event TotalHarvestedItemsUpdated(
        uint256 indexed raisingId,
        uint256 totalHarvestedItems
    );

    event FeedingReset(uint256 indexed raisingId, uint256 harvestCount);

    constructor(
        address _world,
        address _raisingProxy,
        address _inventoryProxy,
        address _weatherProxy,
        address _itemProxy
    ) {
        world = IWorld(_world);
        raisingProxy = IRaisingComponent(_raisingProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        weatherProxy = IWeatherComponent(_weatherProxy);
        itemProxy = IItemComponent(_itemProxy);
    }

    function random(uint256 max) private view returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(block.number, msg.sender))) %
            max;
    }

    function startRaising(uint256 _itemId) external {
        // Kiểm tra điều kiện trước khi bắt đầu nuôi
        require(_itemId > 0, "Invalid item ID");

        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(
            item.itemType == ItemStructs.ItemType.Livestock,
            "Item is not a livestock"
        );

        uint256 growthTime = itemProxy.getItemAttribute(
            _itemId,
            ItemStructs.Attribute.GrowthRate
        );

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        // Kiểm tra xem item có tồn tại không
        require(
            item.itemType == ItemStructs.ItemType.Livestock,
            "Item is not a livestock"
        );

        InventoryItem memory inventoryItem = inventoryProxy.getItem(
            msg.sender,
            _itemId
        );
        require(inventoryItem.quantity > 0, "Not enough item");

        inventoryProxy.setItem(
            msg.sender,
            _itemId,
            inventoryItem.quantity - 1,
            inventoryItem.durability,
            inventoryItem.expiration
        );

        return
            raisingProxy.startRaising(
                _itemId,
                msg.sender,
                growthTime,
                weatherState
            );
    }

    function harvestRaising(uint256 raisingId) external {
        require(raisingId > 0, "Invalid raising ID");
        require(
            raisingProxy.getRaisingOwner(raisingId) == msg.sender,
            "Not raising owner"
        );

        Raising memory raising = raisingProxy.getRaising(raisingId);
        require(!raising.isHarvested, "Raising already harvested");
        require(!raising.isSlaughtered, "Raising already slaughtered");

        // Kiểm tra xem raising có được feed hay chưa
        require(raising.feedCount > 0, "Raising must be fed before harvest");

        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            raising.itemId
        );

        // Lấy cooldown từ item attribute
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        uint256 qualityModifier = raisingProxy.harvestRaisingWithCooldown(
            raisingId,
            harvestCooldown
        );

        require(drops.length > 1, "No harvest drops configured"); // Cần ít nhất 2 drops (drop[0] là thịt, drop[1+] là harvest)

        uint256 qualityMultiplier = qualityModifier;
        // Loại bỏ check qualityModifier == 0 vì đã check feedCount > 0 ở trên

        uint256 qualityBonus = (qualityMultiplier - 100) * 100;

        // Tính tổng tỉ lệ của các drops harvest (từ index 1 trở đi)
        uint256 totalHarvestProbability = 0;
        for (uint256 i = 1; i < drops.length; i++) {
            totalHarvestProbability += drops[i].probability;
        }

        uint256 totalItemAmount = 0;
        uint256[] memory harvestedItemIds = new uint256[](drops.length - 1); // Trừ drop[0] (thịt)
        uint256[] memory harvestedItemAmounts = new uint256[](drops.length - 1);
        uint256 harvestedItemCount = 0;

        // Chỉ xử lý từ drop[1] trở đi (không phải thịt)
        for (uint256 i = 1; i < drops.length; i++) {
            // Tính lại tỉ lệ dựa trên tổng 100% trừ đi phần thịt
            uint256 adjustedProbability = (drops[i].probability * 10000) /
                totalHarvestProbability;

            uint256 baseRoll = random(10000);
            uint256 adjustedRoll = baseRoll;
            if (baseRoll > qualityBonus) {
                adjustedRoll = baseRoll - qualityBonus;
            } else {
                adjustedRoll = 0;
            }

            if (adjustedRoll < adjustedProbability) {
                uint256 itemAmount;
                if (drops[i].yield == 0) {
                    itemAmount = 1;
                } else {
                    itemAmount = (drops[i].yield * qualityMultiplier) / 100;
                    if (itemAmount == 0) {
                        itemAmount = 1;
                    }
                }

                totalItemAmount += itemAmount;

                harvestedItemIds[harvestedItemCount] = drops[i].itemId;
                harvestedItemAmounts[harvestedItemCount] = itemAmount;
                harvestedItemCount++;

                // Lấy số lượng hiện tại của item
                InventoryItem memory currentItem = inventoryProxy.getItem(
                    msg.sender,
                    drops[i].itemId
                );

                // Cộng thêm số lượng mới (nếu item chưa tồn tại thì quantity = 0)
                uint256 newQuantity = currentItem.quantity + itemAmount;

                inventoryProxy.setItem(
                    msg.sender,
                    drops[i].itemId,
                    newQuantity,
                    100,
                    0
                );
            }
        }

        // Đảm bảo ít nhất một vật phẩm nếu có chăm sóc
        if (totalItemAmount == 0 && qualityModifier > 0 && drops.length > 1) {
            harvestedItemIds[0] = drops[1].itemId;
            harvestedItemAmounts[0] = 1;
            harvestedItemCount = 1;

            // Lấy số lượng hiện tại của item
            InventoryItem memory currentItem = inventoryProxy.getItem(
                msg.sender,
                drops[1].itemId
            );

            // Cộng thêm số lượng mới (nếu item chưa tồn tại thì quantity = 0)
            uint256 newQuantity = currentItem.quantity + 1;

            inventoryProxy.setItem(
                msg.sender,
                drops[1].itemId,
                newQuantity,
                100,
                0
            );
        }

        uint256[] memory finalItemIds = new uint256[](harvestedItemCount);
        uint256[] memory finalItemAmounts = new uint256[](harvestedItemCount);

        for (uint256 i = 0; i < harvestedItemCount; i++) {
            finalItemIds[i] = harvestedItemIds[i];
            finalItemAmounts[i] = harvestedItemAmounts[i];
        }

        emit RaisingHarvestedWithCooldown(
            msg.sender,
            raisingId,
            finalItemIds,
            finalItemAmounts,
            raising.harvestCount + 1
        );

        // Cập nhật tổng số sản phẩm đã thu hoạch được
        raisingProxy.updateTotalHarvestedItems(raisingId, totalItemAmount);

        // Emit event để theo dõi (lấy giá trị mới từ component)
        Raising memory updatedRaising = raisingProxy.getRaising(raisingId);
        emit TotalHarvestedItemsUpdated(
            raisingId,
            updatedRaising.totalHarvestedItems
        );
    }

    function slaughterRaising(uint256 raisingId) external {
        require(raisingId > 0, "Invalid raising ID");
        require(
            raisingProxy.getRaisingOwner(raisingId) == msg.sender,
            "Not raising owner"
        );

        Raising memory raising = raisingProxy.getRaising(raisingId);
        require(!raising.isHarvested, "Raising already harvested");
        require(!raising.isSlaughtered, "Raising already slaughtered");

        // Cho phép giết ngay cả khi chưa chăm sóc, nhưng sẽ không có vật phẩm

        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            raising.itemId
        );

        // Lấy thông tin trước khi xóa con vật
        uint256 currentTotalHarvested = raising.totalHarvestedItems;
        uint256 feedCount = raising.feedCount;

        // Xóa con vật và lấy qualityModifier
        uint256 qualityModifier = raisingProxy.slaughterRaising(raisingId);

        require(drops.length > 0, "No item drops configured");

        uint256 qualityMultiplier = qualityModifier;

        // Nếu chưa chăm sóc (feedCount = 0), không có vật phẩm
        if (feedCount == 0) {
            qualityMultiplier = 0;
        }

        uint256 qualityBonus = (qualityMultiplier - 100) * 100;

        uint256 totalItemAmount = 0;
        uint256[] memory harvestedItemIds = new uint256[](1); // Chỉ lấy drop[0] (thịt)
        uint256[] memory harvestedItemAmounts = new uint256[](1);
        uint256 harvestedItemCount = 0;

        // Chỉ xử lý drop[0] (thịt) với tỉ lệ 100%
        if (drops.length > 0) {
            uint256 baseRoll = random(10000);
            uint256 adjustedRoll = baseRoll;
            if (baseRoll > qualityBonus) {
                adjustedRoll = baseRoll - qualityBonus;
            } else {
                adjustedRoll = 0;
            }

            // Tỉ lệ thịt luôn là 100% (10000)
            if (adjustedRoll < 10000) {
                uint256 itemAmount;
                if (drops[0].yield == 0) {
                    itemAmount = 1;
                } else {
                    itemAmount = (drops[0].yield * qualityMultiplier) / 100;
                    if (itemAmount == 0) {
                        itemAmount = 1;
                    }
                }

                totalItemAmount += itemAmount;

                harvestedItemIds[0] = drops[0].itemId;
                harvestedItemAmounts[0] = itemAmount;
                harvestedItemCount = 1;

                // Lấy số lượng hiện tại của item
                InventoryItem memory currentItem = inventoryProxy.getItem(
                    msg.sender,
                    drops[0].itemId
                );

                // Cộng thêm số lượng mới (nếu item chưa tồn tại thì quantity = 0)
                uint256 newQuantity = currentItem.quantity + itemAmount;

                inventoryProxy.setItem(
                    msg.sender,
                    drops[0].itemId,
                    newQuantity,
                    100,
                    0
                );
            }
        }

        // Đảm bảo ít nhất một vật phẩm thịt nếu có chăm sóc
        if (totalItemAmount == 0 && qualityModifier > 0 && drops.length > 0) {
            harvestedItemIds[0] = drops[0].itemId;
            harvestedItemAmounts[0] = 1;
            harvestedItemCount = 1;

            // Lấy số lượng hiện tại của item
            InventoryItem memory currentItem = inventoryProxy.getItem(
                msg.sender,
                drops[0].itemId
            );

            // Cộng thêm số lượng mới (nếu item chưa tồn tại thì quantity = 0)
            uint256 newQuantity = currentItem.quantity + 1;

            inventoryProxy.setItem(
                msg.sender,
                drops[0].itemId,
                newQuantity,
                100,
                0
            );
        }

        uint256[] memory finalItemIds = new uint256[](harvestedItemCount);
        uint256[] memory finalItemAmounts = new uint256[](harvestedItemCount);

        for (uint256 i = 0; i < harvestedItemCount; i++) {
            finalItemIds[i] = harvestedItemIds[i];
            finalItemAmounts[i] = harvestedItemAmounts[i];
        }

        emit RaisingSlaughtered(
            msg.sender,
            raisingId,
            finalItemIds,
            finalItemAmounts
        );

        // Lưu ý: totalHarvestedItems không được cập nhật cho slaughter
        // vì con vật đã bị xóa. Nếu cần đếm thịt, có thể thêm logic riêng
    }

    function feedRaising(uint256 raisingId) external {
        require(raisingId > 0, "Invalid raising ID");
        require(
            raisingProxy.getRaisingOwner(raisingId) == msg.sender,
            "Not raising owner"
        );

        Raising memory raising = raisingProxy.getRaising(raisingId);
        require(!raising.isHarvested, "Raising already harvested");
        require(!raising.isSlaughtered, "Raising already slaughtered");

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        // Lấy harvestCooldown từ item attribute
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        raisingProxy.feedRaising(raisingId, weatherState, harvestCooldown);

        emit RaisingFed(raisingId, weatherState);
    }

    // View functions
    function getRaising(
        uint256 raisingId
    ) external view returns (Raising memory) {
        return raisingProxy.getRaising(raisingId);
    }

    function getOwnerRaisings(
        address _playerAddress
    ) external view returns (uint256[] memory) {
        return raisingProxy.getOwnerRaisings(_playerAddress);
    }

    function getOwnerRaisingsWithDetails(
        address _playerAddress
    ) external view returns (Raising[] memory) {
        return raisingProxy.getOwnerRaisingsWithDetails(_playerAddress);
    }

    function getRaisingOwner(
        uint256 raisingId
    ) external view returns (address) {
        return raisingProxy.getRaisingOwner(raisingId);
    }

    // UI helper functions
    function getNextFeedingTime(
        uint256 raisingId
    ) external view returns (uint256) {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );
        return raisingProxy.getNextFeedingTime(raisingId, harvestCooldown);
    }

    function canFeed(uint256 raisingId) external view returns (bool) {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );
        return raisingProxy.canFeed(raisingId, harvestCooldown);
    }

    function getFeedingInfo(
        uint256 raisingId
    )
        external
        view
        returns (
            uint256 nextFeedingTime,
            bool canFeedNow,
            uint256 feedCount,
            uint256 maxFeeds,
            uint256 timeUntilNextFeed
        )
    {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        nextFeedingTime = raisingProxy.getNextFeedingTime(
            raisingId,
            harvestCooldown
        );
        canFeedNow = raisingProxy.canFeed(raisingId, harvestCooldown);

        feedCount = raising.feedCount;
        maxFeeds = 3; // Giới hạn 3 lần feed

        // Tính thời gian còn lại cho đến lần feed tiếp theo
        if (canFeedNow) {
            timeUntilNextFeed = 0;
        } else {
            timeUntilNextFeed = nextFeedingTime - block.timestamp;
        }
    }

    function getFeedingCooldownInfo(
        uint256 raisingId
    )
        external
        view
        returns (
            uint256 currentTime,
            uint256 lastFeedTime,
            uint256 cooldownDuration,
            uint256 timeRemaining,
            bool isReadyToFeed
        )
    {
        Raising memory raising = raisingProxy.getRaising(raisingId);
        uint256 harvestCooldown = itemProxy.getItemAttribute(
            raising.itemId,
            ItemStructs.Attribute.HarvestCooldown
        );

        currentTime = block.timestamp;
        lastFeedTime = raising.lastFeedTime;

        // Logic thời gian chăm sóc:
        // - Lần đầu tiên (chưa thu hoạch): sử dụng growthTime/3
        // - Sau khi thu hoạch lần đầu: sử dụng harvestCooldown/3
        if (raising.harvestCount == 0) {
            cooldownDuration = raising.growthTime / 3; // Cooldown = growthTime / 3
        } else {
            cooldownDuration = harvestCooldown / 3; // Cooldown = harvestCooldown / 3
        }

        if (raising.feedCount == 0) {
            // Chưa feed lần nào, có thể feed ngay
            timeRemaining = 0;
            isReadyToFeed = true;
        } else {
            uint256 nextFeedTime = lastFeedTime + cooldownDuration;
            if (currentTime >= nextFeedTime) {
                timeRemaining = 0;
                isReadyToFeed = true;
            } else {
                timeRemaining = nextFeedTime - currentTime;
                isReadyToFeed = false;
            }
        }
    }

    function getFullRaisingInfo(
        uint256 raisingId
    )
        external
        view
        returns (
            // Thông tin cơ bản của raising
            uint256 id,
            uint256 itemId,
            uint256 raisingTime,
            uint256 qualityModifier,
            uint256 growthTime,
            uint256 lastFeedTime,
            uint256 feedCount,
            bool isHarvested,
            uint256 lastHarvestTime,
            uint256 harvestCount,
            bool isSlaughtered,
            uint256 totalHarvestedItems,
            // Thông tin item
            string memory itemName,
            ItemStructs.ItemType itemType,
            ItemStructs.Rarity itemRarity,
            // Thông tin thời gian
            uint256 currentTime,
            uint256 timeUntilFullyGrown,
            bool isFullyGrown,
            // Thông tin feeding
            uint256 nextFeedingTime,
            bool canFeedNow,
            uint256 timeUntilNextFeed,
            uint256 maxFeeds,
            // Thông tin harvest
            bool canHarvest,
            uint256 harvestCooldown,
            uint256 timeUntilNextHarvest,
            uint256 maxHarvests,
            // Thông tin drops
            ItemStructs.ItemDrop[] memory itemDrops,
            // Thông tin owner
            address owner
        )
    {
        // Lấy thông tin raising cơ bản
        Raising memory raising = raisingProxy.getRaising(raisingId);

        // Gán các giá trị cơ bản
        id = raising.id;
        itemId = raising.itemId;
        raisingTime = raising.raisingTime;
        qualityModifier = raising.qualityModifier;
        growthTime = raising.growthTime;
        lastFeedTime = raising.lastFeedTime;
        feedCount = raising.feedCount;
        isHarvested = raising.isHarvested;
        lastHarvestTime = raising.lastHarvestTime;
        harvestCount = raising.harvestCount;
        isSlaughtered = raising.isSlaughtered;
        totalHarvestedItems = raising.totalHarvestedItems;

        // Lấy thông tin item
        ItemStructs.Item memory item = itemProxy.getItem(itemId);
        itemName = item.name;
        itemType = item.itemType;
        itemRarity = item.rarity;

        // Thông tin thời gian
        currentTime = block.timestamp;
        timeUntilFullyGrown = 0;
        isFullyGrown = false;

        if (raisingTime + growthTime > currentTime) {
            timeUntilFullyGrown = (raisingTime + growthTime) - currentTime;
        } else {
            isFullyGrown = true;
        }

        // Thông tin feeding
        uint256 feedingHarvestCooldown = itemProxy.getItemAttribute(
            itemId,
            ItemStructs.Attribute.HarvestCooldown
        );
        nextFeedingTime = raisingProxy.getNextFeedingTime(
            raisingId,
            feedingHarvestCooldown
        );
        canFeedNow = raisingProxy.canFeed(raisingId, feedingHarvestCooldown);
        maxFeeds = 3;

        if (canFeedNow) {
            timeUntilNextFeed = 0;
        } else {
            timeUntilNextFeed = nextFeedingTime - currentTime;
        }

        // Thông tin harvest
        canHarvest = false;
        harvestCooldown = 0;
        timeUntilNextHarvest = 0;
        maxHarvests = 3;

        if (isFullyGrown && !isHarvested && !isSlaughtered && feedCount > 0) {
            harvestCooldown = itemProxy.getItemAttribute(
                itemId,
                ItemStructs.Attribute.HarvestCooldown
            );

            if (harvestCount == 0) {
                canHarvest = true;
            } else if (harvestCount < maxHarvests) {
                uint256 nextHarvestTime = lastHarvestTime + harvestCooldown;
                if (currentTime >= nextHarvestTime) {
                    canHarvest = true;
                } else {
                    timeUntilNextHarvest = nextHarvestTime - currentTime;
                }
            }
        }

        // Lấy thông tin drops
        itemDrops = itemProxy.getItemDrops(itemId);

        // Lấy thông tin owner
        owner = raisingProxy.getRaisingOwner(raisingId);
    }

    // Struct để trả về thông tin đầy đủ
    struct FullRaisingInfo {
        // Thông tin cơ bản
        uint256 id;
        uint256 itemId;
        string itemName;
        ItemStructs.ItemType itemType;
        ItemStructs.Rarity itemRarity;
        address owner;
        // Thông tin thời gian
        uint256 raisingTime;
        uint256 growthTime;
        uint256 currentTime;
        uint256 timeUntilFullyGrown;
        bool isFullyGrown;
        // Thông tin feeding
        uint256 lastFeedTime;
        uint256 feedCount;
        uint256 maxFeeds;
        uint256 nextFeedingTime;
        bool canFeedNow;
        uint256 timeUntilNextFeed;
        // Thông tin harvest
        uint256 lastHarvestTime;
        uint256 harvestCount;
        uint256 maxHarvests;
        bool canHarvest;
        uint256 harvestCooldown;
        uint256 timeUntilNextHarvest;
        uint256 totalHarvestedItems;
        // Thông tin trạng thái
        bool isHarvested;
        bool isSlaughtered;
        uint256 qualityModifier;
        // Thông tin drops
        ItemStructs.ItemDrop[] itemDrops;
    }

    function getFullRaisingInfoStruct(
        uint256 raisingId
    ) external view returns (FullRaisingInfo memory) {
        (
            uint256 id,
            uint256 itemId,
            uint256 raisingTime,
            uint256 qualityModifier,
            uint256 growthTime,
            uint256 lastFeedTime,
            uint256 feedCount,
            bool isHarvested,
            uint256 lastHarvestTime,
            uint256 harvestCount,
            bool isSlaughtered,
            uint256 totalHarvestedItems,
            string memory itemName,
            ItemStructs.ItemType itemType,
            ItemStructs.Rarity itemRarity,
            uint256 currentTime,
            uint256 timeUntilFullyGrown,
            bool isFullyGrown,
            uint256 nextFeedingTime,
            bool canFeedNow,
            uint256 timeUntilNextFeed,
            uint256 maxFeeds,
            bool canHarvest,
            uint256 harvestCooldown,
            uint256 timeUntilNextHarvest,
            uint256 maxHarvests,
            ItemStructs.ItemDrop[] memory itemDrops,
            address owner
        ) = this.getFullRaisingInfo(raisingId);

        return
            FullRaisingInfo({
                id: id,
                itemId: itemId,
                itemName: itemName,
                itemType: itemType,
                itemRarity: itemRarity,
                owner: owner,
                raisingTime: raisingTime,
                growthTime: growthTime,
                currentTime: currentTime,
                timeUntilFullyGrown: timeUntilFullyGrown,
                isFullyGrown: isFullyGrown,
                lastFeedTime: lastFeedTime,
                feedCount: feedCount,
                maxFeeds: maxFeeds,
                nextFeedingTime: nextFeedingTime,
                canFeedNow: canFeedNow,
                timeUntilNextFeed: timeUntilNextFeed,
                lastHarvestTime: lastHarvestTime,
                harvestCount: harvestCount,
                maxHarvests: maxHarvests,
                canHarvest: canHarvest,
                harvestCooldown: harvestCooldown,
                timeUntilNextHarvest: timeUntilNextHarvest,
                totalHarvestedItems: totalHarvestedItems,
                isHarvested: isHarvested,
                isSlaughtered: isSlaughtered,
                qualityModifier: qualityModifier,
                itemDrops: itemDrops
            });
    }
}
