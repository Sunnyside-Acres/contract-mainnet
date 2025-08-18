# Sunnyside Acres - Smart Contracts

Dự án smart contract cho game Sunnyside Acres trên Sei Mainnet.

## Cấu trúc Contracts

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

## Cách Deploy

### Bước 1: Cài đặt dependencies
```bash
yarn install
```

### Bước 2: Compile contracts
```bash
yarn compile
```

### Bước 3: Deploy lên Sei Mainnet
```bash
yarn deploy
```

### Bước 4: Deploy lên localhost (test)
```bash
yarn deploy:local
```

## Thứ tự Deploy

Script deploy sẽ tự động thực hiện theo thứ tự sau:

1. **World Contract** - Deploy contract quản lý hệ thống
2. **PlayerComponent** - Deploy component lưu trữ dữ liệu player
3. **PlayerLogic** - Deploy logic xử lý player
4. **PlayerProxy** - Deploy proxy cho player system
5. **Cấu hình** - Register logic trong World và set implementation

## Kết quả Deploy

Sau khi deploy thành công, thông tin sẽ được lưu vào:
- `deployed/contract-addresses-seimainnet.json`

File này chứa:
- Địa chỉ tất cả contracts
- Network đã deploy
- Timestamp deploy
- Deployer address

## Cấu hình Network

Network được cấu hình trong `hardhat.config.js`:
- **Sei Mainnet**: `https://evm-rpc.sei-apis.com`
- Private key được cấu hình sẵn

## Lưu ý

- Đảm bảo có đủ SEI để trả gas fee
- Backup private key an toàn
- Verify contracts sau khi deploy
- Test kỹ trên testnet trước khi deploy mainnet
