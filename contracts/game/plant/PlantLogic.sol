// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlant.sol";
import "../../interfaces/IWeather.sol";
import "../../interfaces/IPlot.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";

contract PlantLogic {
    IWorld public world;
    IPlantComponent public plantProxy;
    IPlotComponent public plotProxy;
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

    event PlantCreated(
        uint256 indexed plantId,
        address indexed player,
        uint256 plotId,
        uint256 itemId,
        uint256 plantedTime,
        uint256 lastTendedTime,
        uint256 qualityModifier,
        uint256 growthTime,
        uint256 tendCount,
        bool isHarvested
    );

    event PlantHarvested(
        address indexed player,
        uint256 indexed plantId,
        uint256 plotId,
        uint256[] itemIds,
        uint256[] itemAmounts
    );
    event PlantTended(
        uint256 indexed plantId,
        WeatherStructs.WeatherState weatherState
    );

    constructor(
        address _world,
        address _plantProxy,
        address _plotProxy,
        address _inventoryProxy,
        address _weatherProxy,
        address _itemProxy
    ) {
        world = IWorld(_world);
        plantProxy = IPlantComponent(_plantProxy);
        plotProxy = IPlotComponent(_plotProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        weatherProxy = IWeatherComponent(_weatherProxy);
        itemProxy = IItemComponent(_itemProxy);
    }

    function random(uint256 max) private view returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(msg.sender, block.number))) %
            max;
    }

    function plantCrop(uint256 _plotId, uint256 _itemId) external {
        // Kiểm tra điều kiện trước khi trồng
        require(_plotId > 0, "Invalid plot ID");
        require(_itemId > 0, "Invalid item ID");

        // Kiểm tra xem plot có tồn tại không
        require(
            plotProxy.getPlotOwner(_plotId) == msg.sender,
            "Plot not owned"
        );

        require(plotProxy.getPlot(_plotId).isActive, "Plot is not active");

        // Kiểm tra xem plot đã có cây hay chưa
        require(
            plantProxy.getPlotPlants(_plotId) == 0,
            "Plot already has a plant"
        );

        ItemStructs.Item memory item = itemProxy.getItem(_itemId);
        require(
            item.itemType == ItemStructs.ItemType.Seed,
            "Item is not a seed"
        );

        uint256 growthTime = itemProxy.getItemAttribute(
            _itemId,
            ItemStructs.Attribute.GrowthRate
        );

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        Plot memory plot = plotProxy.getPlot(_plotId);
        // Kiểm tra xem item có tồn tại không
        require(
            item.itemType == ItemStructs.ItemType.Seed,
            "Item is not a seed"
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

        plantProxy.plantCrop(
            _plotId,
            _itemId,
            msg.sender,
            plot.plotType,
            growthTime,
            weatherState
        );

        // Lấy thông tin plant vừa tạo để emit event
        uint256 plantId = uint256(
            keccak256(
                abi.encodePacked(msg.sender, _plotId, _itemId, block.timestamp)
            )
        );

        Plant memory plant = plantProxy.getPlantedCrop(plantId);

        emit PlantCreated(
            plant.id,
            msg.sender,
            plant.plotId,
            plant.itemId,
            plant.plantedTime,
            plant.lastTendedTime,
            plant.qualityModifier,
            plant.growthTime,
            plant.tendCount,
            plant.isHarvested
        );
    }

    function plantHarvest(uint256 plantId) external {
        require(plantId > 0, "Invalid plant ID");
        require(
            plantProxy.getPlantOwner(plantId) == msg.sender,
            "Not plant owner"
        );

        Plant memory plant = plantProxy.getPlantedCrop(plantId);
        require(!plant.isHarvested, "Plant already harvested");

        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            plant.itemId
        );

        require(drops.length > 0, "No item drops configured");

        uint256 qualityMultiplier = plant.qualityModifier;
        if (qualityMultiplier < 100) {
            qualityMultiplier = 100;
        }

        uint256 qualityBonus = (qualityMultiplier - 100) * 100;

        uint256 totalItemAmount = 0;
        uint256[] memory harvestedItemIds = new uint256[](drops.length);
        uint256[] memory harvestedItemAmounts = new uint256[](drops.length);
        uint256 harvestedItemCount = 0;

        for (uint256 i = 0; i < drops.length; i++) {
            uint256 baseRoll = random(10000);
            uint256 adjustedRoll = baseRoll;
            if (baseRoll > qualityBonus) {
                adjustedRoll = baseRoll - qualityBonus;
            } else {
                adjustedRoll = 0;
            }

            if (adjustedRoll < drops[i].probability) {
                uint256 itemAmount;
                if (drops[i].yield == 0) {
                    itemAmount = 1;
                } else {
                    // Sử dụng yield làm số lượng cơ bản, qualityModifier làm hệ số nhân
                    itemAmount = (drops[i].yield * qualityMultiplier) / 100;
                    if (itemAmount == 0) {
                        itemAmount = 1;
                    }
                }

                totalItemAmount += itemAmount;

                // Lưu thông tin item được thu hoạch
                harvestedItemIds[harvestedItemCount] = drops[i].itemId;
                harvestedItemAmounts[harvestedItemCount] = itemAmount;
                harvestedItemCount++;

                // Thêm item vào inventory
                InventoryItem memory currentItem = inventoryProxy.getItem(
                    msg.sender,
                    drops[i].itemId
                );
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

        // Đảm bảo ít nhất một vật phẩm
        if (totalItemAmount == 0) {
            harvestedItemIds[0] = drops[0].itemId;
            harvestedItemAmounts[0] = 1;
            harvestedItemCount = 1;

            InventoryItem memory currentItem = inventoryProxy.getItem(
                msg.sender,
                drops[0].itemId
            );
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

        // Gọi plantHarvest để xóa plant sau khi đã xử lý xong logic
        plantProxy.plantHarvest(plantId);

        plotProxy.deletePlot(plant.plotId, msg.sender);

        emit PlantHarvested(
            msg.sender,
            plantId,
            plant.plotId,
            harvestedItemIds,
            harvestedItemAmounts
        );
    }

    function plantTended(uint256 plantId) external {
        require(plantId > 0, "Invalid plant ID");
        require(
            plantProxy.getPlantOwner(plantId) == msg.sender,
            "Not plant owner"
        );

        Plant memory plant = plantProxy.getPlantedCrop(plantId);
        require(!plant.isHarvested, "Plant already harvested");

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        plantProxy.plantTended(plantId, weatherState);

        emit PlantTended(plantId, weatherState);
    }

    // View functions
    function getPlantedCrop(
        uint256 plantId
    ) external view returns (Plant memory) {
        return plantProxy.getPlantedCrop(plantId);
    }

    function getPlotPlants(uint256 plotId) external view returns (uint256) {
        return plantProxy.getPlotPlants(plotId);
    }

    function getOwnerPlants(
        address _playerAddress
    ) external view returns (uint256[] memory) {
        return plantProxy.getOwnerPlants(_playerAddress);
    }

    function getOwnerPlantsWithDetails(
        address _playerAddress
    ) external view returns (Plant[] memory) {
        return plantProxy.getOwnerPlantsWithDetails(_playerAddress);
    }

    function getPlantOwner(uint256 plantId) external view returns (address) {
        return plantProxy.getPlantOwner(plantId);
    }
}
