// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IRaising.sol";
import "../../interfaces/IWeather.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../struct/Raising.sol";
import "../../struct/Weather.sol";

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

    event RaisingHarvested(
        address indexed player,
        uint256 indexed raisingId,
        uint256[] itemIds,
        uint256[] itemAmounts
    );

    event RaisingFed(
        uint256 indexed raisingId,
        WeatherStructs.WeatherState weatherState
    );

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
            uint256(
                keccak256(abi.encodePacked(block.timestamp, block.number))
            ) % max;
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

        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            raising.itemId
        );

        uint256 qualityModifier = raisingProxy.harvestRaising(raisingId);

        require(drops.length > 0, "No item drops configured");

        uint256 qualityMultiplier = qualityModifier;
        if (qualityModifier == 0) {
            return;
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
                inventoryProxy.setItem(
                    msg.sender,
                    drops[i].itemId,
                    itemAmount,
                    100,
                    0
                );
            }
        }

        // Đảm bảo ít nhất một vật phẩm nếu có chăm sóc
        if (totalItemAmount == 0 && qualityModifier > 0) {
            harvestedItemIds[0] = drops[0].itemId;
            harvestedItemAmounts[0] = 1;
            harvestedItemCount = 1;

            inventoryProxy.setItem(msg.sender, drops[0].itemId, 1, 100, 0);
        }

        uint256[] memory finalItemIds = new uint256[](harvestedItemCount);
        uint256[] memory finalItemAmounts = new uint256[](harvestedItemCount);

        for (uint256 i = 0; i < harvestedItemCount; i++) {
            finalItemIds[i] = harvestedItemIds[i];
            finalItemAmounts[i] = harvestedItemAmounts[i];
        }

        emit RaisingHarvested(
            msg.sender,
            raisingId,
            harvestedItemIds,
            harvestedItemAmounts
        );
    }

    function feedRaising(uint256 raisingId) external {
        require(raisingId > 0, "Invalid raising ID");
        require(
            raisingProxy.getRaisingOwner(raisingId) == msg.sender,
            "Not raising owner"
        );

        Raising memory raising = raisingProxy.getRaising(raisingId);
        require(!raising.isHarvested, "Raising already harvested");

        WeatherStructs.WeatherState weatherState = weatherProxy
            .getCurrentWeatherState();

        raisingProxy.feedRaising(raisingId, weatherState);

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
}
