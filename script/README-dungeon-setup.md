# 🏰 Dungeon Setup Scripts

Bộ script để setup và test hệ thống Dungeon từ file JSON.

## 📁 Files

### 1. `data/dungeons.json`
File JSON chứa dữ liệu mẫu của các dungeons:
- **dungeonId**: ID duy nhất của dungeon
- **name**: Tên dungeon
- **description**: Mô tả dungeon
- **dungeonType**: Loại dungeon (NORMAL, BOSS, SPECIAL, EVENT)
- **difficulty**: Độ khó (EASY, MEDIUM, HARD, EXTREME)
- **levelRequirement**: Cấp độ tối thiểu của người chơi
- **energyCost**: Chi phí năng lượng
- **sunlightCost**: Chi phí ánh sáng
- **sunnyCost**: Chi phí sunny
- **itemRequirements**: Vật phẩm yêu cầu để vào dungeon
- **cooldownTime**: Thời gian chờ giữa các lần thử (giây)
- **minBetAmount**: Số tiền bet tối thiểu
- **maxBetAmount**: Số tiền bet tối đa
- **stages**: Các màn trong dungeon với reward multiplier
- **isActive**: Dungeon có hoạt động không
- **isPaused**: Dungeon có bị tạm dừng không

### 2. `setup-dungeons-from-json.js`
Script chính để setup dungeons từ file JSON.

**Cách sử dụng:**
```bash
npx hardhat run script/setup-dungeons-from-json.js --network localhost
```

**Chức năng:**
- Đọc dữ liệu từ `data/dungeons.json`
- Tạo các dungeons với thông tin đầy đủ
- Thêm các stages cho mỗi dungeon
- Set trạng thái active/paused
- Lưu thông tin setup vào file

### 3. `test-dungeon-functions.js`
Script để test các functions cơ bản của dungeon system.

**Cách sử dụng:**
```bash
npx hardhat run script/test-dungeon-functions.js --network localhost
```

**Chức năng:**
- Lấy danh sách tất cả dungeon IDs
- Lấy thông tin chi tiết từng dungeon
- Kiểm tra dungeon có tồn tại không
- Test với dungeon ID không tồn tại

### 4. `test-dungeon-session.js`
Script để test dungeon session (chơi dungeon).

**Cách sử dụng:**
```bash
npx hardhat run script/test-dungeon-session.js --network localhost
```

**Chức năng:**
- Tạo player test
- Tạo items cần thiết
- Thêm items vào inventory
- Bắt đầu dungeon session
- Kết thúc dungeon session (admin)
- Claim rewards (player)
- Kiểm tra player sessions

## 🚀 Workflow Setup

### Bước 1: Deploy Contracts
```bash
npx hardhat run script/deploy-all-contracts.js --network localhost
```

### Bước 2: Setup Dungeons
```bash
npx hardhat run script/setup-dungeons-from-json.js --network localhost
```

### Bước 3: Test Functions
```bash
npx hardhat run script/test-dungeon-functions.js --network localhost
```

### Bước 4: Test Session
```bash
npx hardhat run script/test-dungeon-session.js --network localhost
```

## 📊 Dungeon Types

| Type | Value | Description |
|------|-------|-------------|
| NORMAL | 0 | Dungeon thường |
| BOSS | 1 | Dungeon boss |
| SPECIAL | 2 | Dungeon đặc biệt |
| EVENT | 3 | Dungeon sự kiện |

## 🎯 Difficulty Levels

| Difficulty | Value | Description |
|------------|-------|-------------|
| EASY | 0 | Dễ |
| MEDIUM | 1 | Trung bình |
| HARD | 2 | Khó |
| EXTREME | 3 | Cực khó |

## 🎮 Dungeon Session Flow

1. **Player starts dungeon**: `startDungeon()`
   - Kiểm tra requirements (level, energy, items)
   - Trừ resources (energy, sunlight, sunny)
   - Tạo session mới
   - Emit `DungeonSessionStarted` event

2. **Admin ends dungeon**: `endDungeon()`
   - Set kết quả session (completed/failed)
   - Set rewards (items, sunlight, sunny)
   - Set battle data (damages, HPs)
   - Emit `DungeonSessionEnded` event

3. **Player claims rewards**: `claimRewards()`
   - Kiểm tra session completed
   - Thêm rewards vào inventory
   - Xử lý bet rewards nếu có
   - Set session claimed = true
   - Emit `DungeonRewardsClaimed` event

## 🔧 Customization

### Thêm Dungeon Mới
Chỉnh sửa file `data/dungeons.json` và thêm dungeon mới:

```json
{
  "dungeonId": 6,
  "name": "New Dungeon",
  "description": "Description here",
  "dungeonType": "NORMAL",
  "difficulty": "MEDIUM",
  "levelRequirement": 5,
  "energyCost": 20,
  "sunlightCost": 200,
  "sunnyCost": 100,
  "itemRequirements": [
    {
      "itemId": 1,
      "quantity": 1,
      "isConsumed": false
    }
  ],
  "cooldownTime": 3600,
  "minBetAmount": "1000000000000000000",
  "maxBetAmount": "10000000000000000000",
  "stages": [
    {
      "stageNumber": 1,
      "rewardMultiplier": 10000
    }
  ],
  "isActive": true,
  "isPaused": false
}
```

### Thay Đổi Items
Cập nhật `itemRequirements` trong JSON để yêu cầu items khác:

```json
"itemRequirements": [
  {
    "itemId": 2,
    "quantity": 1,
    "isConsumed": true
  },
  {
    "itemId": 3,
    "quantity": 5,
    "isConsumed": false
  }
]
```

## ⚠️ Lưu Ý

1. **Admin Rights**: Script setup cần deployer có quyền admin
2. **Items**: Cần tạo items trước khi setup dungeons có item requirements
3. **Network**: Đảm bảo chạy trên đúng network (localhost, seimainnet, etc.)
4. **Gas**: Các operations có thể tốn gas, đảm bảo có đủ ETH
5. **Testing**: Luôn test trên localhost trước khi deploy lên mainnet

## 🐛 Troubleshooting

### Lỗi "Not authorized as admin"
- Kiểm tra deployer có phải admin không
- Chạy script với account đã được set admin

### Lỗi "Dungeon already exists"
- Dungeon với ID đó đã tồn tại
- Thay đổi dungeonId trong JSON

### Lỗi "Player does not have required item"
- Player chưa có items cần thiết
- Thêm items vào inventory trước khi chơi dungeon

### Lỗi "Not enough energy/sunlight/sunny"
- Player không đủ resources
- Tăng resources cho player hoặc giảm cost của dungeon
