# NPCMarketNative - Hệ thống mua bán NPC sử dụng Native Token (ETH)

## Tổng quan

NPCMarketNative là một hệ thống mua bán hoàn toàn mới sử dụng native token (ETH) thay vì sunlight như NPCMarket gốc. Hệ thống này được thiết kế dựa trên cách xử lý native token trong DungeonLogic và được đặt trong folder riêng biệt `npcmarketnative`.

## Cấu trúc Files

### 1. Structs

- **`contracts/struct/NPCMarketNative.sol`**: Định nghĩa các struct cho hệ thống NPCMarketNative
  - `MarketItem`: Thông tin item trong market
  - `MarketItemView`: View struct cho MarketItem (không có mapping)
  - `NPCMarket`: Thông tin market của NPC
  - `TransactionRecord`: Ghi lại giao dịch
  - `MarketStats`: Thống kê market
  - `UserMarketStats`: Thống kê user trong market

### 2. Interface

- **`contracts/interfaces/INPCMarketNative.sol`**: Interface định nghĩa các function cho NPCMarketNative

### 3. NPCMarketNative Folder

- **`contracts/game/npcmarketnative/NPCMarketNativeComponent.sol`**: Component quản lý data và storage
- **`contracts/game/npcmarketnative/NPCMarketNativeLogic.sol`**: Logic contract xử lý business logic
- **`contracts/game/npcmarketnative/NPCMarketNativeProxy.sol`**: Proxy contract sử dụng delegatecall pattern

## Tính năng chính

### 1. Mua bán bằng ETH

- **Mua từ NPC**: Người chơi gửi ETH để mua item từ NPC
- **Bán cho NPC**: Người chơi bán item cho NPC và nhận ETH
- **Tự động hoàn tiền**: Nếu gửi thừa ETH, hệ thống sẽ hoàn lại

### 2. Quản lý Market

- **Tạo market**: Admin tạo market cho NPC với min/max transaction amount
- **Thêm item**: Admin thêm item vào market với giá bằng wei
- **Cập nhật giá**: Admin có thể cập nhật giá và giới hạn mua
- **Xóa item**: Admin có thể xóa item khỏi market

### 3. Giới hạn giao dịch

- **Giới hạn per user**: Mỗi user chỉ có thể mua/bán một số lượng nhất định
- **Min/Max transaction**: Mỗi giao dịch phải nằm trong khoảng min-max
- **Reset giới hạn**: Admin có thể reset giới hạn mua của user

### 4. Thống kê và theo dõi

- **Transaction history**: Ghi lại tất cả giao dịch
- **Market stats**: Thống kê tổng quan của market
- **User stats**: Thống kê giao dịch của từng user

### 5. Bảo mật

- **Reentrancy protection**: Bảo vệ khỏi reentrancy attack
- **Access control**: Chỉ admin và logic contract được phép truy cập
- **Emergency withdrawal**: Admin có thể rút ETH khẩn cấp

## Cách sử dụng

### 1. Tạo Market (Admin)

```solidity
// Tạo market cho NPC với min 0.001 ETH, max 10 ETH
npcMarketLogic.createNPCMarket(
    1, // npcId
    "Blacksmith", // name
    0.001 ether, // minTransactionAmount
    10 ether // maxTransactionAmount
);
```

### 2. Thêm Item vào Market (Admin)

```solidity
// Thêm sword với giá 0.1 ETH, giới hạn 5 cái/user
npcMarketLogic.addItemToMarket(
    1, // npcId
    101, // itemId (sword)
    5, // limitPerUser
    0.1 ether, // pricePerUnit
    true // isSelling (NPC bán)
);
```

### 3. Mua Item từ NPC (Player)

```solidity
// Mua 2 sword với giá 0.2 ETH
npcMarketLogic.buyItemFromNPC{value: 0.2 ether}(
    1, // npcId
    101, // itemId
    2 // quantity
);
```

### 4. Bán Item cho NPC (Player)

```solidity
// Bán 1 sword cho NPC, nhận 0.1 ETH
npcMarketLogic.sellItemToNPC(
    1, // npcId
    101, // itemId
    1 // quantity
);
```

## So sánh với NPCMarket gốc

| Tính năng  | NPCMarket (Gốc)        | NPCMarketNative (Mới)                |
| ---------- | ---------------------- | ------------------------------------ |
| Currency   | Sunlight               | ETH (Native Token)                   |
| Payment    | Trừ sunlight từ player | Gửi ETH trực tiếp                    |
| Refund     | Không có               | Tự động hoàn tiền thừa               |
| Min/Max    | Không có               | Có giới hạn min/max transaction      |
| Emergency  | Không có               | Có emergency withdrawal              |
| Statistics | Cơ bản                 | Chi tiết hơn với transaction history |
| Folder     | `npcmarket`            | `npcmarketnative`                    |

## Lưu ý quan trọng

1. **ETH Balance**: Contract cần có đủ ETH để mua item từ player
2. **Gas Fees**: Mỗi giao dịch cần trả gas fee
3. **Price Precision**: Giá được tính bằng wei (1 ETH = 10^18 wei)
4. **Refund**: Nếu gửi thừa ETH, hệ thống sẽ hoàn lại tự động
5. **Emergency**: Admin có thể rút toàn bộ ETH trong contract nếu cần

## Deploy và Setup

1. Deploy NPCMarketNativeComponent
2. Deploy NPCMarketNativeLogic với các dependencies
3. Deploy NPCMarketNativeProxy
4. Register logic contract trong World
5. Fund contract với ETH để mua item từ player

## Events quan trọng

- `ItemPurchasedWithETH`: Khi player mua item bằng ETH
- `ItemSoldForETH`: Khi player bán item cho ETH
- `EmergencyWithdraw`: Khi admin rút ETH khẩn cấp
- `TransactionRecorded`: Khi ghi lại giao dịch

## Cấu trúc Folder

```
contracts/
├── struct/
│   └── NPCMarketNative.sol
├── interfaces/
│   └── INPCMarketNative.sol
└── game/
    ├── npcmarket/          # NPCMarket gốc (sunlight)
    │   ├── NPCMarketLogic.sol
    │   ├── NPCMarketComponent.sol
    │   └── NPCMarketProxy.sol
    └── npcmarketnative/    # NPCMarketNative mới (ETH)
        ├── NPCMarketNativeLogic.sol
        ├── NPCMarketNativeComponent.sol
        └── NPCMarketNativeProxy.sol
```

Hệ thống NPCMarketNative cung cấp một trải nghiệm mua bán hoàn toàn mới với native token, mang lại tính linh hoạt và minh bạch hơn cho người chơi! 🎮✨
