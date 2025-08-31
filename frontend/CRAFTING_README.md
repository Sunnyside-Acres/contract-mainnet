# Crafting Frontend

Frontend cho hệ thống Crafting trong game Sunnyside Acres.

## Tính năng

### 1. Quản lý Crafting Recipes (`/crafting`)

- **Xem danh sách recipes**: Hiển thị tất cả công thức crafting với thông tin chi tiết
- **Filter và Search**: Lọc theo trạng thái (active/inactive), tìm kiếm theo ID
- **Pagination**: Phân trang với 10 recipes mỗi trang
- **Craft Item**: Người chơi có thể craft item từ recipe
- **Bulk Actions**: Kích hoạt/vô hiệu hóa nhiều recipes cùng lúc
- **Recipe Details**: Xem chi tiết nguyên liệu, chi phí, tỉ lệ thành công
- **Create Recipe**: Tạo recipe mới với dialog form (admin only)
- **Edit Recipe**: Chỉnh sửa recipe hiện có (admin only)
- **Delete Recipe**: Xóa recipe (admin only)

## Cấu trúc Files

```
frontend/src/
├── types/
│   └── crafting.type.ts          # Type definitions cho crafting
├── context/
│   └── CraftingContext.tsx       # Context quản lý state crafting
├── views/crafting/
│   └── CraftingManager.tsx       # Component chính quản lý recipes
└── app/crafting/
    └── page.tsx                  # Trang chính crafting
```

## Cách sử dụng

### 1. Kết nối ví

- Kết nối MetaMask wallet
- Chọn network phù hợp (Sei Mainnet)

### 2. Xem Recipes

- Truy cập `/crafting`
- Xem danh sách tất cả recipes
- Sử dụng filter để lọc recipes
- Click vào recipe để xem chi tiết

### 3. Craft Item

- Trong danh sách recipes, click "Craft Item"
- Hệ thống sẽ kiểm tra:
  - Level người chơi
  - Nguyên liệu trong inventory
  - Sunlight và Sunny
- Xác nhận transaction trên MetaMask

### 4. Quản lý Recipes (Admin)

- **Tạo Recipe**: Click "Create Recipe" → Điền form → Submit
- **Edit Recipe**: Click "Edit Recipe" → Chỉnh sửa → Update
- **Delete Recipe**: Click "Delete Recipe" → Xác nhận
- **Bulk Actions**: Chọn nhiều recipes → Activate/Deactivate/Delete

## API Functions

### CraftingContext

- `loadRecipesFromContract()`: Tải recipes từ contract
- `applyFiltersAndPagination()`: Áp dụng filter và pagination
- `craftItem(recipeId)`: Craft item từ recipe
- `getPlayerHistory(playerAddress)`: Lấy lịch sử crafting

### Contract Functions

- `getAllRecipes()`: Lấy tất cả recipes
- `getActiveRecipes()`: Lấy recipes đang active
- `craftItem(recipeId)`: Craft item

## Dependencies

- **React**: UI framework
- **Ethers.js**: Ethereum interaction
- **TanStack Table**: Data table component
- **Lucide React**: Icons
- **Tailwind CSS**: Styling

## Contract Integration

Frontend kết nối với các smart contracts:

- `CraftingLogic`: Logic chính cho crafting
- `CraftingComponent`: Storage cho recipes
- `ItemComponent`: Quản lý items
- `InventoryComponent`: Quản lý inventory
- `PlayerComponent`: Thông tin người chơi

## Error Handling

- **Wallet Connection**: Hiển thị thông báo khi chưa kết nối ví
- **Contract Errors**: Hiển thị lỗi từ smart contract
- **Network Issues**: Thông báo lỗi network
- **Loading States**: Hiển thị loading khi đang tải dữ liệu

## Future Enhancements

- [x] Tạo recipe mới (admin only)
- [x] Edit recipe (admin only)
- [x] Delete recipe (admin only)
- [ ] Advanced filters (level range, cost range)
- [ ] Recipe favorites
- [ ] Crafting queue
- [ ] Batch crafting
- [ ] Recipe sharing
- [ ] Crafting statistics dashboard
