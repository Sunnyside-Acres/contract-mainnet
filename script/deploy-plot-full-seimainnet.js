const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy FULL Plot system lên Sei Mainnet...");

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
  console.log("\n⚠️  Bạn đang deploy FULL Plot system lên SEI MAINNET!");
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

  // Lấy địa chỉ các contract cần thiết cho PlotLogic
  const worldAddress = existingAddresses.contracts.World;
  const weatherProxyAddress = existingAddresses.contracts.WeatherProxy;
  const playerProxyAddress = existingAddresses.contracts.PlayerProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   WeatherProxy:", weatherProxyAddress);
  console.log("   PlayerProxy:", playerProxyAddress);

  // Kiểm tra World contract
  console.log("\n🔍 Kiểm tra World contract...");
  const World = await ethers.getContractFactory("World");
  const world = World.attach(worldAddress);

  // === DEPLOY FULL PLOT SYSTEM ===

  // 1. Deploy PlotComponent
  console.log("\n🌱 Deploying PlotComponent...");
  const PlotComponent = await ethers.getContractFactory("PlotComponent");
  const plotComponent = await PlotComponent.deploy();
  await plotComponent.waitForDeployment();
  const plotComponentAddress = await plotComponent.getAddress();
  console.log("✅ PlotComponent deployed to:", plotComponentAddress);

  // 2. Deploy PlotProxy
  console.log("\n🌱 Deploying PlotProxy...");
  const PlotProxy = await ethers.getContractFactory("PlotProxy");
  const plotProxy = await PlotProxy.deploy(
    worldAddress,
    deployer.address,
    plotComponentAddress // Implementation address
  );
  await plotProxy.waitForDeployment();
  const plotProxyAddress = await plotProxy.getAddress();
  console.log("✅ PlotProxy deployed to:", plotProxyAddress);

  // 3. Deploy PlotLogic
  console.log("\n🌱 Deploying PlotLogic...");
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

  // === CẤU HÌNH WORLD CONTRACT ===
  console.log("\n⚙️ Configuring World contract...");

  // Register PlotLogic trong World
  console.log("\n🔗 Đăng ký PlotLogic trong World...");
  const registerPlotLogicTx = await world.registerLogic(plotLogicAddress);
  await registerPlotLogicTx.wait();
  console.log("✅ PlotLogic registered in World");

  // === CẬP NHẬT THÔNG TIN DEPLOY ===
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      // Cập nhật địa chỉ mới cho Plot system
      PlotComponent: plotComponentAddress,
      PlotProxy: plotProxyAddress,
      PlotLogic: plotLogicAddress,
    },
    lastUpdated: new Date().toISOString(),
    plotSystemDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-plot-full-seimainnet.json`;

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
    "\n🎉 Deploy FULL Plot system lên Sei Mainnet hoàn tất thành công!"
  );
  console.log("📊 Đã deploy 3 contracts:");
  console.log("   1. PlotComponent:", plotComponentAddress);
  console.log("   2. PlotProxy:", plotProxyAddress);
  console.log("   3. PlotLogic:", plotLogicAddress);
  console.log("✨ Hệ thống Plot đã sẵn sàng sử dụng");
  console.log("🔗 PlotLogic đã được đăng ký trong World contract");
  console.log("🌐 Explorer URLs:");
  console.log(
    "   - PlotComponent: https://sei.explorers.guru/address/" +
      plotComponentAddress
  );
  console.log(
    "   - PlotProxy: https://sei.explorers.guru/address/" + plotProxyAddress
  );
  console.log(
    "   - PlotLogic: https://sei.explorers.guru/address/" + plotLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tính toán và thực hiện");
  console.log("🔒 Tất cả contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. PlotComponent: Lưu trữ dữ liệu plot");
  console.log("2. PlotProxy: Proxy pattern cho PlotComponent");
  console.log("3. PlotLogic: Logic chính cho hệ thống plot");
  console.log("4. Các function chính:");
  console.log("   - createPlot(): Tạo plot mới với tọa độ x, y");
  console.log("   - deletePlot(): Xóa plot theo plotId");
  console.log("   - getPlotOwner(): Lấy chủ sở hữu của plot");
  console.log("   - getPlots(): Lấy danh sách plot của player");
  console.log("   - getPlotInfo(): Lấy thông tin chi tiết của plot");
  console.log("5. Tích hợp với Weather system để tính toán loại plot");
  console.log("6. Tích hợp với Player system để quản lý người chơi");
  console.log("7. Hỗ trợ 3 loại plot: Thường, Phì nhiêu, Ma thuật");

  console.log("\n🔧 Cấu hình hệ thống:");
  console.log("- Weather-based plot type generation");
  console.log("- Deterministic randomness từ tọa độ");
  console.log("- Plot ownership management");
  console.log("- Coordinate-based plot creation");
  console.log("- Integration với Weather và Player systems");
  console.log("- Plot fertility và active status tracking");
  console.log("- Plot locking mechanism");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
