# Hệ Thống Dungeon - Hướng Dẫn Sử Dụng

## Tổng Quan

Hệ thống Dungeon là một phần quan trọng của game blockchain, cho phép người chơi tham gia các thử thách để nhận phần thưởng. Hệ thống được thiết kế theo kiến trúc Component-Logic-Proxy để đảm bảo tính mở rộng và bảo trì dễ dàng.

## Kiến Trúc Hệ Thống

### 1. DungeonComponent
- **Chức năng**: Lưu trữ dữ liệu và logic cơ bản
- **Nhiệm vụ**: Quản lý state của dungeons, sessions, và player progress
- **Truy cập**: Chỉ logic contracts được ủy quyền

### 2. DungeonLogic  
- **Chức năng**: Xử lý logic phức tạp và tương tác với các hệ thống khác
- **Nhiệm vụ**: Validation, business logic, và integration
- **Truy cập**: Người chơi và admin

### 3. DungeonProxy
- **Chức năng**: Proxy pattern cho upgradeability
- **Nhiệm vụ**: Delegate calls đến implementation contract
- **Truy cập**: Public interface

## Cấu Trúc Dữ Liệu

### Dungeon Types
```solidity
enum DungeonType {
    Normal,    // Dungeon thường
    Elite,     // Dungeon tinh anh  
    Boss,      // Dungeon boss
    Event,     // Dungeon sự kiện
    Raid       // Dungeon raid
}
```

### Difficulty Levels
```solidity
enum Difficulty {
    Easy,      // Độ khó dễ
    Medium,    // Độ khó trung bình
    Hard,      // Độ khó khó
    Expert,    // Độ khó chuyên gia
    Master     // Độ khó bậc thầy
}
```

### Dungeon Structure
```solidity
struct Dungeon {
    uint256 id;                    // ID duy nhất
    string name;                   // Tên dungeon
    string description;             // Mô tả
    DungeonType dungeonType;       // Loại dungeon
    Difficulty difficulty;         // Mức độ khó
    uint256 levelRequirement;      // Cấp độ tối thiểu
    uint256 energyCost;            // Chi phí năng lượng
    uint256 sunlightCost;          // Chi phí ánh sáng
    uint256 sunnyCost;             // Chi phí sunny
    ItemRequirement[] itemRequirements; // Vật phẩm yêu cầu
    DungeonStage[] stages;         // Các màn
    uint256 cooldownTime;          // Thời gian chờ
    bool isActive;                 // Trạng thái hoạt động
    bool isPaused;                 // Trạng thái tạm dừng
}
```

## Cơ Chế Game

### 1. Quy Trình Chơi Dungeon

#### Bước 1: Tạo Dungeon (Admin)
```solidity
function createDungeon(
    uint256 _dungeonId,
    string memory _name,
    string memory _description,
    DungeonStructs.DungeonType _dungeonType,
    DungeonStructs.Difficulty _difficulty,
    uint256 _levelRequirement,
    uint256 _energyCost,
    uint256 _sunlightCost,
    uint256 _sunnyCost,
    DungeonStructs.ItemRequirement[] memory _itemRequirements,
    uint256 _cooldownTime
) external onlyAdmin returns (uint256)
```

**Tham số:**
- `_dungeonId`: ID duy nhất của dungeon
- `_name`: Tên dungeon (tối đa 64 ký tự)
- `_description`: Mô tả (tối đa 256 ký tự)
- `_dungeonType`: Loại dungeon (Normal, Elite, Boss, Event, Raid)
- `_difficulty`: Mức độ khó (Easy, Medium, Hard, Expert, Master)
- `_levelRequirement`: Cấp độ tối thiểu của người chơi
- `_energyCost`: Chi phí năng lượng (mana)
- `_sunlightCost`: Chi phí ánh sáng
- `_sunnyCost`: Chi phí sunny
- `_itemRequirements`: Vật phẩm yêu cầu để vào
- `_cooldownTime`: Thời gian chờ giữa các lần thử (giây)

#### Bước 2: Thêm Màn Cho Dungeon (Admin)
```solidity
function addDungeonStage(
    uint256 _dungeonId,
    uint256 _stageNumber,
    uint256 _rewardMultiplier
) external onlyAdmin returns (bool)
```

**Tham số:**
- `_dungeonId`: ID của dungeon
- `_stageNumber`: Số màn (phải > 0)
- `_rewardMultiplier`: Hệ số nhân thưởng (basis points, ví dụ: 2000 = 0.2x, tối đa 100000 = 10x)

#### Bước 3: Người Chơi Bắt Đầu Dungeon
```solidity
function startDungeon(
    uint256 _dungeonId,
    uint256 _stageNumber,
    uint256 _betAmount
) external payable returns (uint256)
```

**Quy trình:**
1. **Validation**: Kiểm tra dungeon tồn tại, active, không paused
2. **Kiểm tra Requirements**: 
   - Cấp độ người chơi >= levelRequirement
   - Có đủ energy, sunlight, sunny
   - Có đủ vật phẩm yêu cầu
3. **Trừ Resources**: Trừ energy, sunlight, sunny, items (nếu isConsumed = true)
4. **Tạo Session**: Tạo phiên chơi mới với sessionId
5. **Betting**: Nếu có bet, kiểm tra min/max bet amount

**Events được emit:**
- `DungeonSessionStarted(sessionId, player, dungeonId, stageNumber, betAmount)`

#### Bước 4: Admin Kết Thúc Dungeon
```solidity
function endDungeon(
    uint256 _sessionId,
    bool _isCompleted,
    uint256[] memory _rewardItemIds,
    uint256[] memory _rewardQuantities,
    uint256[] memory _playerDamages,
    uint256[] memory _monsterHPs,
    uint256 _sunlightReward,
    uint256 _sunnyReward
) external onlyAdmin
```

**Tham số:**
- `_sessionId`: ID của phiên chơi
- `_isCompleted`: Có hoàn thành không
- `_rewardItemIds`: ID các vật phẩm thưởng
- `_rewardQuantities`: Số lượng các vật phẩm thưởng
- `_playerDamages`: Damage của người chơi trong các vòng
- `_monsterHPs`: Máu của quái trong các vòng
- `_sunlightReward`: Thưởng sunlight
- `_sunnyReward`: Thưởng sunny

**Events được emit:**
- `DungeonSessionEnded(sessionId, player, dungeonId, isCompleted, rewardItemIds, rewardQuantities, playerDamages, monsterHPs, sunlightReward, sunnyReward)`

#### Bước 5: Người Chơi Claim Phần Thưởng
```solidity
function claimRewards(uint256 _sessionId) external nonReentrant returns (bool)
```

**Quy trình:**
1. **Validation**: Kiểm tra session tồn tại, chưa claim, đã hoàn thành
2. **Cộng Resources**: Cộng sunlight và sunny nếu có
3. **Xử lý Bet Rewards**: Nếu có bet và hoàn thành, tính toán và chuyển tiền thưởng
4. **Claim Items**: Thêm vật phẩm vào inventory

**Events được emit:**
- `DungeonRewardsClaimed(sessionId, player, rewardItemIds, rewardQuantities)`
- `BetRewardClaimed(sessionId, player, betAmount, rewardAmount, multiplier)`

### 2. Hệ Thống Betting

#### Thiết Lập Min/Max Bet (Admin)
```solidity
function setMinMaxBetAmount(
    uint256 _minBetAmount,
    uint256 _maxBetAmount
) external onlyAdmin
```

#### Cơ Chế Betting
- **Min Bet**: Số tiền bet tối thiểu (có thể = 0)
- **Max Bet**: Số tiền bet tối đa
- **Reward Calculation**: `betReward = (betAmount * rewardMultiplier) / 10000`
- **Reward Multiplier**: Được set cho từng stage của dungeon

### 3. Hệ Thống Resources

#### Energy (Mana)
- **Chi phí**: `energyCost` của dungeon
- **Kiểm tra**: `player.mana >= energyCost`
- **Trừ**: `newMana = player.mana - energyCost`

#### Sunlight
- **Chi phí**: `sunlightCost` của dungeon  
- **Kiểm tra**: `player.sunlight >= sunlightCost`
- **Trừ**: `PlayerComponent.subtractSunlight(player, sunlightCost)`

#### Sunny
- **Chi phí**: `sunnyCost` của dungeon
- **Kiểm tra**: `player.sunny >= sunnyCost`
- **Trừ**: `PlayerComponent.subtractSunny(player, sunnyCost)`

### 4. Hệ Thống Items

#### Item Requirements
```solidity
struct ItemRequirement {
    uint256 itemId;        // ID vật phẩm
    uint256 quantity;       // Số lượng yêu cầu
    bool isConsumed;        // Có bị tiêu hao không
}
```

#### Kiểm Tra Items
1. **Existence Check**: `InventoryComponent.exists(player, itemId)`
2. **Quantity Check**: `playerItem.quantity >= requirement.quantity`
3. **Consumption**: Nếu `isConsumed = true`, trừ số lượng

## Các Hàm Quan Trọng

### Admin Functions

#### Quản Lý Dungeon
```solidity
// Tạo dungeon mới
function createDungeon(...) external onlyAdmin

// Thêm màn cho dungeon
function addDungeonStage(...) external onlyAdmin

// Bật/tắt dungeon
function setDungeonActive(uint256 _dungeonId, bool _isActive) external onlyAdmin

// Tạm dừng/tiếp tục dungeon
function setDungeonPaused(uint256 _dungeonId, bool _isPaused) external onlyAdmin

// Thiết lập min/max bet
function setMinMaxBetAmount(uint256 _minBetAmount, uint256 _maxBetAmount) external onlyAdmin
```

#### Quản Lý Session
```solidity
// Kết thúc phiên chơi
function endDungeon(...) external onlyAdmin
```

### Player Functions

#### Chơi Dungeon
```solidity
// Bắt đầu dungeon
function startDungeon(uint256 _dungeonId, uint256 _stageNumber, uint256 _betAmount) external payable

// Claim phần thưởng
function claimRewards(uint256 _sessionId) external nonReentrant
```

### Query Functions

#### Thông Tin Dungeon
```solidity
// Lấy thông tin dungeon
function getDungeon(uint256 _dungeonId) external view returns (DungeonStructs.Dungeon memory)

// Lấy tất cả dungeon IDs
function getAllDungeonIds() external view returns (uint256[] memory)

// Kiểm tra dungeon tồn tại
function dungeonExists(uint256 _dungeonId) external view returns (bool)

// Lấy min/max bet amount
function getMinMaxBetAmount() external view returns (uint256 _minBetAmount, uint256 _maxBetAmount)
```

#### Thông Tin Session
```solidity
// Lấy thông tin phiên chơi
function getDungeonSession(uint256 _sessionId) external view returns (DungeonStructs.DungeonSession memory)

// Lấy danh sách phiên chơi của người chơi
function getPlayerSessions(address _player) external view returns (uint256[] memory)

// Lấy thông tin battle
function getSessionBattleData(uint256 _sessionId) external view returns (uint256[] memory playerDamages, uint256[] memory monsterHPs)
```

### Emergency Functions

#### Rút Tiền Khẩn Cấp
```solidity
function emergencyWithdraw(address payable _to) external onlyAdmin nonReentrant returns (bool)
```

## Events Quan Trọng

### Dungeon Management
- `DungeonCreated(dungeonId, name, dungeonType, difficulty)`
- `DungeonStageAdded(dungeonId, stageNumber, rewardMultiplier)`

### Session Management  
- `DungeonSessionStarted(sessionId, player, dungeonId, stageNumber, betAmount)`
- `DungeonSessionEnded(sessionId, player, dungeonId, isCompleted, rewardItemIds, rewardQuantities, playerDamages, monsterHPs, sunlightReward, sunnyReward)`

### Rewards
- `DungeonRewardsClaimed(sessionId, player, rewardItemIds, rewardQuantities)`
- `BetRewardClaimed(sessionId, player, betAmount, rewardAmount, multiplier)`

### Admin Actions
- `MinMaxBetAmountUpdated(minBetAmount, maxBetAmount, admin)`
- `EmergencyWithdraw(admin, amount, timestamp)`

## Bảo Mật

### Access Control
- **onlyAdmin**: Chỉ admin có thể tạo, cập nhật dungeon
- **onlyAuthorized**: Chỉ logic contracts được ủy quyền
- **nonReentrant**: Bảo vệ chống reentrancy attacks

### Validation
- **Input Validation**: Kiểm tra tất cả tham số đầu vào
- **Resource Validation**: Kiểm tra đủ resources trước khi trừ
- **State Validation**: Kiểm tra trạng thái dungeon và session

### Emergency Functions
- **emergencyWithdraw**: Cho phép admin rút tiền trong trường hợp khẩn cấp
- **Reentrancy Protection**: Sử dụng nonReentrant modifier

## Lưu Ý Khi Sử Dụng

### Cho Admin
1. **Tạo Dungeon**: Đảm bảo thiết lập đúng requirements và costs
2. **Thêm Stages**: Set rewardMultiplier phù hợp (basis points)
3. **Quản Lý State**: Sử dụng setDungeonActive và setDungeonPaused khi cần
4. **Betting**: Thiết lập min/max bet amount hợp lý

### Cho Người Chơi
1. **Kiểm Tra Resources**: Đảm bảo có đủ energy, sunlight, sunny
2. **Kiểm Tra Items**: Có đủ vật phẩm yêu cầu
3. **Betting**: Hiểu rõ min/max bet amount
4. **Claim Rewards**: Nhớ claim phần thưởng sau khi hoàn thành

### Cho Developer
1. **Event Listening**: Lắng nghe events để cập nhật UI
2. **Error Handling**: Xử lý các lỗi validation
3. **Gas Optimization**: Tính toán gas cost cho các operations
4. **Integration**: Tích hợp với Inventory và Player systems

## Ví Dụ Sử Dụng

### Tạo Dungeon Mới
```javascript
// Admin tạo dungeon
await dungeonLogic.createDungeon(
    1, // dungeonId
    "Forest Dungeon", // name
    "A mysterious forest full of monsters", // description
    0, // DungeonType.Normal
    1, // Difficulty.Easy
    5, // levelRequirement
    10, // energyCost
    100, // sunlightCost
    50, // sunnyCost
    [], // itemRequirements
    3600 // cooldownTime (1 hour)
);
```

### Thêm Stage Cho Dungeon
```javascript
// Admin thêm stage
await dungeonLogic.addDungeonStage(
    1, // dungeonId
    1, // stageNumber
    2000 // rewardMultiplier (0.2x)
);
```

### Người Chơi Bắt Đầu Dungeon
```javascript
// Người chơi bắt đầu dungeon với bet
await dungeonLogic.startDungeon(
    1, // dungeonId
    1, // stageNumber
    ethers.utils.parseEther("0.1") // betAmount
, { value: ethers.utils.parseEther("0.1") });
```

### Claim Phần Thưởng
```javascript
// Người chơi claim phần thưởng
await dungeonLogic.claimRewards(sessionId);
```

Hệ thống Dungeon được thiết kế để cung cấp trải nghiệm game phong phú với cơ chế betting, rewards, và progression system hoàn chỉnh. Việc hiểu rõ các hàm và cơ chế sẽ giúp tích hợp và sử dụng hệ thống một cách hiệu quả.
