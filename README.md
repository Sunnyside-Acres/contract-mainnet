# Sunnyside Acres - Smart Contracts

Dự án smart contract cho game Sunnyside Acres trên Sei Mainnet.

## 📋 Yêu cầu hệ thống

- Node.js (v18+)
- Yarn hoặc npm
- Hardhat
- MetaMask hoặc ví tương thích

## 🏗️ Cấu trúc Contracts

### 1. World Contract

- **File**: `contracts/world/World.sol`
- **Chức năng**: Quản lý hệ thống, admin và logic contracts
- **Deploy thứ tự**: 1

### 2. Player System

- **PlayerComponent**: `contracts/player/PlayerComponent.sol`
  - Quản lý dữ liệu player
  - Deploy thứ tự: 2
- **PlayerLogic**: `contracts/player/PlayerLogic.sol`
  - Logic xử lý player
  - Deploy thứ tự: 3
- **PlayerProxy**: `contracts/player/PlayerProxy.sol`
  - Proxy pattern cho player
  - Deploy thứ tự: 4

### 3. Inventory System

- **InventoryComponent**: `contracts/inventory/InventoryComponent.sol`
- **InventoryLogic**: `contracts/inventory/InventoryLogic.sol`
- **InventoryProxy**: `contracts/inventory/InventoryProxy.sol`

### 4. Item System

- **ItemComponent**: `contracts/item/ItemComponent.sol`
- **ItemLogic**: `contracts/item/ItemLogic.sol`
- **ItemProxy**: `contracts/item/ItemProxy.sol`

### 5. Plot System

- **PlotComponent**: `contracts/plot/PlotComponent.sol`
- **PlotLogic**: `contracts/plot/PlotLogic.sol`
- **PlotProxy**: `contracts/plot/PlotProxy.sol`

### 6. Plant System

- **PlantComponent**: `contracts/plant/PlantComponent.sol`
- **PlantLogic**: `contracts/plant/PlantLogic.sol`
- **PlantProxy**: `contracts/plant/PlantProxy.sol`

### 7. Weather System

- **WeatherComponent**: `contracts/weather/WeatherComponent.sol`
- **WeatherLogic**: `contracts/weather/WeatherLogic.sol`
- **WeatherProxy**: `contracts/weather/WeatherProxy.sol`

### 8. NPC Market System

- **NPCMarketComponent**: `contracts/npcmarket/NPCMarketComponent.sol`
- **NPCMarketLogic**: `contracts/npcmarket/NPCMarketLogic.sol`
- **NPCMarketProxy**: `contracts/npcmarket/NPCMarketProxy.sol`

### 9. Fishing System

- **FishingLogic**: `contracts/fishing/FishingLogic.sol`

## 🚀 Cách Deploy Contracts

### Bước 1: Cài đặt dependencies

```bash
# Cài đặt dependencies cho smart contracts
yarn install

# Hoặc sử dụng npm
npm install
```

### Bước 2: Cấu hình môi trường

Tạo file `.env` trong thư mục gốc:

```env
PRIVATE_KEY=your_private_key_here
SEI_RPC_URL=https://evm-rpc.sei-apis.com
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Bước 3: Compile contracts

```bash
# Compile tất cả contracts
yarn compile

# Hoặc
npx hardhat compile
```

### Bước 4: Deploy lên Sei Mainnet

```bash
# Deploy lên mainnet
yarn deploy

# Hoặc
npx hardhat run scripts/deploy.js --network seiMainnet
```

### Bước 5: Deploy lên localhost (test)

```bash
# Khởi động local node
npx hardhat node

# Trong terminal khác, deploy lên localhost
yarn deploy:local

# Hoặc
npx hardhat run scripts/deploy-local.js --network localhost
```

### Bước 6: Verify contracts (tùy chọn)

```bash
# Verify contracts trên explorer
yarn verify

# Hoặc
npx hardhat run scripts/verify.js --network seiMainnet
```

## 🎮 Cách chạy Frontend

### Bước 1: Cài đặt dependencies cho frontend

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies
yarn install

# Hoặc
npm install
```

### Bước 2: Cấu hình môi trường frontend

Tạo file `.env.local` trong thư mục `frontend`:

```env
NEXT_PUBLIC_SEI_RPC_URL=https://evm-rpc.sei-apis.com
NEXT_PUBLIC_CHAIN_ID=713715
NEXT_PUBLIC_CHAIN_NAME=Sei Mainnet
NEXT_PUBLIC_EXPLORER_URL=https://sei.evmos.org
```

### Bước 3: Chạy development server

```bash
# Chạy frontend ở chế độ development
yarn dev

# Hoặc
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3000`

### Bước 4: Build cho production

```bash
# Build ứng dụng
yarn build

# Chạy production server
yarn start
```

## 📁 Thứ tự Deploy

Script deploy sẽ tự động thực hiện theo thứ tự sau:

1. **World Contract** - Deploy contract quản lý hệ thống
2. **PlayerComponent** - Deploy component lưu trữ dữ liệu player
3. **PlayerLogic** - Deploy logic xử lý player
4. **PlayerProxy** - Deploy proxy cho player system
5. **InventoryComponent** - Deploy component inventory
6. **InventoryLogic** - Deploy logic inventory
7. **InventoryProxy** - Deploy proxy inventory
8. **ItemComponent** - Deploy component item
9. **ItemLogic** - Deploy logic item
10. **ItemProxy** - Deploy proxy item
11. **PlotComponent** - Deploy component plot
12. **PlotLogic** - Deploy logic plot
13. **PlotProxy** - Deploy proxy plot
14. **PlantComponent** - Deploy component plant
15. **PlantLogic** - Deploy logic plant
16. **PlantProxy** - Deploy proxy plant
17. **WeatherComponent** - Deploy component weather
18. **WeatherLogic** - Deploy logic weather
19. **WeatherProxy** - Deploy proxy weather
20. **NPCMarketComponent** - Deploy component NPC market
21. **NPCMarketLogic** - Deploy logic NPC market
22. **NPCMarketProxy** - Deploy proxy NPC market
23. **FishingLogic** - Deploy fishing logic
24. **Cấu hình** - Register tất cả logic trong World và set implementation

## 📊 Kết quả Deploy

Sau khi deploy thành công, thông tin sẽ được lưu vào:

- `deployed/contract-addresses-seimainnet.json` (cho mainnet)
- `deployed/contract-addresses-local.json` (cho localhost)

File này chứa:

- Địa chỉ tất cả contracts
- Network đã deploy
- Timestamp deploy
- Deployer address

## ⚙️ Cấu hình Network

Network được cấu hình trong `hardhat.config.js`:

### Sei Mainnet

```javascript
seiMainnet: {
  url: "https://evm-rpc.sei-apis.com",
  chainId: 713715,
  accounts: [process.env.PRIVATE_KEY]
}
```

### Localhost

```javascript
localhost: {
  url: "http://127.0.0.1:8545",
  chainId: 31337
}
```

## 🧪 Testing

### Chạy tests

```bash
# Chạy tất cả tests
yarn test

# Hoặc
npx hardhat test
```

### Chạy tests với coverage

```bash
yarn coverage
```

## 🔧 Scripts hữu ích

```bash
# Compile contracts
yarn compile

# Deploy lên mainnet
yarn deploy

# Deploy lên localhost
yarn deploy:local

# Verify contracts
yarn verify

# Chạy tests
yarn test

# Lint code
yarn lint

# Format code
yarn format
```

## 📱 Frontend Scripts

```bash
# Chạy development server
yarn dev

# Build production
yarn build

# Chạy production server
yarn start

# Lint frontend code
yarn lint

# Type check
yarn type-check
```

## ⚠️ Lưu ý quan trọng

### Trước khi deploy mainnet:

- ✅ Test kỹ trên testnet trước
- ✅ Đảm bảo có đủ SEI để trả gas fee
- ✅ Backup private key an toàn
- ✅ Verify contracts sau khi deploy
- ✅ Kiểm tra tất cả functions hoạt động đúng

### Bảo mật:

- 🔒 Không commit private key vào git
- 🔒 Sử dụng environment variables
- 🔒 Backup mnemonic phrase an toàn
- 🔒 Kiểm tra contract permissions

### Troubleshooting:

- Nếu gặp lỗi gas, tăng gas limit
- Nếu deploy fail, kiểm tra private key và RPC URL
- Nếu frontend không kết nối được, kiểm tra network configuration

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:

1. Kiểm tra logs trong console
2. Xem file deployment logs
3. Kiểm tra network connectivity
4. Verify contract addresses

## 🔗 Links hữu ích

- [Sei Network Explorer](https://sei.evmos.org)
- [Sei Documentation](https://docs.sei.io)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
