const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy PlantLogic lên Sei Mainnet...");

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
  console.log("\n⚠️  Bạn đang deploy PlantLogic lên SEI MAINNET!");
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
      // Thử đọc từ các file khác
      const inventoryPath =
        "./deployed/contract-addresses-inventory-full-seimainnet.json";
      if (fs.existsSync(inventoryPath)) {
        existingAddresses = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
        console.log("✅ Đọc từ file inventory thành công");
      } else {
        const raisingPath =
          "./deployed/contract-addresses-raising-full-seimainnet.json";
        if (fs.existsSync(raisingPath)) {
          existingAddresses = JSON.parse(fs.readFileSync(raisingPath, "utf8"));
          console.log("✅ Đọc từ file raising thành công");
        } else {
          throw new Error("Không tìm thấy file địa chỉ contract");
        }
      }
    }
  } catch (error) {
    console.error("❌ Lỗi đọc file địa chỉ:", error.message);
    console.log("💡 Hãy chạy script deploy đầy đủ trước để có file địa chỉ");
    process.exit(1);
  }

  // Lấy địa chỉ các contract cần thiết cho PlantLogic
  const worldAddress = existingAddresses.contracts.World;
  const plantProxyAddress = existingAddresses.contracts.PlantProxy;
  const plotProxyAddress = existingAddresses.contracts.PlotProxy;
  const inventoryProxyAddress = existingAddresses.contracts.InventoryProxy;
  const weatherProxyAddress = existingAddresses.contracts.WeatherProxy;
  const itemProxyAddress = existingAddresses.contracts.ItemProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   PlantProxy:", plantProxyAddress);
  console.log("   PlotProxy:", plotProxyAddress);
  console.log("   InventoryProxy:", inventoryProxyAddress);
  console.log("   WeatherProxy:", weatherProxyAddress);
  console.log("   ItemProxy:", itemProxyAddress);

  // Kiểm tra World contract
  console.log("\n🔍 Kiểm tra World contract...");
  const World = await ethers.getContractFactory("World");
  const world = World.attach(worldAddress);

  // Deploy PlantLogic (CONTRACT DUY NHẤT)
  console.log("\n🎯 Deploying PlantLogic (CONTRACT DUY NHẤT)...");
  const PlantLogic = await ethers.getContractFactory("PlantLogic");
  const plantLogic = await PlantLogic.deploy(
    worldAddress,
    plantProxyAddress,
    plotProxyAddress,
    inventoryProxyAddress,
    weatherProxyAddress,
    itemProxyAddress
  );
  await plantLogic.waitForDeployment();
  const plantLogicAddress = await plantLogic.getAddress();
  console.log("✅ PlantLogic deployed to:", plantLogicAddress);

  // Đăng ký PlantLogic trong World
  console.log("\n🔗 Đăng ký PlantLogic trong World...");
  const registerPlantLogicTx = await world.registerLogic(plantLogicAddress);
  await registerPlantLogicTx.wait();
  console.log("✅ PlantLogic registered in World");

  // Cập nhật thông tin deploy
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      PlantLogic: plantLogicAddress, // Cập nhật địa chỉ mới
    },
    lastUpdated: new Date().toISOString(),
    plantLogicDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-plant-logic-only-seimainnet.json`;

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

  console.log("\n🎉 Deploy PlantLogic lên Sei Mainnet hoàn tất thành công!");
  console.log("📊 Chỉ deploy 1 contract: PlantLogic");
  console.log("✨ Hệ thống Plant đã sẵn sàng sử dụng");
  console.log("🔗 PlantLogic đã được đăng ký trong World contract");
  console.log(
    "🌐 Explorer URL: https://sei.explorers.guru/address/" + plantLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tối ưu (chỉ 1 contract)");
  console.log("🔒 Contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. PlantLogic address:", plantLogicAddress);
  console.log("2. Sử dụng PlantLogic để tương tác với Plant system");
  console.log("3. Các function chính:");
  console.log("   - plantCrop(): Trồng cây trên plot");
  console.log("   - harvestCrop(): Thu hoạch cây");
  console.log("   - tendCrop(): Chăm sóc cây");
  console.log("   - getPlantInfo(): Lấy thông tin cây");
  console.log("   - getPlayerPlants(): Lấy danh sách cây của player");
  console.log(
    "4. Tích hợp với Weather system để tính toán thời gian phát triển"
  );
  console.log("5. Tích hợp với Plot system để kiểm tra quyền sở hữu");
  console.log("6. Tích hợp với Inventory system để quản lý item");
  console.log("7. Tích hợp với Item system để lấy thông tin seed");

  console.log("\n🔧 Tính năng hệ thống:");
  console.log("- Weather-based growth time calculation");
  console.log("- Plot ownership verification");
  console.log("- Seed item validation");
  console.log("- Plant lifecycle management");
  console.log("- Harvest yield calculation");
  console.log("- Integration với Weather, Plot, Inventory và Item systems");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
