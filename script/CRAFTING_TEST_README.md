# Crafting System Test Script

Script test chi tiết cho CraftingLogic contract với ví thật.

## 📋 Mô tả

Script `test-crafting-logic.js` kiểm tra toàn bộ chức năng của hệ thống Crafting bao gồm:

1. ✅ Tạo items test
2. ✅ Tạo crafting recipes
3. ✅ Khởi tạo players với resources
4. ✅ Kiểm tra khả năng craft
5. ✅ Thực hiện crafting
6. ✅ Kiểm tra crafting history
7. ✅ Kiểm tra crafting statistics
8. ✅ Nhiều lần craft liên tiếp
9. ✅ Kiểm tra system statistics
10. ✅ Lấy active recipes

## 🚀 Cách sử dụng

### Bước 1: Chuẩn bị

Đảm bảo rằng tất cả contracts cần thiết đã được deploy:

- World
- ItemProxy & ItemLogic
- InventoryProxy & InventoryLogic
- PlayerProxy & PlayerLogic
- CraftingProxy & CraftingLogic

### Bước 2: Chạy script

```bash
# Test trên mainnet
npx hardhat run script/test-crafting-logic.js --network seimainnet

# Test trên localhost
npx hardhat run script/test-crafting-logic.js --network local
```

## 🧪 Test Cases

### 1. Create Test Items

Tạo các items test:

- **Item 1000**: Iron Ore (Material, Common)
- **Item 1001**: Wood (Material, Common)
- **Item 2000**: Iron Sword (Weapon, Uncommon)

### 2. Create Crafting Recipe

Tạo recipe craft Iron Sword:

- **Result**: Iron Sword (ID: 2000, Quantity: 1)
- **Ingredients**:
  - Iron Ore: 5 pieces
  - Wood: 3 pieces
- **Success Rate**: 20%
- **Costs**:
  - Sunlight: 100
  - Sunny: 50
- **Min Level**: 1

### 3. Initialize Player

Khởi tạo player với:

- Level: 1
- Sunlight: 1000
- Sunny: 500
- Ingredients trong inventory

### 4. Can Craft Check

Kiểm tra xem player có thể craft không.

### 5. Craft Item

Player craft với range 0-19 (20% success rate).

- Random number được generate (0-99)
- Success nếu random number nằm trong range
- Nguyên liệu bị trừ dù success hay fail

### 6. Crafting History

Lấy lịch sử crafting của player.

### 7. Crafting Statistics

Lấy thống kê:

- Total crafts
- Successful crafts
- Success rate (%)

### 8. Multiple Attempts

Thực hiện 5 lần craft liên tiếp để test:

- Multiple transactions
- Success rate tính toán đúng
- Resource management

### 9. System Statistics

Lấy thống kê system:

- Total recipes
- Active recipes

### 10. Active Recipes

Lấy danh sách active recipes.

## 📊 Expected Results

### Success Case

```
✅ Tạo items thành công
✅ Tạo recipe thành công
✅ Khởi tạo player thành công
✅ Can craft: YES
✅ Crafting attempt completed
✅ History được ghi nhận
✅ Stats tính toán đúng
✅ Multiple attempts hoạt động
✅ System stats hiển thị đúng
```

### Failed Case

Nếu crafting fail:

- ✅ Nguyên liệu vẫn bị trừ
- ✅ Không nhận được item
- ✅ History ghi lại fail
- ✅ Stats cập nhật đúng

## 🔧 Crafting Mechanics

### Range System

Player chọn range để craft:

- **Range 0-19**: 20% success rate (20 numbers)
- **Range 80-30**: 20% success rate (wrap-around: 80-99 + 0-30 = 21 numbers)

### Random Number Generation

Random number được generate từ:

```javascript
keccak256(
  abi.encodePacked(
    msg.sender,
    block.number,
    blockhash(block.number - 1),
    gasleft()
  )
) % 100;
```

### Success/Fail

- **Success**: Random number nằm trong range → Nhận item
- **Fail**: Random number ngoài range → Không nhận item
- **Nguyên liệu**: Luôn bị trừ dù success hay fail

## ⚠️ Lưu ý quan trọng

### Gas Cost

- Mỗi crafting attempt: ~500k-800k gas
- Batch crafting sẽ tốn nhiều gas
- Kiểm tra balance trước khi test

### Network Requirements

- Cần deploy contracts trước
- File deployment phải tồn tại: `./deployed/contract-addresses-{network}.json`
- Cần quyền admin để tạo items

### Dependencies

- World contract để access control
- Item contracts để tạo items
- Inventory contracts để quản lý items
- Player contracts để quản lý player

## 🔧 Troubleshooting

### Lỗi thường gặp

1. **"CraftingLogic not found in deployment file"**

   - Đảm bảo đã deploy Crafting contracts
   - Kiểm tra file deployment có đúng network không

2. **"Not authorized as admin"**

   - Cần deploy contracts với địa chỉ admin
   - Hoặc thêm địa chỉ vào admin list

3. **"Not enough ingredients"**

   - Kiểm tra inventory có đủ nguyên liệu không
   - Mỗi craft cần đúng số lượng ingredients

4. **"Range size must match success rate"**

   - Range size phải = success rate
   - VD: 20% success rate → range size = 20

5. **"Player not initialized"**
   - Cần tạo player trước khi craft
   - Gọi createPlayer() hoặc initializePlayer()

### Debug Tips

```bash
# Kiểm tra deployment info
cat ./deployed/contract-addresses-seimainnet.json

# Kiểm tra balance
npx hardhat run --network seimainnet -e "console.log(await ethers.provider.getBalance('YOUR_ADDRESS'))"

# Test với localhost trước
npx hardhat run script/test-crafting-logic.js --network local
```

## 📈 Performance

### Gas Cost

- **Create Items**: ~200k gas/item
- **Create Recipe**: ~150k gas
- **Craft Attempt**: ~500k-800k gas/craft
- **View Functions**: Free (no gas)

### Execution Time

- **Localhost**: ~30-60s cho toàn bộ tests
- **Mainnet**: ~2-5 phút (tùy network)

## 📝 Cải tiến có thể

1. ✅ Thêm test cho wrap-around ranges (80-30)
2. ✅ Thêm test cho recipe inactive
3. ✅ Thêm test cho insufficient resources
4. ✅ Thêm test cho update/delete recipes
5. ✅ Thêm test cho multiple recipes

## 🎯 Kết luận

Script này cung cấp test coverage đầy đủ cho CraftingLogic contract, giúp:

- Verify functionality hoạt động đúng
- Test edge cases và error handling
- Monitor gas consumption
- Validate business logic

---

**Tác giả**: RYG.Labs  
**Ngày tạo**: 2025-01-17  
**Version**: 1.0
