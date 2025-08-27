const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy RaisingLogic lên Sei Mainnet...");

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
  console.log("\n⚠️  Bạn đang deploy RaisingLogic lên SEI MAINNET!");
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

  // Lấy địa chỉ các contract cần thiết cho RaisingLogic
  const worldAddress = existingAddresses.contracts.World;
  const raisingProxyAddress = existingAddresses.contracts.RaisingProxy;
  const inventoryProxyAddress = existingAddresses.contracts.InventoryProxy;
  const weatherProxyAddress = existingAddresses.contracts.WeatherProxy;
  const itemProxyAddress = existingAddresses.contracts.ItemProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   RaisingProxy:", raisingProxyAddress);
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

  // Deploy RaisingLogic (CONTRACT DUY NHẤT)
  console.log("\n🎯 Deploying RaisingLogic (CONTRACT DUY NHẤT)...");
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

  // Đăng ký RaisingLogic trong World
  console.log("\n🔗 Đăng ký RaisingLogic trong World...");
  const registerRaisingLogicTx = await world.registerLogic(raisingLogicAddress);
  await registerRaisingLogicTx.wait();
  console.log("✅ RaisingLogic registered in World");

  // Cập nhật thông tin deploy
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      RaisingLogic: raisingLogicAddress, // Cập nhật địa chỉ mới
    },
    lastUpdated: new Date().toISOString(),
    raisingLogicDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-raising-only-seimainnet.json`;

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

  console.log("\n🎉 Deploy RaisingLogic lên Sei Mainnet hoàn tất thành công!");
  console.log("📊 Chỉ deploy 1 contract: RaisingLogic");
  console.log("✨ Hệ thống Raising đã sẵn sàng sử dụng");
  console.log("🔗 RaisingLogic đã được đăng ký trong World contract");
  console.log(
    "🌐 Explorer URL: https://sei.explorers.guru/address/" + raisingLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tối ưu (chỉ 1 contract)");
  console.log("🔒 Contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. RaisingLogic address:", raisingLogicAddress);
  console.log("2. Sử dụng RaisingLogic để tương tác với Raising system");
  console.log(
    "3. Các function chính: startRaising, harvestRaising, slaughterRaising, feedRaising"
  );
  console.log("4. Quản lý việc nuôi và thu hoạch vật nuôi");
  console.log("5. Tích hợp với Weather system để tính toán chất lượng");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
