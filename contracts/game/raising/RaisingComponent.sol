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
    event RaisingSlaughtered(uint256 indexed raisingId);
    event RaisingHarvestedWithCooldown(
        uint256 indexed raisingId,
        uint256 harvestCount
    );
    event TotalHarvestedItemsUpdated(
        uint256 indexed raisingId,
        uint256 totalHarvestedItems
    );
    event FeedingReset(uint256 indexed raisingId, uint256 harvestCount);

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
            adjustedQuality,
            adjustedGrowthTime,
            block.timestamp,
            0,
            false,
            0, // lastHarvestTime
            0, // harvestCount
            false, // isSlaughtered
            0 // totalHarvestedItems
        );

        ownerRaisings[_raisingOwner].push(raisingId);
        raisingOwners[raisingId] = _raisingOwner;

        emit RaisingStarted(raisingId, _raisingOwner, _itemId);
    }

    function feedRaising(
        uint256 _raisingId,
        WeatherStructs.WeatherState _weatherState,
        uint256 _harvestCooldown
    ) external onlyAuthorized {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");

        require(raising.feedCount <= 3, "[COMPONENT] Too many feeds");

        // Logic thời gian chăm sóc:
        // - Lần đầu tiên (chưa thu hoạch): sử dụng growthTime/3
        // - Sau khi thu hoạch lần đầu: sử dụng harvestCooldown/3
        if (raising.harvestCount == 0) {
            // Chưa thu hoạch lần nào, sử dụng growthTime/3
            require(
                block.timestamp >=
                    raising.lastFeedTime + (raising.growthTime / 3),
                "Too early to feed"
            );
        } else {
            // Đã thu hoạch ít nhất 1 lần, sử dụng harvestCooldown/3
            require(
                block.timestamp >=
                    raising.lastFeedTime + (_harvestCooldown / 3),
                "Too early to feed"
            );
        }

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

    function harvestRaisingWithCooldown(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external onlyAuthorized returns (uint256) {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );
        require(
            raising.raisingTime + raising.growthTime <= block.timestamp,
            "Raising not fully grown"
        );
        require(
            raising.harvestCount < 3,
            "[COMPONENT] Max harvest count reached"
        );

        // Kiểm tra cooldown
        if (raising.harvestCount > 0) {
            require(
                block.timestamp >= raising.lastHarvestTime + _harvestCooldown,
                "[COMPONENT] Harvest cooldown not finished"
            );
        }

        uint256 qualityModifier = raising.qualityModifier;
        // Không cần check feedCount == 0 nữa vì đã check trong logic

        raising.lastHarvestTime = block.timestamp;
        raising.harvestCount++;

        // Reset feeding sau khi harvest để có thể cho ăn lại
        raising.feedCount = 0;
        raising.lastFeedTime = 0;

        emit RaisingHarvestedWithCooldown(_raisingId, raising.harvestCount);
        emit FeedingReset(_raisingId, raising.harvestCount);
        return qualityModifier;
    }

    function updateTotalHarvestedItems(
        uint256 _raisingId,
        uint256 _additionalItems
    ) external onlyAuthorized {
        Raising storage raising = raisings[_raisingId];
        require(raising.id != 0, "[COMPONENT] Raising not found");

        raising.totalHarvestedItems += _additionalItems;

        emit TotalHarvestedItemsUpdated(
            _raisingId,
            raising.totalHarvestedItems
        );
    }

    function getNextFeedingTime(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external view onlyAuthorized returns (uint256) {
        Raising storage raising = raisings[_raisingId];
        require(raising.id != 0, "[COMPONENT] Raising not found");
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );

        // Nếu chưa feed lần nào, có thể feed ngay
        if (raising.feedCount == 0) {
            return block.timestamp;
        }

        // Logic thời gian cho ăn tiếp theo:
        // - Lần đầu tiên (chưa thu hoạch): sử dụng growthTime/3
        // - Sau khi thu hoạch lần đầu: sử dụng harvestCooldown/3
        uint256 nextFeedingTime;
        if (raising.harvestCount == 0) {
            // Chưa thu hoạch lần nào, sử dụng growthTime/3
            nextFeedingTime = raising.lastFeedTime + (raising.growthTime / 3);
        } else {
            // Đã thu hoạch ít nhất 1 lần, sử dụng harvestCooldown/3
            nextFeedingTime = raising.lastFeedTime + (_harvestCooldown / 3);
        }

        // Nếu đã đến thời gian cho ăn tiếp theo, trả về thời gian hiện tại
        if (nextFeedingTime <= block.timestamp) {
            return block.timestamp;
        }

        return nextFeedingTime;
    }

    function canFeed(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external view onlyAuthorized returns (bool) {
        Raising storage raising = raisings[_raisingId];
        require(raising.id != 0, "[COMPONENT] Raising not found");
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );

        // Kiểm tra số lần feed
        if (raising.feedCount >= 3) {
            return false;
        }

        // Nếu chưa feed lần nào, có thể feed ngay
        if (raising.feedCount == 0) {
            return true;
        }

        // Logic thời gian chăm sóc:
        // - Lần đầu tiên (chưa thu hoạch): sử dụng growthTime/3
        // - Sau khi thu hoạch lần đầu: sử dụng harvestCooldown/3
        if (raising.harvestCount == 0) {
            // Chưa thu hoạch lần nào, sử dụng growthTime/3
            return
                block.timestamp >=
                raising.lastFeedTime + (raising.growthTime / 3);
        } else {
            // Đã thu hoạch ít nhất 1 lần, sử dụng harvestCooldown/3
            return
                block.timestamp >=
                raising.lastFeedTime + (_harvestCooldown / 3);
        }
    }

    function slaughterRaising(
        uint256 _raisingId
    ) external onlyAuthorized returns (uint256) {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );
        require(
            raising.raisingTime + raising.growthTime <= block.timestamp,
            "Raising not fully grown"
        );

        address owner = raisingOwners[_raisingId];
        uint256 qualityModifier = raising.qualityModifier;
        // Không cần check feedCount == 0 nữa vì đã check trong logic

        raising.isSlaughtered = true;
        removeRaisingFromOwnerList(owner, _raisingId);

        delete raisingOwners[_raisingId];
        delete raisings[_raisingId];

        emit RaisingSlaughtered(_raisingId);
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
                !raisings[raisingId].isHarvested && // Kiểm tra chưa thu hoạch
                !raisings[raisingId].isSlaughtered // Kiểm tra chưa giết thịt
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
                !raisings[raisingId].isHarvested &&
                !raisings[raisingId].isSlaughtered
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
                raisings[raisingId].id == 0 ||
                raisingOwners[raisingId] != owner ||
                raisings[raisingId].isHarvested ||
                raisings[raisingId].isSlaughtered
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
