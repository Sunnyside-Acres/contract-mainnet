# Item Import Scripts

Bộ script để import items từ file CSV vào smart contracts.

## 📁 Files

### 1. `import-items-from-csv.js`

Script import cơ bản, import từng item một cách tuần tự.

**Usage:**

```bash
# Cách 1: Truyền file path trực tiếp
npx hardhat run script/import-items-from-csv.js --network seimainnet ./data/items.csv

# Cách 2: Sử dụng environment variable
CSV_FILE_PATH=./data/items.csv npx hardhat run script/import-items-from-csv.js --network seimainnet
```

### 2. `batch-import-items.js`

Script import tối ưu với batch processing để giảm gas cost.

**Usage:**

```bash
# Cách 1: Truyền file path và batch size trực tiếp
npx hardhat run script/batch-import-items.js --network seimainnet ./data/items.csv 5

# Cách 2: Sử dụng environment variables
CSV_FILE_PATH=./data/items.csv BATCH_SIZE=5 npx hardhat run script/batch-import-items.js --network seimainnet
```

**Parameters:**

- `csv-file-path`: Đường dẫn đến file CSV
- `batch-size`: Số lượng items xử lý trong mỗi batch (mặc định: 5, tối đa: 20)

### 3. `validate-csv-items.js`

Script validate file CSV trước khi import.

**Usage:**

```bash
node script/validate-csv-items.js ./data/items.csv
```

### 4. `add-drops-only.js`

Script chỉ thêm drops cho items đã tồn tại.

**Usage:**

```bash
# Cách 1: Sử dụng environment variable
CSV_FILE_PATH=./script/data/drops.csv npx hardhat run script/add-drops-only.js --network seimainnet

# Cách 2: Sử dụng default path
npx hardhat run script/add-drops-only.js --network seimainnet
```

### 5. `remove-drops-only.js`

Script xóa drops cho items.

**Usage:**

```bash
# Cách 1: Sử dụng environment variable
CSV_FILE_PATH=./script/data/remove-drops.csv npx hardhat run script/remove-drops-only.js --network seimainnet

# Cách 2: Sử dụng default path
npx hardhat run script/remove-drops-only.js --network seimainnet
```

## 📋 CSV Format

File CSV phải có format như sau:

```csv
item_id,item_name,item_type,rarity,max_stacked,is_stacked,is_tradable,attributes,drops
1,Iron Sword,0,0,1,false,true,"Damage:15,Durability:100","2:25.5:2,3:15.2:1"
2,Golden Apple,1,2,50,true,true,"Health:50",""
3,Wheat Seed,3,0,100,true,true,"GrowthRate:5,YieldBonus:10","4:100.0:5"
```

### Field Descriptions

#### Required Fields

- **item_id**: ID duy nhất của item (số nguyên dương)
- **item_name**: Tên hiển thị của item (không được rỗng)
- **item_type**: Loại item (0-9, xem bảng dưới)
- **rarity**: Độ hiếm (0-4, xem bảng dưới)
- **max_stacked**: Số lượng tối đa có thể stack
- **is_stacked**: Có thể stack hay không (true/false)
- **is_tradable**: Có thể trade hay không (true/false)

#### Optional Fields

- **attributes**: Thuộc tính item (format: "AttributeName:Value,AttributeName:Value")
- **drops**: Item drops (format: "ItemId:Probability:Quantity,ItemId:Probability:Quantity")

### Item Types (item_type)

- 0 = Weapon
- 1 = Consumable
- 2 = Material
- 3 = Seed
- 4 = Crop
- 5 = Livestock
- 6 = AnimalFeed
- 7 = Tool
- 8 = Quest
- 9 = Other

### Rarity Levels (rarity)

- 0 = Common
- 1 = Uncommon
- 2 = Rare
- 3 = Epic
- 4 = Legendary

### Available Attributes

- Damage, Durability, GrowthRate, YieldBonus
- Health, Speed, Resistance, Strength
- Agility, Stamina, Fertility, WaterUsage
- FeedEfficiency, Quality, HarvestCooldown

### Drops Format

Format: `ItemId:Probability:Quantity`

- **ItemId**: ID của item drop
- **Probability**: Tỷ lệ rơi (0.01-100.00)
- **Quantity**: Số lượng rơi

Ví dụ: `"2:25.5:2,3:15.2:1"` có nghĩa là:

- Item ID 2 có 25.5% cơ hội rơi 2 items
- Item ID 3 có 15.2% cơ hội rơi 1 item

## 🚀 Workflow

### 1. Chuẩn bị dữ liệu

```bash
# Tạo file CSV theo template
cp frontend/public/templates/item-template.csv ./data/my-items.csv

# Chỉnh sửa file CSV với dữ liệu của bạn
```

### 2. Validate dữ liệu

```bash
# Kiểm tra file CSV trước khi import
node script/validate-csv-items.js ./data/my-items.csv
```

### 3. Import dữ liệu

```bash
# Import cơ bản (từng item một)
npx hardhat run script/import-items-from-csv.js --network seimainnet ./data/my-items.csv

# Hoặc import batch (tối ưu gas)
npx hardhat run script/batch-import-items.js --network seimainnet ./data/my-items.csv 5
```

## ⚠️ Lưu ý quan trọng

### Gas Cost

- Mỗi item cần khoảng 500,000 gas
- Batch import giúp giảm gas cost
- Kiểm tra balance trước khi import

### Network Requirements

- Cần deploy contracts trước khi import
- File deployment phải tồn tại: `./deployed/contract-addresses-{network}.json`
- Cần có quyền admin để import items

### Data Validation

- Luôn validate CSV trước khi import
- Kiểm tra duplicate item IDs
- Đảm bảo tất cả references (drops) đều hợp lệ

## 🔧 Troubleshooting

### Lỗi thường gặp

1. **"ItemLogic contract address không tìm thấy"**

   - Đảm bảo đã deploy contracts
   - Kiểm tra file deployment có đúng network không

2. **"Not authorized as admin"**

   - Cần deploy contracts với địa chỉ admin
   - Hoặc thêm địa chỉ vào admin list

3. **"Invalid item_id"**

   - Item ID phải là số nguyên dương
   - Không được duplicate với items đã tồn tại

4. **"Gas limit exceeded"**
   - Giảm batch size
   - Tăng gas limit trong hardhat config

### Debug Tips

```bash
# Kiểm tra deployment info
cat ./deployed/contract-addresses-seimainnet.json

# Kiểm tra balance
npx hardhat run --network seimainnet -e "console.log(await ethers.provider.getBalance('YOUR_ADDRESS'))"

# Test với localhost trước
npx hardhat run script/import-items-from-csv.js --network localhost ./data/test-items.csv
```

## 📊 Performance

### Import Speed

- **Sequential import**: ~1 item/second
- **Batch import**: ~3-5 items/second (batch size 5)

### Gas Optimization

- Batch import giảm ~20-30% gas cost
- Optimal batch size: 5-10 items
- Delay giữa các batch: 2 seconds

## 🔗 Next Steps

Sau khi import thành công:

1. **Verify contracts** trên block explorer
2. **Test functions** trong game
3. **Update frontend** với items mới
4. **Backup deployment info**
5. **Document changes** cho team
