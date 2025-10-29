# NPCMarketNative Scripts

Bộ script để deploy, test và quản lý NPCMarketNative contracts.

## 📁 Scripts

### 1. `deploy-npcmarketnative-contracts.js`

**Mục đích**: Deploy toàn bộ NPCMarketNative contracts

**Chức năng**:

- Deploy NPCMarketNativeComponent
- Deploy NPCMarketNativeLogic
- Deploy NPCMarketNativeProxy
- Register logic contract trong World
- Fund contract với 1 ETH (optional)
- Cập nhật deployment JSON

**Cách sử dụng**:

```bash
npx hardhat run script/deploy-npcmarketnative-contracts.js --network <network>
```

**Output**:

- Contract addresses được lưu vào `deployed/contract-addresses-<network>.json`
- Console log chi tiết quá trình deploy

---

### 2. `test-npcmarketnative.js`

**Mục đích**: Test các chức năng cơ bản của NPCMarketNative

**Chức năng**:

- Tạo NPC market
- Thêm item vào market
- Khởi tạo players
- Test mua item từ NPC
- Test bán item cho NPC
- Kiểm tra thống kê market
- Kiểm tra balance contract

**Cách sử dụng**:

```bash
npx hardhat run script/test-npcmarketnative.js --network <network>
```

**Yêu cầu**:

- NPCMarketNative contracts đã được deploy
- Có ít nhất 2 accounts trong hardhat config

---

### 3. `setup-npcmarketnative.js`

**Mục đích**: Setup NPCMarketNative với dữ liệu mẫu đầy đủ

**Chức năng**:

- Tạo 4 NPC markets (Blacksmith, Potion Shop, Weapon Dealer, General Store)
- Thêm 21 items vào các markets
- Tạo items với các loại khác nhau
- Fund contract với 10 ETH
- Setup cả buying và selling items

**Cách sử dụng**:

```bash
npx hardhat run script/setup-npcmarketnative.js --network <network>
```

**Dữ liệu mẫu**:

- **Blacksmith**: 6 weapons (5 selling, 1 buying)
- **Potion Shop**: 5 potions (4 selling, 1 buying)
- **Weapon Dealer**: 5 premium weapons (4 selling, 1 buying)
- **General Store**: 5 general items (4 selling, 1 buying)

---

### 4. `status-npcmarketnative.js`

**Mục đích**: Kiểm tra trạng thái và thống kê NPCMarketNative

**Chức năng**:

- Kiểm tra balance contract
- Hiển thị thông tin tất cả markets
- Hiển thị thống kê transactions
- Hiển thị thống kê users
- Tổng kết trạng thái hệ thống

**Cách sử dụng**:

```bash
npx hardhat run script/status-npcmarketnative.js --network <network>
```

**Output**:

- Chi tiết từng market
- Thống kê transactions
- Balance và volume
- Trạng thái tổng thể

---

## 🚀 Workflow Deploy

### Bước 1: Deploy Contracts

```bash
npx hardhat run script/deploy-npcmarketnative-contracts.js --network localhost
```

### Bước 2: Test Basic Functions

```bash
npx hardhat run script/test-npcmarketnative.js --network localhost
```

### Bước 3: Setup với Dữ liệu Mẫu

```bash
npx hardhat run script/setup-npcmarketnative.js --network localhost
```

### Bước 4: Kiểm tra Trạng thái

```bash
npx hardhat run script/status-npcmarketnative.js --network localhost
```

---

## 📋 Prerequisites

### 1. Dependencies

- NPCMarketNative contracts phải được deploy trước
- Cần có World, Item, Inventory, Player contracts
- Cần có ít nhất 1 ETH để fund contract

### 2. Network Configuration

Đảm bảo network được cấu hình trong `hardhat.config.js`:

```javascript
networks: {
  localhost: {
    url: "http://127.0.0.1:8545"
  },
  seimainnet: {
    url: "https://evm-rpc.sei-apis.com",
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

### 3. Environment Variables

```bash
# .env file
PRIVATE_KEY=your_private_key_here
```

---

## 🔧 Troubleshooting

### Lỗi thường gặp:

1. **"NPCMarketNativeLogic not found"**

   - Chạy `deploy-npcmarketnative-contracts.js` trước

2. **"Insufficient funds"**

   - Fund contract bằng cách gửi ETH đến contract address
   - Hoặc chạy `setup-npcmarketnative.js` (sẽ fund 10 ETH)

3. **"Item does not exist"**

   - Chạy `setup-npcmarketnative.js` để tạo items
   - Hoặc tạo items thủ công bằng Item contract

4. **"Player not initialized"**
   - Khởi tạo player bằng Player contract trước khi test

---

## 📊 Monitoring

### Kiểm tra Balance Contract

```javascript
const balance = await npcMarketNativeLogic.getContractBalance();
console.log("Contract Balance:", ethers.formatEther(balance), "ETH");
```

### Kiểm tra Market Info

```javascript
const marketInfo = await npcMarketNativeLogic.getNPCMarketInfo(1);
console.log("Market Info:", marketInfo);
```

### Kiểm tra Market Stats

```javascript
const stats = await npcMarketNativeLogic.getMarketStats(1);
console.log("Market Stats:", stats);
```

---

## 🎯 Next Steps

Sau khi deploy và setup thành công:

1. **Frontend Integration**: Kết nối frontend với NPCMarketNative contracts
2. **User Testing**: Test với real users
3. **Monitoring**: Setup monitoring và alerting
4. **Optimization**: Tối ưu gas costs và performance
5. **Security Audit**: Audit contracts trước khi mainnet

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs trong console
2. Verify contract addresses trong deployment JSON
3. Kiểm tra network configuration
4. Đảm bảo có đủ ETH để thực hiện transactions

Happy coding! 🚀✨
