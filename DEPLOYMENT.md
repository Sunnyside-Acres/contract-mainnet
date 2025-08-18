# Hướng dẫn Deployment

## Tổng quan

Dự án này hỗ trợ deploy lên nhiều network khác nhau:

- **Local Network**: Để development và testing
- **Sei Mainnet**: Để production

## Cách sử dụng

### 1. Deploy lên Local Network (Development)

```bash
# Bước 1: Khởi động local blockchain
npm run start:local

# Bước 2: Deploy contracts (trong terminal khác)
npm run deploy:local
```

**Kết quả**: File `deployed/contract-addresses-local.json` sẽ được tạo

### 2. Deploy lên Sei Mainnet (Production)

```bash
npm run deploy
```

**Kết quả**: File `deployed/contract-addresses-seimainnet.json` sẽ được tạo

### 3. Deploy lên cả hai network

```bash
npm run deploy:all
```

## Cấu trúc file deployment

Mỗi file deployment sẽ có format:

```json
{
  "network": "local|seimainnet",
  "chainId": 31337|713715,
  "deployer": "0x...",
  "contracts": {
    "World": "0x...",
    "PlayerComponent": "0x...",
    "PlayerLogic": "0x...",
    "PlayerProxy": "0x..."
  },
  "timestamp": "2025-01-13T...",
  "rpcUrl": "http://127.0.0.1:8545" // chỉ có trong local
}
```

## Frontend Integration

Frontend sẽ tự động load contract addresses dựa trên network được chọn:

- **Local**: Load từ `contract-addresses-local.json`
- **Sei Mainnet**: Load từ `contract-addresses-seimainnet.json`

## Lưu ý quan trọng

1. **Local Network**:

   - Dùng cho development và testing
   - Không cần gas fee thật
   - Có thể reset và deploy lại nhiều lần

2. **Sei Mainnet**:

   - Dùng cho production
   - Cần gas fee thật (SEI tokens)
   - Deploy một lần, không thể thay đổi

3. **Security**:
   - Private key trong `hardhat.config.js` chỉ dùng cho testing
   - Production nên dùng environment variables
   - Không commit private key lên git

## Troubleshooting

### Lỗi "insufficient funds"

- Local: Chạy `npm run start:local` để có ETH
- Mainnet: Cần có SEI tokens trong wallet

### Lỗi "network not found"

- Kiểm tra `hardhat.config.js` có đúng network config
- Đảm bảo RPC URL hoạt động

### Lỗi "contract already deployed"

- Local: Reset bằng cách restart hardhat node
- Mainnet: Dùng địa chỉ contract đã deploy trước đó
