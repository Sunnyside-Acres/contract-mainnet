# 🚀 Hướng Dẫn Deploy Smart Contracts

## 📋 Tổng Quan

Hệ thống deploy hỗ trợ 3 chế độ deploy khác nhau:

1. **Deploy All** - Deploy tất cả 23 contracts
2. **Deploy Feature** - Deploy một tính năng cụ thể (Component + Proxy + Logic)
3. **Deploy Single** - Deploy một contract đơn lẻ

## 🌐 Networks

### Local Network (Hardhat)

- **Không cần MetaMask**
- Hardhat tự động tạo và sử dụng private key
- Phù hợp cho development và testing

### Sei Mainnet

- **Yêu cầu MetaMask**
- Cần kết nối ví và có đủ gas fees
- Phù hợp cho production deployment

## 🎯 Các Chế Độ Deploy

### 1. Deploy All (23 Contracts)

Deploy toàn bộ hệ sinh thái theo thứ tự:

1. World (Core contract)
2. Player Contracts (Component → Proxy → Logic)
3. Item Contracts (Component → Proxy → Logic)
4. Weather Contracts (Component → Proxy → Logic)
5. Plot Contracts (Component → Proxy → Logic)
6. Inventory Contracts (Component → Proxy → Logic)
7. Plant Contracts (Component → Proxy → Logic)
8. FishingLogic
9. NPCMarket Contracts (Component → Proxy → Logic)

### 2. Deploy Feature

Deploy một tính năng hoàn chỉnh với 3 contracts:

- **Player**: PlayerComponent, PlayerProxy, PlayerLogic
- **Item**: ItemComponent, ItemProxy, ItemLogic
- **Weather**: WeatherComponent, WeatherProxy, WeatherLogic
- **Plot**: PlotComponent, PlotProxy, PlotLogic
- **Inventory**: InventoryComponent, InventoryProxy, InventoryLogic
- **Plant**: PlantComponent, PlantProxy, PlantLogic

### 3. Deploy Single

Deploy một contract đơn lẻ. Các contract có thể deploy độc lập:

#### ✅ Có thể deploy đơn lẻ:

- **World** - Core contract
- **PlayerComponent, ItemComponent, WeatherComponent, PlotComponent, InventoryComponent, PlantComponent**
- **FishingLogic, NPCMarketComponent, NPCMarketProxy, NPCMarketLogic**

#### ⚠️ Cần dependencies:

- **Logic contracts** - Cần World address và Proxy address
- **Proxy contracts** - Cần World address và Component address

## 🔧 Cách Sử Dụng

### Local Network

1. Chạy Hardhat node: `npx hardhat node`
2. Chọn "Local Network" trong dropdown
3. Chọn chế độ deploy mong muốn
4. Click "Deploy" - không cần MetaMask

### Sei Mainnet

1. Cài đặt MetaMask extension
2. Kết nối MetaMask với Sei Mainnet
3. Chọn "Sei Mainnet" trong dropdown
4. Kết nối MetaMask (nếu chưa kết nối)
5. Chọn chế độ deploy mong muốn
6. Click "Deploy" - cần xác nhận giao dịch và trả gas fees

## 📁 Kết Quả Deploy

Sau khi deploy thành công, thông tin sẽ được lưu vào:

- `deployed/contract-addresses-local.json` (cho local network)
- `deployed/contract-addresses-seimainnet.json` (cho mainnet)

File này chứa:

- Địa chỉ tất cả contracts đã deploy
- Network và chain ID
- Deployer address
- Timestamp deploy
- RPC URL

## ⚠️ Lưu Ý Quan Trọng

1. **Local Network**: Không cần MetaMask, phù hợp cho development
2. **Mainnet**: Cần MetaMask và gas fees, phù hợp cho production
3. **Dependencies**: Logic và Proxy contracts cần các contract khác đã được deploy trước
4. **Gas Fees**: Deploy lên mainnet sẽ tốn gas fees thực tế
5. **Testing**: Luôn test trên local network trước khi deploy mainnet

## 🛠️ Troubleshooting

### Lỗi MetaMask

- Đảm bảo MetaMask đã được cài đặt
- Kết nối đúng network (Sei Mainnet)
- Có đủ gas fees trong ví

### Lỗi Local Network

- Đảm bảo Hardhat node đang chạy: `npx hardhat node`
- Kiểm tra port 8545 không bị chiếm dụng

### Lỗi Deploy

- Kiểm tra contract dependencies
- Đảm bảo đã deploy World contract trước
- Kiểm tra logs để xem lỗi chi tiết
