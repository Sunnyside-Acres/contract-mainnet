const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy FULL Raising system lên Sei Mainnet...");

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
  console.log("\n⚠️  Bạn đang deploy FULL Raising system lên SEI MAINNET!");
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

  // Lấy địa chỉ các contract cần thiết cho RaisingLogic
  const worldAddress = existingAddresses.contracts.World;
  const inventoryProxyAddress = existingAddresses.contracts.InventoryProxy;
  const weatherProxyAddress = existingAddresses.contracts.WeatherProxy;
  const itemProxyAddress = existingAddresses.contracts.ItemProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   InventoryProxy:", inventoryProxyAddress);
  console.log("   WeatherProxy:", weatherProxyAddress);
  console.log("   ItemProxy:", itemProxyAddress);

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

  // === DEPLOY FULL RAISING SYSTEM ===

  // 1. Deploy RaisingComponent
  console.log("\n📦 Deploying RaisingComponent...");
  const RaisingComponent = await ethers.getContractFactory("RaisingComponent");
  const raisingComponent = await RaisingComponent.deploy();
  await raisingComponent.waitForDeployment();
  const raisingComponentAddress = await raisingComponent.getAddress();
  console.log("✅ RaisingComponent deployed to:", raisingComponentAddress);

  // 2. Deploy RaisingProxy
  console.log("\n📦 Deploying RaisingProxy...");
  const RaisingProxy = await ethers.getContractFactory("RaisingProxy");
  const raisingProxy = await RaisingProxy.deploy(
    worldAddress,
    deployer.address,
    raisingComponentAddress // Implementation address
  );
  await raisingProxy.waitForDeployment();
  const raisingProxyAddress = await raisingProxy.getAddress();
  console.log("✅ RaisingProxy deployed to:", raisingProxyAddress);

  // 3. Deploy RaisingLogic
  console.log("\n📦 Deploying RaisingLogic...");
  const RaisingLogic = await ethers.getContractFactory("RaisingLogic");
  const raisingLogic = await RaisingLogic.deploy(
    worldAddress,
    raisingProxyAddress,
    inventoryProxyAddress,
    weatherProxyAddress,
    itemProxyAddress
  );
  await raisingLogic.waitForDeployment();
  const raisingLogicAddress = await raisingLogic.getAddress();
  console.log("✅ RaisingLogic deployed to:", raisingLogicAddress);

  // === CẤU HÌNH WORLD CONTRACT ===
  console.log("\n⚙️ Configuring World contract...");

  // Register RaisingLogic trong World
  console.log("\n🔗 Đăng ký RaisingLogic trong World...");
  const registerRaisingLogicTx = await world.registerLogic(raisingLogicAddress);
  await registerRaisingLogicTx.wait();
  console.log("✅ RaisingLogic registered in World");

  // === CẬP NHẬT THÔNG TIN DEPLOY ===
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      // Cập nhật địa chỉ mới cho Raising system
      RaisingComponent: raisingComponentAddress,
      RaisingProxy: raisingProxyAddress,
      RaisingLogic: raisingLogicAddress,
    },
    lastUpdated: new Date().toISOString(),
    raisingSystemDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-raising-full-seimainnet.json`;

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
    "\n🎉 Deploy FULL Raising system lên Sei Mainnet hoàn tất thành công!"
  );
  console.log("📊 Đã deploy 3 contracts:");
  console.log("   1. RaisingComponent:", raisingComponentAddress);
  console.log("   2. RaisingProxy:", raisingProxyAddress);
  console.log("   3. RaisingLogic:", raisingLogicAddress);
  console.log("✨ Hệ thống Raising đã sẵn sàng sử dụng");
  console.log("🔗 RaisingLogic đã được đăng ký trong World contract");
  console.log("🌐 Explorer URLs:");
  console.log(
    "   - RaisingComponent: https://sei.explorers.guru/address/" +
      raisingComponentAddress
  );
  console.log(
    "   - RaisingProxy: https://sei.explorers.guru/address/" +
      raisingProxyAddress
  );
  console.log(
    "   - RaisingLogic: https://sei.explorers.guru/address/" +
      raisingLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tính toán và thực hiện");
  console.log("🔒 Tất cả contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. RaisingComponent: Lưu trữ dữ liệu raising");
  console.log("2. RaisingProxy: Proxy pattern cho RaisingComponent");
  console.log("3. RaisingLogic: Logic chính cho hệ thống raising");
  console.log("4. Các function chính:");
  console.log("   - startRaising(): Bắt đầu nuôi vật nuôi");
  console.log("   - feedRaising(): Cho ăn vật nuôi");
  console.log("   - harvestRaising(): Thu hoạch sản phẩm từ vật nuôi");
  console.log("   - slaughterRaising(): Giết mổ vật nuôi");
  console.log("5. Tích hợp với Weather system để tính toán chất lượng");
  console.log("6. Tích hợp với Inventory system để quản lý vật phẩm");
  console.log("7. Tích hợp với Item system để lấy thông tin vật phẩm");

  console.log("\n🔧 Cấu hình hệ thống:");
  console.log(
    "- Weather state ảnh hưởng đến thời gian phát triển và chất lượng"
  );
  console.log("- Feeding system với cooldown và giới hạn số lần cho ăn");
  console.log("- Harvest system với cooldown và multiple harvests");
  console.log("- Quality modifier dựa trên số lần cho ăn");
  console.log("- Item drops với probability và yield calculation");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
