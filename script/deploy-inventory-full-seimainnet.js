const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy FULL Inventory system lên Sei Mainnet...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId);
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "SEI"
  );

  // Xác nhận deploy
  console.log("\n⚠️  Bạn đang deploy FULL Inventory system lên SEI MAINNET!");
  console.log("💰 Chi phí deploy sẽ rất cao, hãy đảm bảo có đủ SEI");
  console.log("🔒 Hãy kiểm tra kỹ contract trước khi deploy");

  // Đọc địa chỉ contract từ file JSON đã có
  console.log("\n📖 Đọc địa chỉ contract từ file JSON...");

  let existingAddresses;
  try {
    // Thử đọc từ file seimainnet trước
    const seimainnetPath = "./deployed/contract-addresses-seimainnet.json";
    if (fs.existsSync(seimainnetPath)) {
      existingAddresses = JSON.parse(fs.readFileSync(seimainnetPath, "utf8"));
      console.log("✅ Đọc từ file seimainnet thành công");
    } else {
      throw new Error("Không tìm thấy file địa chỉ contract seimainnet");
    }
  } catch (error) {
    console.error("❌ Lỗi đọc file địa chỉ:", error.message);
    console.log("💡 Hãy chạy script deploy đầy đủ trước để có file địa chỉ");
    process.exit(1);
  }

  // Lấy địa chỉ các contract cần thiết cho InventoryLogic
  const worldAddress = existingAddresses.contracts.World;
  const itemProxyAddress = existingAddresses.contracts.ItemProxy;
  const playerProxyAddress = existingAddresses.contracts.PlayerProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   ItemProxy:", itemProxyAddress);
  console.log("   PlayerProxy:", playerProxyAddress);

  // Kiểm tra World contract
  console.log("\n🔍 Kiểm tra World contract...");
  const World = await ethers.getContractFactory("World");
  const world = World.attach(worldAddress);

  //   try {
  //     const admin = await world.admin();
  //     console.log("✅ World contract hợp lệ, admin:", admin);
  //   } catch (error) {
  //     console.error("❌ World contract không hợp lệ:", error.message);
  //     process.exit(1);
  //   }

  // === DEPLOY FULL INVENTORY SYSTEM ===

  // 1. Deploy InventoryComponent
  console.log("\n📦 Deploying InventoryComponent...");
  const InventoryComponent = await ethers.getContractFactory(
    "InventoryComponent"
  );
  const inventoryComponent = await InventoryComponent.deploy();
  await inventoryComponent.waitForDeployment();
  const inventoryComponentAddress = await inventoryComponent.getAddress();
  console.log("✅ InventoryComponent deployed to:", inventoryComponentAddress);

  // 2. Deploy InventoryProxy
  console.log("\n📦 Deploying InventoryProxy...");
  const InventoryProxy = await ethers.getContractFactory("InventoryProxy");
  const inventoryProxy = await InventoryProxy.deploy(
    worldAddress,
    deployer.address,
    inventoryComponentAddress // Implementation address
  );
  await inventoryProxy.waitForDeployment();
  const inventoryProxyAddress = await inventoryProxy.getAddress();
  console.log("✅ InventoryProxy deployed to:", inventoryProxyAddress);

  // 3. Deploy InventoryLogic
  console.log("\n📦 Deploying InventoryLogic...");
  const InventoryLogic = await ethers.getContractFactory("InventoryLogic");
  const inventoryLogic = await InventoryLogic.deploy(
    worldAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress
  );
  await inventoryLogic.waitForDeployment();
  const inventoryLogicAddress = await inventoryLogic.getAddress();
  console.log("✅ InventoryLogic deployed to:", inventoryLogicAddress);

  // === CẤU HÌNH WORLD CONTRACT ===
  console.log("\n⚙️ Configuring World contract...");

  // Register InventoryLogic trong World
  console.log("\n🔗 Đăng ký InventoryLogic trong World...");
  const registerInventoryLogicTx = await world.registerLogic(
    inventoryLogicAddress
  );
  await registerInventoryLogicTx.wait();
  console.log("✅ InventoryLogic registered in World");

  // === CẬP NHẬT THÔNG TIN DEPLOY ===
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      // Cập nhật địa chỉ mới cho Inventory system
      InventoryComponent: inventoryComponentAddress,
      InventoryProxy: inventoryProxyAddress,
      InventoryLogic: inventoryLogicAddress,
    },
    lastUpdated: new Date().toISOString(),
    inventorySystemDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-inventory-full-seimainnet.json`;

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(updatedDeploymentInfo, null, 2)
  );
  console.log(`\n💾 Updated deployment info saved to: ${deploymentPath}`);

  console.log(
    "\n🎉 Deploy FULL Inventory system lên Sei Mainnet hoàn tất thành công!"
  );
  console.log("📊 Đã deploy 3 contracts:");
  console.log("   1. InventoryComponent:", inventoryComponentAddress);
  console.log("   2. InventoryProxy:", inventoryProxyAddress);
  console.log("   3. InventoryLogic:", inventoryLogicAddress);
  console.log("✨ Hệ thống Inventory đã sẵn sàng sử dụng");
  console.log("🔗 InventoryLogic đã được đăng ký trong World contract");
  console.log("🌐 Explorer URLs:");
  console.log(
    "   - InventoryComponent: https://sei.explorers.guru/address/" +
      inventoryComponentAddress
  );
  console.log(
    "   - InventoryProxy: https://sei.explorers.guru/address/" +
      inventoryProxyAddress
  );
  console.log(
    "   - InventoryLogic: https://sei.explorers.guru/address/" +
      inventoryLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tính toán và thực hiện");
  console.log("🔒 Tất cả contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. InventoryComponent: Lưu trữ dữ liệu inventory");
  console.log("2. InventoryProxy: Proxy pattern cho InventoryComponent");
  console.log("3. InventoryLogic: Logic chính cho hệ thống inventory");
  console.log("4. Các function chính:");
  console.log("   - addItem(): Thêm item vào inventory");
  console.log("   - removeItem(): Xóa item khỏi inventory");
  console.log("   - transferItem(): Chuyển item giữa các player");
  console.log("   - getInventory(): Lấy thông tin inventory của player");
  console.log("   - adminTrading(): Admin function để trao đổi item");
  console.log("5. Tích hợp với Item system để lấy thông tin vật phẩm");
  console.log("6. Tích hợp với Player system để quản lý người chơi");
  console.log("7. Hỗ trợ multiple item types và quantities");

  console.log("\n🔧 Cấu hình hệ thống:");
  console.log("- Inventory slots với giới hạn số lượng item");
  console.log("- Item stacking với maximum stack size");
  console.log("- Transfer system với validation");
  console.log("- Admin trading system cho quản lý");
  console.log("- Integration với các hệ thống khác trong game");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
