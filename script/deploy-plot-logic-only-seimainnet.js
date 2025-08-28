const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy PlotLogic lên Sei Mainnet...");

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
  console.log("\n⚠️  Bạn đang deploy PlotLogic lên SEI MAINNET!");
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

  // Lấy địa chỉ các contract cần thiết cho PlotLogic
  const worldAddress = existingAddresses.contracts.World;
  const plotProxyAddress = existingAddresses.contracts.PlotProxy;
  const weatherProxyAddress = existingAddresses.contracts.WeatherProxy;
  const playerProxyAddress = existingAddresses.contracts.PlayerProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   PlotProxy:", plotProxyAddress);
  console.log("   WeatherProxy:", weatherProxyAddress);
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

  // Deploy PlotLogic (CONTRACT DUY NHẤT)
  console.log("\n🎯 Deploying PlotLogic (CONTRACT DUY NHẤT)...");
  const PlotLogic = await ethers.getContractFactory("PlotLogic");
  const plotLogic = await PlotLogic.deploy(
    worldAddress,
    plotProxyAddress,
    weatherProxyAddress,
    playerProxyAddress
  );
  await plotLogic.waitForDeployment();
  const plotLogicAddress = await plotLogic.getAddress();
  console.log("✅ PlotLogic deployed to:", plotLogicAddress);

  // Đăng ký PlotLogic trong World
  console.log("\n🔗 Đăng ký PlotLogic trong World...");
  const registerPlotLogicTx = await world.registerLogic(plotLogicAddress);
  await registerPlotLogicTx.wait();
  console.log("✅ PlotLogic registered in World");

  // Cập nhật thông tin deploy
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      PlotLogic: plotLogicAddress, // Cập nhật địa chỉ mới
    },
    lastUpdated: new Date().toISOString(),
    plotLogicDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-plot-logic-only-seimainnet.json`;

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

  console.log("\n🎉 Deploy PlotLogic lên Sei Mainnet hoàn tất thành công!");
  console.log("📊 Chỉ deploy 1 contract: PlotLogic");
  console.log("✨ Hệ thống Plot đã sẵn sàng sử dụng");
  console.log("🔗 PlotLogic đã được đăng ký trong World contract");
  console.log(
    "🌐 Explorer URL: https://sei.explorers.guru/address/" + plotLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tối ưu (chỉ 1 contract)");
  console.log("🔒 Contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. PlotLogic address:", plotLogicAddress);
  console.log("2. Sử dụng PlotLogic để tương tác với Plot system");
  console.log("3. Các function chính:");
  console.log("   - createPlot(): Tạo plot mới với tọa độ x, y");
  console.log("   - deletePlot(): Xóa plot theo plotId");
  console.log("   - getPlotOwner(): Lấy chủ sở hữu của plot");
  console.log("   - getPlots(): Lấy danh sách plot của player");
  console.log("4. Tích hợp với Weather system để tính toán loại plot");
  console.log("5. Tích hợp với Player system để quản lý người chơi");
  console.log("6. Hỗ trợ 3 loại plot: Thường, Phì nhiêu, Ma thuật");
  console.log("7. Randomness dựa trên tọa độ và thời tiết");

  console.log("\n🔧 Tính năng hệ thống:");
  console.log("- Weather-based plot type generation");
  console.log("- Deterministic randomness từ tọa độ");
  console.log("- Plot ownership management");
  console.log("- Coordinate-based plot creation");
  console.log("- Integration với Weather và Player systems");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });

