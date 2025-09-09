const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Fishing contracts...");

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
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;
  const weatherProxyAddress = deploymentInfo.contracts.WeatherProxy;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • WeatherProxy:", weatherProxyAddress);

  // Kiểm tra xem FishingLogic đã được deploy chưa
  if (deploymentInfo.contracts.FishingLogic) {
    console.log("\n⚠️  FishingLogic đã được deploy trước đó:");
    console.log("   • FishingLogic:", deploymentInfo.contracts.FishingLogic);
    console.log("\n🔄 Deploying new FishingLogic...");
  }

  // === DEPLOY FISHING CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Fishing Contracts...");

  // Deploy FishingLogic
  console.log("\n1️⃣ Deploying FishingLogic...");
  const FishingLogic = await ethers.getContractFactory("FishingLogic");
  const fishingLogic = await FishingLogic.deploy(
    worldAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress,
    weatherProxyAddress
  );
  await fishingLogic.waitForDeployment();
  const fishingLogicAddress = await fishingLogic.getAddress();
  console.log("✅ FishingLogic deployed to:", fishingLogicAddress);

  console.log("\n✅ Tất cả Fishing contracts đã được deploy thành công!");

  // === REGISTER FISHINGLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering FishingLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering FishingLogic in World contract...");
    const registerTx = await world.registerLogic(fishingLogicAddress);
    await registerTx.wait();
    console.log("✅ FishingLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register FishingLogic:", error.message);
    throw error;
  }

  // === UPDATE FISHING CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Fishing Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Fishing contracts mới
    deploymentInfo.contracts.FishingLogic = fishingLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Fishing contracts updated in: ${deploymentPath}`);
    console.log(`   • FishingLogic: ${fishingLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SYNC FRONTEND CONTRACTS ===
  console.log("\n🔄 PHASE: Syncing Frontend Contracts...");

  try {
    const frontendDeploymentPath = `./frontend/deployed/contract-addresses-${network.name}.json`;

    if (fs.existsSync(frontendDeploymentPath)) {
      const frontendDeploymentInfo = JSON.parse(
        fs.readFileSync(frontendDeploymentPath, "utf8")
      );
      frontendDeploymentInfo.contracts.FishingLogic = fishingLogicAddress;
      frontendDeploymentInfo.timestamp = new Date().toISOString();

      fs.writeFileSync(
        frontendDeploymentPath,
        JSON.stringify(frontendDeploymentInfo, null, 2)
      );
      console.log(`✅ Frontend contracts synced: ${frontendDeploymentPath}`);
    } else {
      console.log("⚠️  Frontend deployment file not found, skipping sync");
    }
  } catch (error) {
    console.error("❌ Failed to sync frontend contracts:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 FISHING CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Fishing System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • FishingLogic: ${fishingLogicAddress}`);
  console.log("\n🔗 Dependencies:");
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log(`   • WeatherProxy: ${weatherProxyAddress}`);
  console.log("\n✅ All Fishing contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Fishing contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Fishing functions`);
  console.log(`   • Configure fishing items and chests`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Test fishing mechanics`);
  console.log("\n🎣 Fishing System Features:");
  console.log(`   • Fishing cooldown: 30 seconds`);
  console.log(`   • Fishing rod ID: 9`);
  console.log(`   • Fishing chest ID: 33`);
  console.log(`   • Weather-based chest probability`);
  console.log(`   • Rod durability system`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fishing deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
