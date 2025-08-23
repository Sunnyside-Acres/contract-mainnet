// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Plant.sol";
import "../../struct/Weather.sol";

contract PlantComponent {
    address public world;
    address public admin;
    address public implementation;

    // Mapping lưu trữ thông tin plant
    mapping(uint256 => Plant) public plants;

    // Mapping từ plotId đến danh sách plantId
    mapping(uint256 => uint256) public plotPlants;

    // Mapping từ owner đến danh sách plantId
    mapping(address => uint256[]) public ownerPlants;

    // Mapping từ plantId đến owner
    mapping(uint256 => address) public plantOwners;

    event PlantPlanted(
        uint256 indexed plantId,
        address indexed plantOwner,
        uint256 indexed plotId,
        uint256 itemId
    );
    event PlantTended(uint256 indexed plantId, uint256 qualityModifier);
    event PlantHarvested(uint256 indexed plantId);

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    function plantCrop(
        uint256 _plotId,
        uint256 _itemId,
        address _plantOwner,
        uint256 _plotType,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external onlyAuthorized {
        uint256 plantId = uint256(
            keccak256(
                abi.encodePacked(_plantOwner, _plotId, _itemId, block.timestamp)
            )
        );

        require(plants[plantId].id == 0, "[COMPONENT] Plant already exists");
        require(_growthTime > 0, "[COMPONENT] Invalid growth time");
        require(_plotType <= 2, "[COMPONENT] Invalid plot type");

        uint256 adjustedGrowthTime = _growthTime;
        uint256 adjustedQuality = 100;

        if (_plotType == 1) {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // Giảm 5%
            adjustedQuality += 5;
        } else if (_plotType == 2) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // Giảm 10%
            adjustedQuality += 10;
        }

        if (_weatherState == WeatherStructs.WeatherState.Cloudy) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // Giảm 5%
            adjustedQuality += 10;
        } else if (_weatherState == WeatherStructs.WeatherState.Rainy) {
            adjustedGrowthTime = (adjustedGrowthTime * 85) / 100; // Giảm 10%
            adjustedQuality += 15;
        } else if (_weatherState == WeatherStructs.WeatherState.Stormy) {
            adjustedGrowthTime = (adjustedGrowthTime * 80) / 100; // Giảm 10%
            adjustedQuality += 20;
        } else {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // Giảm 10%
            adjustedQuality += 5;
        }

        plants[plantId] = Plant(
            plantId,
            _plotId,
            _itemId,
            block.timestamp,
            block.timestamp,
            adjustedQuality,
            adjustedGrowthTime,
            0,
            false
        );

        plotPlants[_plotId] = plantId;
        ownerPlants[_plantOwner].push(plantId);
        plantOwners[plantId] = _plantOwner;

        emit PlantPlanted(plantId, _plantOwner, _plotId, _itemId);
    }

    function plantTended(
        uint256 _plantId,
        WeatherStructs.WeatherState _weatherState
    ) external onlyAuthorized {
        Plant storage plant = plants[_plantId];
        require(!plant.isHarvested, "[COMPONENT] Plant already harvested");

        require(plant.tendCount <= 3, "[COMPONENT] Too many tend");

        require(
            block.timestamp >= plant.lastTendedTime + (plant.growthTime / 3),
            "Too early to tend"
        );

        uint256 adjustedGrowthTime = plant.growthTime;
        uint256 adjustedQuality = plant.qualityModifier;

        if (_weatherState == WeatherStructs.WeatherState.Cloudy) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // Giảm 5%
            adjustedQuality += 10;
        } else if (_weatherState == WeatherStructs.WeatherState.Rainy) {
            adjustedGrowthTime = (adjustedGrowthTime * 85) / 100; // Giảm 10%
            adjustedQuality += 15;
        } else if (_weatherState == WeatherStructs.WeatherState.Stormy) {
            adjustedGrowthTime = (adjustedGrowthTime * 80) / 100; // Giảm 10%
            adjustedQuality += 20;
        } else {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // Giảm 10%
            adjustedQuality += 5;
        }

        plant.qualityModifier = adjustedQuality;
        plant.growthTime = adjustedGrowthTime;
        plant.lastTendedTime = block.timestamp;
        plant.tendCount++;

        emit PlantTended(_plantId, adjustedQuality);
    }

    function plantHarvest(
        uint256 _plantId
    ) external onlyAuthorized returns (uint256) {
        Plant storage plant = plants[_plantId];
        require(!plant.isHarvested, "[COMPONENT] Plant already harvested");
        require(
            plant.plantedTime + plant.growthTime <= block.timestamp,
            "Plant not fully grown"
        );

        // Lưu thông tin cần thiết trước khi xóa
        address owner = plantOwners[_plantId];
        uint256 plotId = plant.plotId;
        uint256 qualityModifier = plant.qualityModifier;

        // Xóa khỏi danh sách owner trước
        removePlantFromOwnerList(owner, _plantId);

        // Sau đó xóa các mapping
        delete plantOwners[_plantId];
        delete plants[_plantId];
        delete plotPlants[plotId];

        emit PlantHarvested(_plantId);
        return qualityModifier;
    }

    function removePlantFromOwnerList(address owner, uint256 plantId) internal {
        uint256[] storage ownerPlantList = ownerPlants[owner];
        uint256 length = ownerPlantList.length;

        for (uint256 i = 0; i < length; i++) {
            if (ownerPlantList[i] == plantId) {
                // Di chuyển phần tử cuối lên vị trí hiện tại (nếu không phải phần tử cuối)
                if (i < length - 1) {
                    ownerPlantList[i] = ownerPlantList[length - 1];
                }

                // Xóa phần tử cuối
                ownerPlantList.pop();
                return; // Thoát ngay khi tìm thấy và xóa
            }
        }
    }

    function getPlantedCrop(
        uint256 plantId
    ) external view onlyAuthorized returns (Plant memory) {
        return plants[plantId];
    }

    function getPlotPlants(
        uint256 plotId
    ) external view onlyAuthorized returns (uint256) {
        return plotPlants[plotId];
    }

    function getOwnerPlants(
        address owner
    ) external view onlyAuthorized returns (uint256[] memory) {
        return ownerPlants[owner];
    }

    function getOwnerPlantsWithDetails(
        address owner
    ) external view onlyAuthorized returns (Plant[] memory) {
        require(owner != address(0), "Invalid owner address");

        uint256[] memory allPlants = ownerPlants[owner];
        uint256 count = 0;

        // Đếm số lượng cây hợp lệ (còn tồn tại trong mapping và chưa thu hoạch)
        for (uint256 i = 0; i < allPlants.length; i++) {
            uint256 plantId = allPlants[i];
            if (
                plantOwners[plantId] == owner && // Kiểm tra quyền sở hữu
                plants[plantId].id != 0 && // Kiểm tra plant còn tồn tại
                !plants[plantId].isHarvested // Kiểm tra chưa thu hoạch
            ) {
                count++;
            }
        }

        // Tạo mảng kết quả với kích thước phù hợp
        Plant[] memory result = new Plant[](count);
        uint256 index = 0;

        // Lấy thông tin các cây hợp lệ
        for (uint256 i = 0; i < allPlants.length; i++) {
            uint256 plantId = allPlants[i];
            if (
                plantOwners[plantId] == owner &&
                plants[plantId].id != 0 &&
                !plants[plantId].isHarvested
            ) {
                Plant memory plant = plants[plantId];
                result[index] = plant;
                index++;
            }
        }

        return result;
    }

    function getPlantOwner(
        uint256 plantId
    ) external view onlyAuthorized returns (address) {
        return plantOwners[plantId];
    }

    // Hàm dọn dẹp danh sách owner plants (loại bỏ các plant đã bị xóa)
    function cleanupOwnerPlants(address owner) external onlyAuthorized {
        uint256[] storage ownerPlantList = ownerPlants[owner];
        uint256 length = ownerPlantList.length;

        for (uint256 i = length; i > 0; i--) {
            uint256 plantId = ownerPlantList[i - 1];
            // Kiểm tra xem plant còn tồn tại không
            if (plants[plantId].id == 0 || plantOwners[plantId] != owner) {
                // Di chuyển phần tử cuối lên vị trí hiện tại (nếu không phải phần tử cuối)
                if (i - 1 < length - 1) {
                    ownerPlantList[i - 1] = ownerPlantList[length - 1];
                }
                // Xóa phần tử cuối
                ownerPlantList.pop();
                length--;
            }
        }
    }
}
