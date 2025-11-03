# NPCMarketNative Deployment Guide

Hướng dẫn deploy và setup hệ thống NPC Market Native (ETH).

## 📋 Tổng quan

NPCMarketNative là hệ thống cho phép players **BÁN** items cho NPCs bằng native token (ETH). Đặc điểm:
- **SELL ONLY** - Chỉ hỗ trợ bán items cho NPCs
- **ETH proceeds** - Tiền từ bán items sẽ được chuyển trực tiếp đến **Treasury Wallet**
- **No buying** - NPCs không bán items cho players

## 🏗️ Cấu trúc Contracts

1. **NPCMarketNativeComponent**: Component contract quản lý storage
2. **NPCMarketNativeProxy**: Proxy contract sử dụng delegatecall pattern
3. **NPCMarketNativeLogic**: Logic contract chứa business logic

## 📦 Prerequisites

Trước khi deploy NPCMarketNative, cần deploy các contracts sau:
- ✅ World
- ✅ ItemProxy/ItemLogic
- ✅ InventoryProxy/InventoryLogic
- ✅ PlayerProxy/PlayerLogic

## 🚀 Deployment Steps

### Bước 1: Deploy NPCMarketNative Contracts

```bash
npx hardhat run script/deploy-npcmarketnative-contracts.js --network <network>
```

**Environment Variables (Optional):**
- `TREASURY_WALLET`: Địa chỉ ví nhận ETH từ sales (default: deployer address)

**Output:**
- `./deployed/npcmarketnative-deployment-<network>.json` - File chứa deployment info
- `./deployed/contract-addresses-<network>.json` - File chính được update

**Contracts Deployed:**
- NPCMarketNativeComponent
- NPCMarketNativeProxy
- NPCMarketNativeLogic

**Auto Steps:**
1. Deploy Component
2. Deploy Proxy (với Component address)
3. Deploy Logic (với Proxy address và dependencies)
4. Upgrade Proxy (trỏ đến Logic)
5. Register Logic trong World

### Bước 2: Setup Sample NPC Markets (Optional)

```bash
npx hardhat run script/setup-npcmarketnative-sample.js --network <network>
```

Tạo sample NPC markets với items để test.

**Output:**
- `./deployed/npcmarketnative-setup-<network>.json` - File chứa setup info

### Bước 3: Fund Proxy Contract

**QUAN TRỌNG**: Proxy contract cần có ETH balance để trả cho treasury wallet khi players bán items.

```bash
# Send ETH to Proxy address
# Lấy address từ deployment file
```

### Bước 4: Test Functions (Optional)

```bash
npx hardhat run script/test-npcmarketnative.js --network <network>
```

Test các functions cơ bản của system.

## 📝 Manual Setup (Nếu không dùng sample)

### Tạo NPC Market

```javascript
const npcMarketNativeLogic = await ethers.getContractAt(
  "NPCMarketNativeLogic",
  "<NPCMarketNativeLogic_Address>"
);

await npcMarketNativeLogic.createNPCMarket(
  1, // npcId
  "General Store", // name
  ethers.parseEther("0.001"), // minTransactionAmount
  ethers.parseEther("10") // maxTransactionAmount
);
```

### Thêm Item vào Market

```javascript
await npcMarketNativeLogic.addItemToMarket(
  1, // npcId
  1, // itemId
  100, // limitPerUser (0 = unlimited)
  ethers.parseEther("0.01"), // pricePerUnit (wei)
  false // isSelling (MUST be false - NPC is buying from player)
);
```

**Lưu ý**: `isSelling` parameter **phải là `false`** vì system chỉ hỗ trợ SELL.

## 🔧 Configuration

### Set Treasury Wallet

```javascript
await npcMarketNativeLogic.setTreasuryWallet(
  "<treasury_wallet_address>"
);
```

### Market Management

- `setMarketActive(npcId, isActive)` - Bật/tắt market
- `updateItemInMarket(npcId, itemId, limitPerUser, pricePerUnit)` - Update item price/limit
- `removeItemFromMarket(npcId, itemId)` - Xóa item khỏi market

## 🎮 Usage

### Players Sell Items to NPC

```javascript
const npcMarketNativeLogic = await ethers.getContractAt(
  "NPCMarketNativeLogic",
  "<NPCMarketNativeLogic_Address>"
);

await npcMarketNativeLogic.sellItemToNPC(
  1, // npcId
  1, // itemId
  10 // quantity
);
```

**Flow:**
1. Player gọi `sellItemToNPC()`
2. System validate: player exists, item exists, market open, enough balance
3. Remove item từ player inventory
4. Calculate total price
5. Transfer ETH từ contract balance đến treasury wallet
6. Record transaction
7. Emit event

## ⚠️ Important Notes

1. **Contract Balance**: Proxy contract phải có đủ ETH balance để trả cho treasury wallet khi players bán items. Cần fund contract trước.

2. **Treasury Wallet**: Đảm bảo treasury wallet address được set đúng và có thể nhận ETH.

3. **isSelling Parameter**: Khi thêm item vào market, `isSelling` parameter **phải là `false`** (NPC is buying from player).

4. **Balance Check**: System sẽ check contract balance trước khi transfer ETH đến treasury wallet.

5. **Reentrancy Protection**: Tất cả external functions có reentrancy protection.

## 📊 Contract Addresses

Sau khi deploy, các addresses được lưu trong:
- `./deployed/npcmarketnative-deployment-<network>.json`
- `./deployed/contract-addresses-<network>.json`

## 🐛 Troubleshooting

### Error: "Insufficient contract balance"
**Solution**: Fund proxy contract với ETH.

### Error: "Treasury wallet not set"
**Solution**: Set treasury wallet bằng `setTreasuryWallet()`.

### Error: "System only supports SELL - NPC must be buying"
**Solution**: `isSelling` parameter phải là `false` khi thêm item.

### Error: "Market is closed"
**Solution**: Active market bằng `setMarketActive(npcId, true)`.

## 📚 Functions Reference

### Admin Functions
- `createNPCMarket(npcId, name, minAmount, maxAmount)`
- `addItemToMarket(npcId, itemId, limitPerUser, pricePerUnit, isSelling)`
- `updateItemInMarket(npcId, itemId, limitPerUser, pricePerUnit)`
- `removeItemFromMarket(npcId, itemId)`
- `setMarketActive(npcId, isActive)`
- `setTreasuryWallet(treasuryWallet)`

### Public Functions
- `sellItemToNPC(npcId, itemId, quantity)` - **Main function**
- `getNPCMarketInfo(npcId)`
- `getMarketItem(npcId, itemId)`
- `getAllMarketItems(npcId)`
- `calculateSellPrice(npcId, itemId, quantity)`
- `canPlayerSellItem(player, npcId, itemId, quantity)`
- `getContractBalance()`

## ✅ Checklist

- [ ] Deploy NPCMarketNative contracts
- [ ] Set treasury wallet
- [ ] Fund proxy contract với ETH
- [ ] Create NPC markets
- [ ] Add items to markets (isSelling = false)
- [ ] Test sellItemToNPC function
- [ ] Verify ETH transferred to treasury wallet

## 🔗 Related Files

- `contracts/game/npcmarketnative/NPCMarketNativeComponent.sol`
- `contracts/game/npcmarketnative/NPCMarketNativeProxy.sol`
- `contracts/game/npcmarketnative/NPCMarketNativeLogic.sol`
- `script/deploy-npcmarketnative-contracts.js`
- `script/setup-npcmarketnative-sample.js`
- `script/test-npcmarketnative.js`

