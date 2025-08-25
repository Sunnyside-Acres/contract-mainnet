# 📦 Script Deploy Contracts

Thư mục này chứa các script để deploy tất cả contracts của dự án Sunnyside Acres lên các mạng khác nhau.

## 🚀 Các Script Deploy

### 1. `deploy-local.js` - Deploy lên Local Network

Deploy tất cả contracts lên Hardhat local network (bao gồm cả contract mới).

```bash
npx hardhat run script/deploy-local.js --network localhost
```

**Bao gồm:**

- ✅ 23 contracts cũ
- ✅ 15 contracts mới (Gacha, Task, FleaMarket, Crafting, Raising)
- ✅ Tổng cộng: 38 contracts

### 2. `deploy-new-contracts.js` - Deploy chỉ các contract mới

Deploy chỉ các contract mới lên local network (yêu cầu đã có deployment cũ).

```bash
npx hardhat run script/deploy-new-contracts.js --network localhost
```

**Bao gồm:**

- ✅ 15 contracts mới
- ✅ Tự động load deployment cũ
- ✅ Cập nhật file deployment

### 3. `deploy-mainnet.js` - Deploy lên Mainnet

Deploy tất cả contracts lên Ethereum Mainnet.

```bash
npx hardhat run script/deploy-mainnet.js --network mainnet
```

**⚠️ Cảnh báo:**

- Chi phí deploy rất cao
- Hãy test kỹ trên testnet trước
- Đảm bảo có đủ ETH

## 📋 Danh sách Contracts

### Core Contracts (23 contracts)

1. **World** - Contract chính quản lý toàn bộ hệ thống
2. **Player** - Quản lý thông tin người chơi
3. **Item** - Quản lý items trong game
4. **Weather** - Hệ thống thời tiết
5. **Plot** - Quản lý đất trồng
6. **Inventory** - Túi đồ người chơi
7. **Plant** - Hệ thống trồng trọt
8. **Fishing** - Hệ thống câu cá
9. **NPCMarket** - Chợ NPC

### New Contracts (15 contracts)

10. **Gacha** - Hệ thống gacha/lootbox
11. **Task** - Hệ thống nhiệm vụ
12. **FleaMarket** - Chợ người chơi
13. **Crafting** - Hệ thống chế tạo
14. **Raising** - Hệ thống nuôi thú

## 🏗️ Kiến trúc Contract

Mỗi hệ thống đều theo mô hình **Component-Proxy-Logic**:

```
Component (Data Storage)
    ↓
Proxy (Access Control)
    ↓
Logic (Business Logic)
```

### Thứ tự Deploy:

1. **Component** - Lưu trữ dữ liệu
2. **Proxy** - Kiểm soát quyền truy cập
3. **Logic** - Logic nghiệp vụ
4. **Register** - Đăng ký trong World contract

## 📁 Files Output

Sau khi deploy, các file sau sẽ được tạo:

```
deployed/
├── contract-addresses-local.json     # Local network
├── contract-addresses-mainnet.json   # Mainnet
└── contract-addresses-testnet.json   # Testnet (nếu có)
```

## 🔧 Cấu hình Network

### Local Network

```bash
# Terminal 1: Chạy Hardhat node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run script/deploy-local.js --network localhost
```

### Mainnet

```bash
# Cấu hình trong hardhat.config.js
npx hardhat run script/deploy-mainnet.js --network mainnet
```

### Testnet

```bash
# Cấu hình trong hardhat.config.js
npx hardhat run script/deploy-mainnet.js --network sepolia
```

## 🎯 Cách sử dụng

### 1. Deploy lần đầu (Local)

```bash
# Bước 1: Chạy Hardhat node
npx hardhat node

# Bước 2: Deploy tất cả contracts
npx hardhat run script/deploy-local.js --network localhost
```

### 2. Deploy contract mới (Local)

```bash
# Nếu đã có deployment cũ, chỉ deploy contract mới
npx hardhat run script/deploy-new-contracts.js --network localhost
```

### 3. Deploy lên Mainnet

```bash
# ⚠️ Cẩn thận! Chi phí cao
npx hardhat run script/deploy-mainnet.js --network mainnet
```

## 📊 Thống kê

| Network | Contracts | Gacha | Task | FleaMarket | Crafting | Raising |
| ------- | --------- | ----- | ---- | ---------- | -------- | ------- |
| Local   | 38        | ✅    | ✅   | ✅         | ✅       | ✅      |
| Testnet | 38        | ✅    | ✅   | ✅         | ✅       | ✅      |
| Mainnet | 38        | ✅    | ✅   | ✅         | ✅       | ✅      |

## 🔍 Verify Contracts

Sau khi deploy, bạn có thể verify contracts trên Etherscan:

```bash
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 🐛 Troubleshooting

### Lỗi thường gặp:

1. **Insufficient funds**

   - Đảm bảo có đủ ETH trong wallet

2. **Contract already deployed**

   - Sử dụng `deploy-new-contracts.js` thay vì deploy lại tất cả

3. **Network not found**

   - Kiểm tra cấu hình trong `hardhat.config.js`

4. **Gas limit exceeded**
   - Tăng gas limit trong cấu hình

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:

1. Logs trong console
2. File deployment JSON
3. Hardhat configuration
4. Network connectivity

---

**Lưu ý:** Luôn test trên local network trước khi deploy lên mainnet!
