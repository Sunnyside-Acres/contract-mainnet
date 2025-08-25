// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Raising.sol";
import "../../struct/Weather.sol";

contract RaisingComponent {
    address public world;
    address public admin;
    address public implementation;

    // Mapping lưu trữ thông tin raising
    mapping(uint256 => Raising) public raisings;

    // Mapping từ owner đến danh sách raisingId
    mapping(address => uint256[]) public ownerRaisings;

    // Mapping từ raisingId đến owner
    mapping(uint256 => address) public raisingOwners;

    event RaisingStarted(
        uint256 indexed raisingId,
        address indexed raisingOwner,
        uint256 itemId
    );
    event RaisingFed(uint256 indexed raisingId, uint256 qualityModifier);
    event RaisingHarvested(uint256 indexed raisingId);

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    function startRaising(
        uint256 _itemId,
        address _raisingOwner,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external onlyAuthorized {
        uint256 raisingId = uint256(
            keccak256(abi.encodePacked(_raisingOwner, _itemId, block.timestamp))
        );

        require(
            raisings[raisingId].id == 0,
            "[COMPONENT] Raising already exists"
        );
        require(_growthTime > 0, "[COMPONENT] Invalid growth time");

        uint256 adjustedGrowthTime = _growthTime;
        uint256 adjustedQuality = 100;

        // Điều chỉnh thời gian và chất lượng dựa trên thời tiết
        if (_weatherState == WeatherStructs.WeatherState.Cloudy) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // Giảm 10%
            adjustedQuality += 10;
        } else if (_weatherState == WeatherStructs.WeatherState.Rainy) {
            adjustedGrowthTime = (adjustedGrowthTime * 85) / 100; // Giảm 15%
            adjustedQuality += 15;
        } else if (_weatherState == WeatherStructs.WeatherState.Stormy) {
            adjustedGrowthTime = (adjustedGrowthTime * 80) / 100; // Giảm 20%
            adjustedQuality += 20;
        } else {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // Giảm 5%
            adjustedQuality += 5;
        }

        raisings[raisingId] = Raising(
            raisingId,
            _itemId,
            block.timestamp,
            block.timestamp,
            adjustedQuality,
            adjustedGrowthTime,
            block.timestamp,
            0,
            false
        );

        ownerRaisings[_raisingOwner].push(raisingId);
        raisingOwners[raisingId] = _raisingOwner;

        emit RaisingStarted(raisingId, _raisingOwner, _itemId);
    }

    function feedRaising(
        uint256 _raisingId,
        WeatherStructs.WeatherState _weatherState
    ) external onlyAuthorized {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");

        require(raising.feedCount <= 5, "[COMPONENT] Too many feeds");

        require(
            block.timestamp >= raising.lastFeedTime + (raising.growthTime / 5),
            "Too early to feed"
        );

        uint256 adjustedGrowthTime = raising.growthTime;
        uint256 adjustedQuality = raising.qualityModifier;

        // Điều chỉnh thời gian và chất lượng dựa trên thời tiết
        if (_weatherState == WeatherStructs.WeatherState.Cloudy) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // Giảm 10%
            adjustedQuality += 10;
        } else if (_weatherState == WeatherStructs.WeatherState.Rainy) {
            adjustedGrowthTime = (adjustedGrowthTime * 85) / 100; // Giảm 15%
            adjustedQuality += 15;
        } else if (_weatherState == WeatherStructs.WeatherState.Stormy) {
            adjustedGrowthTime = (adjustedGrowthTime * 80) / 100; // Giảm 20%
            adjustedQuality += 20;
        } else {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // Giảm 5%
            adjustedQuality += 5;
        }

        raising.qualityModifier = adjustedQuality;
        raising.growthTime = adjustedGrowthTime;
        raising.lastFeedTime = block.timestamp;
        raising.feedCount++;

        emit RaisingFed(_raisingId, adjustedQuality);
    }

    function harvestRaising(
        uint256 _raisingId
    ) external onlyAuthorized returns (uint256) {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            raising.raisingTime + raising.growthTime <= block.timestamp,
            "Raising not fully grown"
        );

        address owner = raisingOwners[_raisingId];
        uint256 qualityModifier = raising.qualityModifier;

        if (raising.feedCount == 0) {
            qualityModifier = 0;
        }

        removeRaisingFromOwnerList(owner, _raisingId);

        delete raisingOwners[_raisingId];
        delete raisings[_raisingId];

        emit RaisingHarvested(_raisingId);
        return qualityModifier;
    }

    function removeRaisingFromOwnerList(
        address owner,
        uint256 raisingId
    ) internal {
        uint256[] storage ownerRaisingList = ownerRaisings[owner];
        uint256 length = ownerRaisingList.length;

        for (uint256 i = 0; i < length; i++) {
            if (ownerRaisingList[i] == raisingId) {
                // Di chuyển phần tử cuối lên vị trí hiện tại (nếu không phải phần tử cuối)
                if (i < length - 1) {
                    ownerRaisingList[i] = ownerRaisingList[length - 1];
                }

                ownerRaisingList.pop();
                return;
            }
        }
    }

    function getRaising(
        uint256 raisingId
    ) external view onlyAuthorized returns (Raising memory) {
        return raisings[raisingId];
    }

    function getOwnerRaisings(
        address owner
    ) external view onlyAuthorized returns (uint256[] memory) {
        return ownerRaisings[owner];
    }

    function getOwnerRaisingsWithDetails(
        address owner
    ) external view onlyAuthorized returns (Raising[] memory) {
        require(owner != address(0), "Invalid owner address");

        uint256[] memory allRaisings = ownerRaisings[owner];
        uint256 count = 0;

        // Đếm số lượng raising hợp lệ (còn tồn tại trong mapping và chưa thu hoạch)
        for (uint256 i = 0; i < allRaisings.length; i++) {
            uint256 raisingId = allRaisings[i];
            if (
                raisingOwners[raisingId] == owner && // Kiểm tra quyền sở hữu
                raisings[raisingId].id != 0 && // Kiểm tra raising còn tồn tại
                !raisings[raisingId].isHarvested // Kiểm tra chưa thu hoạch
            ) {
                count++;
            }
        }

        // Tạo mảng kết quả với kích thước phù hợp
        Raising[] memory result = new Raising[](count);
        uint256 index = 0;

        // Lấy thông tin các raising hợp lệ
        for (uint256 i = 0; i < allRaisings.length; i++) {
            uint256 raisingId = allRaisings[i];
            if (
                raisingOwners[raisingId] == owner &&
                raisings[raisingId].id != 0 &&
                !raisings[raisingId].isHarvested
            ) {
                Raising memory raising = raisings[raisingId];
                result[index] = raising;
                index++;
            }
        }

        return result;
    }

    function getRaisingOwner(
        uint256 raisingId
    ) external view onlyAuthorized returns (address) {
        return raisingOwners[raisingId];
    }

    function cleanupOwnerRaisings(address owner) external onlyAuthorized {
        uint256[] storage ownerRaisingList = ownerRaisings[owner];
        uint256 length = ownerRaisingList.length;

        for (uint256 i = length; i > 0; i--) {
            uint256 raisingId = ownerRaisingList[i - 1];
            // Kiểm tra xem raising còn tồn tại không
            if (
                raisings[raisingId].id == 0 || raisingOwners[raisingId] != owner
            ) {
                // Di chuyển phần tử cuối lên vị trí hiện tại (nếu không phải phần tử cuối)
                if (i - 1 < length - 1) {
                    ownerRaisingList[i - 1] = ownerRaisingList[length - 1];
                }
                // Xóa phần tử cuối
                ownerRaisingList.pop();
                length--;
            }
        }
    }
}
