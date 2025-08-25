# Crafting System

Hệ thống Crafting cho phép người chơi tạo ra các item từ nguyên liệu thông qua các công thức crafting.

## Tính năng

### 1. Quản lý Công thức (Admin)

- **Tạo công thức mới**: Định nghĩa item kết quả, nguyên liệu cần thiết, chi phí và tỉ lệ thành công
- **Cập nhật công thức**: Thay đổi thông tin của công thức hiện có
- **Bật/tắt công thức**: Kích hoạt hoặc vô hiệu hóa công thức
- **Xóa công thức**: Xóa công thức khỏi hệ thống

### 2. Crafting (Người chơi)

- **Craft item**: Thực hiện crafting với tỉ lệ thành công
- **Kiểm tra điều kiện**: Xem xét level, tài nguyên và nguyên liệu
- **Lịch sử crafting**: Theo dõi các lần craft đã thực hiện

### 3. Thống kê

- **Thống kê cá nhân**: Tỉ lệ thành công, số lần craft
- **Thống kê hệ thống**: Tổng số công thức, số lần craft toàn hệ thống

## Cấu trúc Dữ liệu

### CraftingRecipe

```typescript
interface CraftingRecipe {
  id: number; // ID công thức
  resultItemId: number; // ID item kết quả
  resultQuantity: number; // Số lượng item kết quả
  successRate: number; // Tỉ lệ thành công (0-10000)
  sunlightCost: number; // Chi phí sunlight
  sunnyCost: number; // Chi phí sunny
  ingredients: CraftingIngredient[]; // Danh sách nguyên liệu
  isActive: boolean; // Trạng thái hoạt động
  minPlayerLevel: number; // Level tối thiểu
}
```

### CraftingIngredient

```typescript
interface CraftingIngredient {
  itemId: number; // ID item nguyên liệu
  quantity: number; // Số lượng cần thiết
}
```

## Sử dụng

### 1. Deploy Contracts

```bash
# Deploy tất cả contracts (bao gồm Crafting)
npx hardhat run script/deploy-local.js --network localhost

# Hoặc deploy riêng crafting
npx hardhat run script/deploy-new-contracts.js --network localhost
```

### 2. Tạo Công thức Mẫu

```bash
# Tạo các công thức crafting mẫu để test
npx hardhat run script/create-sample-recipes.js --network localhost
```

### 3. Sử dụng Frontend

1. Truy cập `/crafting` trong frontend
2. Kết nối wallet
3. Xem danh sách công thức
4. Thực hiện crafting hoặc quản lý (nếu là admin)

## API Functions

### Admin Functions

- `createRecipe()` - Tạo công thức mới
- `updateRecipe()` - Cập nhật công thức
- `setRecipeActive()` - Bật/tắt công thức
- `deleteRecipe()` - Xóa công thức

### Player Functions

- `craftItem()` - Thực hiện crafting
- `canCraftRecipe()` - Kiểm tra điều kiện crafting

### View Functions

- `getAllRecipes()` - Lấy tất cả công thức
- `getActiveRecipes()` - Lấy công thức đang hoạt động
- `getPlayerCraftingHistory()` - Lấy lịch sử crafting
- `getPlayerCraftingStats()` - Lấy thống kê crafting
- `getAvailableRecipesForPlayer()` - Lấy công thức có thể craft

## Events

- `RecipeCreated` - Công thức được tạo
- `RecipeUpdated` - Công thức được cập nhật
- `RecipeDeleted` - Công thức bị xóa
- `RecipeStatusChanged` - Trạng thái công thức thay đổi
- `CraftingCompleted` - Hoàn thành crafting

## Lưu ý

1. **Tỉ lệ thành công**: Được tính từ 0-10000 (10000 = 100%)
2. **Chi phí**: Sunlight và Sunny sẽ bị trừ khi craft
3. **Nguyên liệu**: Sẽ bị trừ khỏi inventory khi craft
4. **Level yêu cầu**: Người chơi phải đạt level tối thiểu để craft
5. **Random**: Kết quả crafting dựa trên random number từ blockchain

## Troubleshooting

### Lỗi thường gặp

1. **"Not enough sunlight/sunny"**: Không đủ tài nguyên
2. **"Not enough ingredients"**: Không đủ nguyên liệu trong inventory
3. **"Player level too low"**: Level người chơi chưa đủ
4. **"Recipe is not active"**: Công thức đã bị vô hiệu hóa

### Debug

- Kiểm tra console log trong browser
- Xem transaction hash trên blockchain explorer
- Kiểm tra contract addresses trong `deployed/` folder
