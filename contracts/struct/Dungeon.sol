// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Item.sol";

/**
 * @title DungeonStructs
 * @notice Thư viện chứa các cấu trúc dữ liệu liên quan đến dungeon
 */
library DungeonStructs {
    /**
     * @notice Enum định nghĩa các loại dungeon
     */
    enum DungeonType {
        Normal, /// Dungeon thường
        Elite, /// Dungeon tinh anh
        Boss, /// Dungeon boss
        Event, /// Dungeon sự kiện
        Raid /// Dungeon raid
    }

    /**
     * @notice Enum định nghĩa các mức độ khó của dungeon
     */
    enum Difficulty {
        Easy, /// Độ khó dễ
        Medium, /// Độ khó trung bình
        Hard, /// Độ khó khó
        Expert, /// Độ khó chuyên gia
        Master /// Độ khó bậc thầy
    }

    /**
     * @notice Struct đại diện cho yêu cầu vật phẩm để vào dungeon
     */
    struct ItemRequirement {
        uint256 itemId; /// ID của vật phẩm yêu cầu
        uint256 quantity; /// Số lượng yêu cầu
        bool isConsumed; /// Vật phẩm có bị tiêu hao khi vào không
    }

    /**
     * @notice Struct đại diện cho một màn trong dungeon
     */
    struct DungeonStage {
        uint256 stageNumber; /// Số màn (1, 2, 3, ...)
        uint256 rewardMultiplier; /// Hệ số nhân thưởng cho màn này (dùng basis points, ví dụ: 2000 = 0.2x, 5000 = 0.5x)
        bool isActive; /// Màn này có hoạt động không
        uint256 createdAt; /// Thời gian tạo
    }

    /**
     * @notice Struct đại diện cho một dungeon
     */
    struct Dungeon {
        uint256 id; /// ID duy nhất của dungeon
        string name; /// Tên dungeon
        string description; /// Mô tả dungeon
        DungeonType dungeonType; /// Loại dungeon
        Difficulty difficulty; /// Mức độ khó
        uint256 levelRequirement; /// Cấp độ tối thiểu của người chơi
        uint256 energyCost; /// Chi phí năng lượng để vào
        uint256 sunlightCost; /// Chi phí ánh sáng để vào
        uint256 sunnyCost; /// Chi phí sunny để vào
        ItemRequirement[] itemRequirements; /// Vật phẩm yêu cầu để vào
        DungeonStage[] stages; /// Các màn có sẵn trong dungeon này
        uint256 cooldownTime; /// Thời gian chờ giữa các lần thử (giây)
        uint256 minBetAmount; /// Số tiền bet tối thiểu (wei)
        uint256 maxBetAmount; /// Số tiền bet tối đa (wei)
        bool isActive; /// Dungeon có hoạt động không
        bool isPaused; /// Dungeon có bị tạm dừng không
        uint256 createdAt; /// Thời gian tạo
        uint256 updatedAt; /// Thời gian cập nhật cuối
    }

    /**
     * @notice Struct đại diện cho tiến độ dungeon của người chơi
     */
    struct PlayerDungeonProgress {
        address player; /// Địa chỉ người chơi
        uint256 dungeonId; /// ID dungeon
        uint256 lastAttemptTime; /// Thời gian thử cuối
        uint256 totalAttempts; /// Tổng số lần thử
        uint256 successfulAttempts; /// Số lần thành công
        bool isUnlocked; /// Dungeon có được mở khóa cho người chơi không
    }

    /**
     * @notice Struct đại diện cho phiên chơi dungeon
     */
    struct DungeonSession {
        uint256 sessionId; /// ID duy nhất của phiên chơi
        address player; /// Địa chỉ người chơi
        uint256 dungeonId; /// ID dungeon
        uint256 stageNumber; /// Số màn đang chơi
        uint256 startTime; /// Thời gian bắt đầu
        uint256 endTime; /// Thời gian kết thúc
        bool isCompleted; /// Phiên có hoàn thành không
        bool isClaimed; /// Phần thưởng đã được claim chưa
        uint256[] rewardItemIds; /// ID các vật phẩm thưởng
        uint256[] rewardQuantities; /// Số lượng các vật phẩm thưởng
        uint256 rewardMultiplier; /// Hệ số nhân thưởng
        uint256[] playerDamages; /// Damage của người chơi trong các vòng
        uint256[] monsterHPs; /// Máu của quái trong các vòng
        uint256 sunlightReward; /// Thưởng sunlight
        uint256 sunnyReward; /// Thưởng sunny
        uint256 betAmount; /// Số tiền bet (native token)
        bool hasBet; /// Có bet hay không
        uint256[] equipmentItemIds; /// ID các equipment items được sử dụng
        uint256[] equipmentQuantities; /// Số lượng các equipment items
    }
}
