# Dungeon Contracts Deployment Guide

## Tổng Quan

Hướng dẫn deploy và setup hệ thống Dungeon contracts với đầy đủ các scripts cần thiết.

## Scripts Có Sẵn

### 1. `deploy-dungeon-contracts.js`
**Mục đích**: Deploy toàn bộ hệ thống Dungeon contracts lần đầu

**Chức năng**:
- Deploy DungeonComponent
- Deploy DungeonProxy  
- Deploy DungeonLogic
- Register DungeonLogic trong World contract
- Cập nhật deployment JSON file

**Cách sử dụng**:
```bash
npx hardhat run script/deploy-dungeon-contracts.js --network localhost
```

**Dependencies cần có**:
- World contract đã deploy
- InventoryComponent đã deploy
- PlayerComponent đã deploy

### 2. `deploy-dungeon-logic-only.js`
**Mục đích**: Deploy chỉ DungeonLogic (để update logic mà không cần deploy lại component/proxy)

**Chức năng**:
- Deploy DungeonLogic mới
- Register DungeonLogic trong World contract
- Cập nhật deployment JSON file

**Cách sử dụng**:
```bash
npx hardhat run script/deploy-dungeon-logic-only.js --network localhost
```

**Dependencies cần có**:
- DungeonComponent đã deploy
- DungeonProxy đã deploy
- InventoryComponent đã deploy
- PlayerComponent đã deploy

### 3. `setup-sample-dungeons.js`
**Mục đích**: Tạo các dungeon mẫu và setup betting parameters

**Chức năng**:
- Set min/max bet amounts
- Tạo 3 dungeon mẫu:
  - Forest Dungeon (Easy)
  - Cave Dungeon (Medium) 
  - Boss Dungeon (Expert)
- Thêm stages cho mỗi dungeon
- Kích hoạt tất cả dungeons

**Cách sử dụng**:
```bash
npx hardhat run script/setup-sample-dungeons.js --network localhost
```

**Dependencies cần có**:
- DungeonLogic đã deploy và register

### 4. `test-dungeon-functions.js`
**Mục đích**: Test các functions của Dungeon system

**Chức năng**:
- Test get dungeon info
- Test get betting info
- Test dungeon management (pause/unpause, activate/deactivate)
- Test tạo dungeon mới
- Test emergency functions

**Cách sử dụng**:
```bash
npx hardhat run script/test-dungeon-functions.js --network localhost
```

## Quy Trình Deploy Hoàn Chỉnh

### Bước 1: Deploy Core Contracts
```bash
# Deploy World và các components cơ bản
npx hardhat run script/deploy-all-contracts.js --network localhost
```

### Bước 2: Deploy Dungeon Contracts
```bash
# Deploy toàn bộ hệ thống Dungeon
npx hardhat run script/deploy-dungeon-contracts.js --network localhost
```

### Bước 3: Setup Sample Data
```bash
# Tạo dungeons mẫu và setup betting
npx hardhat run script/setup-sample-dungeons.js --network localhost
```

### Bước 4: Test Functions
```bash
# Test tất cả functions
npx hardhat run script/test-dungeon-functions.js --network localhost
```

## Cấu Trúc Contracts

### DungeonComponent
- **Chức năng**: Lưu trữ dữ liệu dungeons, sessions, player progress
- **Dependencies**: Không có
- **Storage**: dungeons, sessions, player progress

### DungeonProxy  
- **Chức năng**: Proxy pattern cho upgradeability
- **Dependencies**: World, DungeonComponent
- **Storage**: Delegate calls đến implementation

### DungeonLogic
- **Chức năng**: Business logic và tương tác với systems khác
- **Dependencies**: World, DungeonProxy, InventoryComponent, PlayerComponent
- **Functions**: createDungeon, startDungeon, endDungeon, claimRewards, etc.

## Deployment JSON Structure

```json
{
  "network": "localhost",
  "chainId": 31337,
  "deployer": "0x...",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "contracts": {
    "World": "0x...",
    "DungeonComponent": "0x...",
    "DungeonProxy": "0x...",
    "DungeonLogic": "0x...",
    "InventoryComponent": "0x...",
    "PlayerComponent": "0x..."
  }
}
```

## Sample Dungeons

### 1. Forest Dungeon (ID: 1)
- **Type**: Normal
- **Difficulty**: Easy
- **Level Req**: 5
- **Costs**: 10 energy, 100 sunlight, 50 sunny
- **Cooldown**: 1 hour
- **Stages**: 3 stages (0.2x, 0.3x, 0.5x multiplier)

### 2. Cave Dungeon (ID: 2)
- **Type**: Elite
- **Difficulty**: Medium
- **Level Req**: 10
- **Costs**: 20 energy, 200 sunlight, 100 sunny
- **Cooldown**: 2 hours
- **Stages**: 4 stages (0.3x, 0.4x, 0.6x, 0.8x multiplier)

### 3. Boss Dungeon (ID: 3)
- **Type**: Boss
- **Difficulty**: Expert
- **Level Req**: 20
- **Costs**: 50 energy, 500 sunlight, 250 sunny
- **Cooldown**: 4 hours
- **Stages**: 3 stages (0.5x, 0.7x, 1.0x multiplier)

## Betting Parameters

- **Min Bet**: 0.001 ETH
- **Max Bet**: 1.0 ETH
- **Reward Calculation**: `betReward = (betAmount * rewardMultiplier) / 10000`

## Troubleshooting

### Lỗi "DungeonLogic chưa được deploy"
- Chạy `deploy-dungeon-contracts.js` trước
- Kiểm tra deployment JSON file

### Lỗi "DungeonProxy chưa được deploy"
- Chạy `deploy-dungeon-contracts.js` trước
- Không chạy `deploy-dungeon-logic-only.js` trước

### Lỗi "Failed to register DungeonLogic"
- Kiểm tra World contract address
- Kiểm tra deployer có quyền admin không
- Kiểm tra network connection

### Lỗi "Not authorized as admin"
- Đảm bảo deployer address là admin trong World contract
- Kiểm tra private key đúng không

## Best Practices

### 1. Deploy Order
1. Deploy core contracts (World, Components)
2. Deploy Dungeon contracts
3. Setup sample data
4. Test functions
5. Deploy to mainnet

### 2. Testing
- Luôn test trên localhost trước
- Test tất cả functions trước khi deploy mainnet
- Verify contract addresses trong JSON file

### 3. Security
- Backup private keys
- Verify contract addresses
- Test emergency functions
- Monitor contract balances

### 4. Maintenance
- Update logic contracts khi cần
- Monitor dungeon performance
- Adjust betting parameters
- Add new dungeons

## Next Steps

Sau khi deploy thành công:

1. **Frontend Integration**
   - Update contract addresses
   - Implement dungeon UI
   - Add betting interface

2. **Game Balance**
   - Adjust dungeon difficulty
   - Tune reward multipliers
   - Balance betting parameters

3. **Monitoring**
   - Track dungeon usage
   - Monitor betting volume
   - Analyze player behavior

4. **Expansion**
   - Add new dungeon types
   - Implement seasonal events
   - Create special dungeons
