# Dungeon Betting System Update

## Tổng Quan Thay Đổi

Đã cập nhật hệ thống Dungeon để **min/max bet amounts được lưu trữ trong từng dungeon** thay vì global settings. Điều này cho phép mỗi dungeon có betting parameters riêng biệt, linh hoạt hơn.

## 🔄 **Thay Đổi Chính**

### **1. Dungeon Struct Update**
```solidity
struct Dungeon {
    // ... existing fields ...
    uint256 minBetAmount; /// Số tiền bet tối thiểu (wei)
    uint256 maxBetAmount; /// Số tiền bet tối đa (wei)
    // ... other fields ...
}
```

### **2. DungeonComponent Update**
- **createDungeon()** function thêm 2 parameters:
  - `uint256 _minBetAmount`
  - `uint256 _maxBetAmount`
- **Validation** cho min/max bet amounts
- **Storage** min/max bet trong dungeon struct

### **3. DungeonLogic Update**
- **Xóa global min/max bet variables**
- **Xóa setMinMaxBetAmount() function**
- **Xóa getMinMaxBetAmount() function**
- **startDungeon()** sử dụng dungeon.minBetAmount và dungeon.maxBetAmount
- **createDungeon()** thêm min/max bet parameters

## 🎯 **Lợi Ích**

### **1. Flexibility**
- Mỗi dungeon có betting range riêng
- Easy dungeons: thấp min/max bet
- Boss dungeons: cao min/max bet
- Event dungeons: special betting ranges

### **2. Game Balance**
- **Forest Dungeon (Easy)**: 0.001 - 0.1 ETH
- **Cave Dungeon (Medium)**: 0.01 - 0.5 ETH  
- **Boss Dungeon (Expert)**: 0.1 - 1.0 ETH

### **3. Better UX**
- Players chọn dungeon phù hợp với budget
- Clear betting expectations per dungeon
- Progressive difficulty = progressive betting

## 📋 **Sample Dungeons**

### **Forest Dungeon (ID: 1)**
```javascript
{
  name: "Forest Dungeon",
  type: "Normal",
  difficulty: "Easy", 
  levelRequirement: 5,
  minBetAmount: "0.001 ETH",
  maxBetAmount: "0.1 ETH",
  stages: [
    { stage: 1, multiplier: 0.2x },
    { stage: 2, multiplier: 0.3x },
    { stage: 3, multiplier: 0.5x }
  ]
}
```

### **Cave Dungeon (ID: 2)**
```javascript
{
  name: "Cave Dungeon", 
  type: "Elite",
  difficulty: "Medium",
  levelRequirement: 10,
  minBetAmount: "0.01 ETH",
  maxBetAmount: "0.5 ETH",
  stages: [
    { stage: 1, multiplier: 0.3x },
    { stage: 2, multiplier: 0.4x },
    { stage: 3, multiplier: 0.6x },
    { stage: 4, multiplier: 0.8x }
  ]
}
```

### **Boss Dungeon (ID: 3)**
```javascript
{
  name: "Boss Dungeon",
  type: "Boss", 
  difficulty: "Expert",
  levelRequirement: 20,
  minBetAmount: "0.1 ETH",
  maxBetAmount: "1.0 ETH",
  stages: [
    { stage: 1, multiplier: 0.5x },
    { stage: 2, multiplier: 0.7x },
    { stage: 3, multiplier: 1.0x }
  ]
}
```

## 🔧 **Code Changes**

### **DungeonComponent.sol**
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
    uint256 _cooldownTime,
    uint256 _minBetAmount,        // NEW
    uint256 _maxBetAmount         // NEW
) external onlyAuthorized returns (uint256)
```

### **DungeonLogic.sol**
```solidity
// REMOVED: Global betting variables
// uint256 public minBetAmount;
// uint256 public maxBetAmount;

// REMOVED: Global betting functions
// function setMinMaxBetAmount(...)
// function getMinMaxBetAmount(...)

// UPDATED: startDungeon uses dungeon betting
require(_betAmount >= dungeon.minBetAmount, "Bet amount below minimum");
require(_betAmount <= dungeon.maxBetAmount, "Bet amount exceeds maximum");
```

## 📝 **Script Updates**

### **setup-sample-dungeons.js**
```javascript
const sampleDungeons = [
  {
    id: 1,
    name: "Forest Dungeon",
    minBetAmount: ethers.parseEther("0.001"), // 0.001 ETH
    maxBetAmount: ethers.parseEther("0.1"),   // 0.1 ETH
    // ... other properties
  },
  {
    id: 2, 
    name: "Cave Dungeon",
    minBetAmount: ethers.parseEther("0.01"),  // 0.01 ETH
    maxBetAmount: ethers.parseEther("0.5"),   // 0.5 ETH
    // ... other properties
  },
  {
    id: 3,
    name: "Boss Dungeon", 
    minBetAmount: ethers.parseEther("0.1"),   // 0.1 ETH
    maxBetAmount: ethers.parseEther("1.0"),    // 1.0 ETH
    // ... other properties
  }
];
```

### **test-dungeon-functions.js**
```javascript
// UPDATED: Test dungeon creation with betting
const createTx = await dungeonLogic.createDungeon(
  testDungeonId,
  testDungeonName,
  testDescription,
  0, // Normal type
  0, // Easy difficulty
  1, // Level requirement
  5, // Energy cost
  50, // Sunlight cost
  25, // Sunny cost
  [], // No item requirements
  1800, // 30 minutes cooldown
  ethers.parseEther("0.001"), // Min bet: 0.001 ETH
  ethers.parseEther("0.01")   // Max bet: 0.01 ETH
);
```

## 🚀 **Deployment Process**

### **1. Deploy Contracts**
```bash
npx hardhat run script/deploy-dungeon-contracts.js --network localhost
```

### **2. Setup Sample Dungeons**
```bash
npx hardhat run script/setup-sample-dungeons.js --network localhost
```

### **3. Test Functions**
```bash
npx hardhat run script/test-dungeon-functions.js --network localhost
```

## 🎮 **Game Design Impact**

### **1. Player Progression**
- **New Players**: Start with Forest Dungeon (low betting)
- **Intermediate**: Move to Cave Dungeon (medium betting)
- **Advanced**: Challenge Boss Dungeon (high betting)

### **2. Economic Balance**
- **Risk/Reward**: Higher betting = higher rewards
- **Accessibility**: Multiple betting tiers
- **Retention**: Progressive difficulty system

### **3. Monetization**
- **Low-tier dungeons**: Attract casual players
- **High-tier dungeons**: Attract whales
- **Balanced economy**: Multiple player segments

## 🔍 **Testing Checklist**

### **✅ Contract Functions**
- [ ] createDungeon with min/max bet
- [ ] startDungeon with bet validation
- [ ] getDungeon returns betting info
- [ ] Validation works correctly

### **✅ Script Functions**
- [ ] setup-sample-dungeons.js works
- [ ] test-dungeon-functions.js passes
- [ ] All dungeons created successfully
- [ ] Betting parameters set correctly

### **✅ Integration**
- [ ] Frontend can read dungeon betting
- [ ] UI shows betting ranges per dungeon
- [ ] Players can bet within ranges
- [ ] Error handling for invalid bets

## 🔮 **Future Enhancements**

### **1. Dynamic Betting**
- Betting ranges change based on events
- Seasonal betting multipliers
- VIP betting tiers

### **2. Advanced Features**
- Betting history per dungeon
- Betting analytics
- Auto-adjusting betting ranges

### **3. Integration**
- Leaderboards with betting tiers
- Achievement systems
- Social features

## 📊 **Summary**

Việc chuyển min/max bet amounts vào Dungeon struct mang lại:

- ✅ **Flexibility**: Mỗi dungeon có betting riêng
- ✅ **Balance**: Progressive difficulty system  
- ✅ **UX**: Clear expectations per dungeon
- ✅ **Economy**: Multiple player segments
- ✅ **Scalability**: Easy to add new dungeons

Hệ thống mới linh hoạt hơn, cân bằng hơn và dễ mở rộng hơn so với global betting system trước đây!
