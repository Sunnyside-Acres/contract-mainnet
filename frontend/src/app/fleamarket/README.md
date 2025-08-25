# Flea Market - Trang Giao dịch Item

## Tổng quan

Trang Flea Market cho phép người chơi mua bán item với nhau thông qua smart contract. Đây là một tính năng P2P (peer-to-peer) trading trong game.

## Tính năng chính

### 1. Xem tất cả Listings

- Hiển thị tất cả item đang được bán trên thị trường
- Sắp xếp theo giá, thời gian, người bán
- Lọc theo item ID, giá, trạng thái
- Tìm kiếm listings

### 2. Đăng bán Item

- Chọn item từ inventory
- Đặt giá bán (Sunny)
- Chọn thời hạn listing (1h - 7 ngày)
- Item sẽ bị trừ khỏi inventory khi đăng bán

### 3. Mua Item

- Mua từ listing cụ thể
- Mua nhiều item cùng lúc (bulk purchase)
- Mua với giá tốt nhất (best price purchase)
- Tự động chuyển Sunny và item

### 4. Quản lý Listings

- Chỉnh sửa giá, số lượng, thời hạn
- Hủy listing (trả lại item vào inventory)
- Xem listings của riêng mình

### 5. Thống kê thị trường

- Tổng số listings
- Tổng giao dịch và khối lượng
- Số item duy nhất đang bán
- Giá trung bình

## Cấu trúc dữ liệu

### MarketListing

```typescript
interface MarketListing {
  id: number; // ID của listing
  seller: string; // Địa chỉ người bán
  itemId: number; // ID của item
  quantity: number; // Số lượng item
  price: number; // Giá bán (Sunny)
  listingTime: number; // Thời gian đăng bán
  expirationTime: number; // Thời gian hết hạn
  isActive: boolean; // Trạng thái hoạt động
  durability: number; // Độ bền của item
  expiration: number; // Hạn sử dụng của item
}
```

### MarketTransaction

```typescript
interface MarketTransaction {
  listingId: number; // ID của listing
  seller: string; // Người bán
  buyer: string; // Người mua
  itemId: number; // ID của item
  quantity: number; // Số lượng giao dịch
  price: number; // Giá giao dịch
  transactionTime: number; // Thời gian giao dịch
  durability: number; // Độ bền của item
  expiration: number; // Hạn sử dụng của item
}
```

## Smart Contract Functions

### Listing Operations

- `listItem(itemId, quantity, price, duration)` - Đăng bán item
- `updateListing(listingId, quantity, price, duration)` - Cập nhật listing
- `cancelListing(listingId)` - Hủy listing

### Purchase Operations

- `purchaseItem(listingId, quantity)` - Mua item từ listing cụ thể
- `purchaseMultipleItems(listingIds, quantities)` - Mua nhiều item
- `purchaseBestPrice(itemId, quantity)` - Mua với giá tốt nhất

### Query Functions

- `getActiveListings()` - Lấy tất cả listings đang hoạt động
- `getListingsByItem(itemId)` - Lấy listings theo item
- `getListingsBySeller(seller)` - Lấy listings theo người bán
- `getTransactionHistory(player)` - Lấy lịch sử giao dịch
- `getMarketStats()` - Lấy thống kê thị trường

## Luồng hoạt động

### Đăng bán Item

1. Người chơi chọn item từ inventory
2. Nhập giá và thời hạn
3. Smart contract kiểm tra đủ item trong inventory
4. Trừ item khỏi inventory ngay lập tức
5. Tạo listing với ID duy nhất
6. Emit event ItemListed

### Mua Item

1. Người chơi chọn listing muốn mua
2. Nhập số lượng muốn mua
3. Smart contract kiểm tra:
   - Listing còn hoạt động và chưa hết hạn
   - Đủ số lượng item
   - Không mua của chính mình
   - Đủ Sunny để mua
4. Trừ Sunny từ người mua, cộng cho người bán
5. Thêm item vào inventory người mua
6. Cập nhật listing (giảm số lượng hoặc hủy nếu hết)
7. Thêm vào lịch sử giao dịch
8. Emit event ItemPurchased

## Bảo mật

- Chỉ người bán mới có thể chỉnh sửa/hủy listing của mình
- Item bị lock trong inventory khi đăng bán
- Kiểm tra đủ Sunny trước khi mua
- Không thể mua item của chính mình
- Thời hạn listing tối đa 7 ngày

## UI Components

- **FleaMarketManager**: Component chính quản lý toàn bộ trang
- **Tabs**: Chuyển đổi giữa các view (Tất cả listings, Listings của tôi, Lịch sử giao dịch)
- **DataTable**: Hiển thị danh sách listings với sorting, filtering, pagination
- **Dialogs**: Form đăng bán, mua, chỉnh sửa listing
- **Cards**: Hiển thị thống kê thị trường

## Context và State Management

- **FleaMarketContext**: Quản lý state và operations cho flea market
- **useFleaMarketContext**: Hook để truy cập context
- **Real-time updates**: Tự động refresh data sau mỗi transaction
