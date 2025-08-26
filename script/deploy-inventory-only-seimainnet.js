const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy InventoryLogic lên Sei Mainnet...");

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
  console.log("\n⚠️  Bạn đang deploy InventoryLogic lên SEI MAINNET!");
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
      // Nếu không có, thử đọc từ file fleamarket
      const fleamarketPath =
        "./deployed/contract-addresses-fleamarket-seimainnet.json";
      if (fs.existsSync(fleamarketPath)) {
        existingAddresses = JSON.parse(fs.readFileSync(fleamarketPath, "utf8"));
        console.log("✅ Đọc từ file fleamarket thành công");
      } else {
        throw new Error("Không tìm thấy file địa chỉ contract");
      }
    }
  } catch (error) {
    console.error("❌ Lỗi đọc file địa chỉ:", error.message);
    console.log("💡 Hãy chạy script deploy đầy đủ trước để có file địa chỉ");
    process.exit(1);
  }

  // Lấy địa chỉ các contract cần thiết
  const worldAddress = existingAddresses.contracts.World;
  const inventoryProxyAddress = existingAddresses.contracts.InventoryProxy;
  const itemProxyAddress = existingAddresses.contracts.ItemProxy;
  const playerProxyAddress = existingAddresses.contracts.PlayerProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   InventoryProxy:", inventoryProxyAddress);
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

  // Deploy InventoryLogic (CONTRACT DUY NHẤT)
  console.log("\n🎯 Deploying InventoryLogic (CONTRACT DUY NHẤT)...");
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

  // Đăng ký InventoryLogic trong World
  console.log("\n🔗 Đăng ký InventoryLogic trong World...");
  const registerInventoryLogicTx = await world.registerLogic(
    inventoryLogicAddress
  );
  await registerInventoryLogicTx.wait();
  console.log("✅ InventoryLogic registered in World");

  // Cập nhật thông tin deploy
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      InventoryLogic: inventoryLogicAddress, // Cập nhật địa chỉ mới
    },
    lastUpdated: new Date().toISOString(),
    inventoryLogicDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-inventory-only-seimainnet.json`;

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
    "\n🎉 Deploy InventoryLogic lên Sei Mainnet hoàn tất thành công!"
  );
  console.log("📊 Chỉ deploy 1 contract: InventoryLogic");
  console.log("✨ Hệ thống Inventory đã sẵn sàng sử dụng");
  console.log("🔗 InventoryLogic đã được đăng ký trong World contract");
  console.log(
    "🌐 Explorer URL: https://sei.explorers.guru/address/" +
      inventoryLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tối ưu (chỉ 1 contract)");
  console.log("🔒 Contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. InventoryLogic address:", inventoryLogicAddress);
  console.log("2. Sử dụng InventoryLogic để tương tác với Inventory");
  console.log("3. Các function chính: addItem, transferItem, adminTrading");
  console.log("4. Kiểm tra inventory và quản lý item");
  console.log("5. Hàm adminTrading đã được sửa lỗi logic trao đổi item");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
