const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Plot contracts...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", Number(network.chainId));
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment info from:", deploymentPath);

  // Lấy địa chỉ các contracts cần thiết
  const worldAddress = deploymentInfo.contracts.World;
  const weatherProxyAddress = deploymentInfo.contracts.WeatherProxy;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  // Lấy địa chỉ Plot contracts cũ (nếu có)
  const oldPlotComponentAddress =
    deploymentInfo.contracts.PlotComponent ||
    "0x0000000000000000000000000000000000000000";
  const oldPlotProxyAddress =
    deploymentInfo.contracts.PlotProxy ||
    "0x0000000000000000000000000000000000000000";
  const oldPlotLogicAddress =
    deploymentInfo.contracts.PlotLogic ||
    "0x0000000000000000000000000000000000000000";

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • WeatherProxy:", weatherProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • Old PlotComponent:", oldPlotComponentAddress);
  console.log("   • Old PlotProxy:", oldPlotProxyAddress);
  console.log("   • Old PlotLogic:", oldPlotLogicAddress);

  // === DEPLOY PLOT CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Plot Contracts...");

  // 1. Deploy PlotComponent
  console.log("\n1️⃣ Deploying PlotComponent...");
  const PlotComponent = await ethers.getContractFactory("PlotComponent");
  const plotComponent = await PlotComponent.deploy();
  await plotComponent.waitForDeployment();
  const newPlotComponentAddress = await plotComponent.getAddress();
  console.log("✅ PlotComponent deployed to:", newPlotComponentAddress);

  // 2. Deploy PlotProxy
  console.log("\n2️⃣ Deploying PlotProxy...");
  const PlotProxy = await ethers.getContractFactory("PlotProxy");
  const plotProxy = await PlotProxy.deploy(
    worldAddress,
    deployer.address,
    newPlotComponentAddress
  );
  await plotProxy.waitForDeployment();
  const newPlotProxyAddress = await plotProxy.getAddress();
  console.log("✅ PlotProxy deployed to:", newPlotProxyAddress);

  // 3. Deploy PlotLogic
  console.log("\n3️⃣ Deploying PlotLogic...");
  const PlotLogic = await ethers.getContractFactory("PlotLogic");
  const plotLogic = await PlotLogic.deploy(
    worldAddress,
    newPlotProxyAddress,
    weatherProxyAddress,
    playerProxyAddress
  );
  await plotLogic.waitForDeployment();
  const newPlotLogicAddress = await plotLogic.getAddress();
  console.log("✅ PlotLogic deployed to:", newPlotLogicAddress);

  console.log("\n✅ Tất cả Plot contracts đã được deploy thành công!");

  // === REGISTER PLOTLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering PlotLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering PlotLogic in World contract...");
    const registerTx = await world.registerLogic(newPlotLogicAddress);
    await registerTx.wait();
    console.log("✅ PlotLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register PlotLogic:", error.message);
    throw error;
  }

  // === UPDATE PLOT CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Plot Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Plot contracts mới
    deploymentInfo.contracts.PlotComponent = newPlotComponentAddress;
    deploymentInfo.contracts.PlotProxy = newPlotProxyAddress;
    deploymentInfo.contracts.PlotLogic = newPlotLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Plot contracts updated in: ${deploymentPath}`);
    console.log(`   • PlotComponent: ${newPlotComponentAddress}`);
    console.log(`   • PlotProxy: ${newPlotProxyAddress}`);
    console.log(`   • PlotLogic: ${newPlotLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 PLOT CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New Plot System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • PlotComponent: ${newPlotComponentAddress}`);
  console.log(`   • PlotProxy: ${newPlotProxyAddress}`);
  console.log(`   • PlotLogic: ${newPlotLogicAddress}`);
  console.log("\n📋 Dependencies:");
  console.log(`   • WeatherProxy: ${weatherProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log("\n✅ All Plot contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Plot contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Plot functions`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Verify contracts on block explorer`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Plot deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
