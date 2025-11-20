const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Plant System đầy đủ...");
  console.log("🌱 Deploying PlantComponent, PlantProxy, và PlantLogic");

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

  // Validate required contracts
  const worldAddress = deploymentInfo.contracts.World;
  const plotProxyAddress = deploymentInfo.contracts.PlotProxy;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const weatherProxyAddress = deploymentInfo.contracts.WeatherProxy;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;

  console.log("\n📋 Required contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • PlotProxy:", plotProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • WeatherProxy:", weatherProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);

  // Validate required contracts
  if (!worldAddress) {
    throw new Error("World contract address not found in deployment file");
  }
  if (!plotProxyAddress) {
    throw new Error("PlotProxy contract address not found in deployment file");
  }
  if (!inventoryProxyAddress) {
    throw new Error(
      "InventoryProxy contract address not found in deployment file"
    );
  }
  if (!weatherProxyAddress) {
    throw new Error(
      "WeatherProxy contract address not found in deployment file"
    );
  }
  if (!itemProxyAddress) {
    throw new Error("ItemProxy contract address not found in deployment file");
  }

  // Lấy địa chỉ Plant contracts cũ (nếu có)
  const oldPlantComponentAddress =
    deploymentInfo.contracts.PlantComponent ||
    "0x0000000000000000000000000000000000000000";
  const oldPlantProxyAddress =
    deploymentInfo.contracts.PlantProxy ||
    "0x0000000000000000000000000000000000000000";
  const oldPlantLogicAddress =
    deploymentInfo.contracts.PlantLogic ||
    "0x0000000000000000000000000000000000000000";

  console.log("\n📋 Existing Plant contract addresses:");
  console.log("   • Old PlantComponent:", oldPlantComponentAddress);
  console.log("   • Old PlantProxy:", oldPlantProxyAddress);
  console.log("   • Old PlantLogic:", oldPlantLogicAddress);

  // === DEPLOY PLANT CONTRACTS ===
  console.log("\n🚀 PHASE 1: Deploying Plant Contracts...");

  // 1. Deploy PlantComponent
  console.log("\n1️⃣ Deploying PlantComponent...");
  const PlantComponent = await ethers.getContractFactory("PlantComponent");
  const plantComponent = await PlantComponent.deploy();
  await plantComponent.waitForDeployment();
  const newPlantComponentAddress = await plantComponent.getAddress();
  console.log("✅ PlantComponent deployed to:", newPlantComponentAddress);

  // 2. Deploy PlantProxy
  console.log("\n2️⃣ Deploying PlantProxy...");
  const PlantProxy = await ethers.getContractFactory("PlantProxy");
  const plantProxy = await PlantProxy.deploy(
    worldAddress,
    deployer.address,
    newPlantComponentAddress
  );
  await plantProxy.waitForDeployment();
  const newPlantProxyAddress = await plantProxy.getAddress();
  console.log("✅ PlantProxy deployed to:", newPlantProxyAddress);

  // 3. Deploy PlantLogic
  console.log("\n3️⃣ Deploying PlantLogic...");
  const PlantLogic = await ethers.getContractFactory("PlantLogic");
  const plantLogic = await PlantLogic.deploy(
    worldAddress,
    newPlantProxyAddress,
    plotProxyAddress,
    inventoryProxyAddress,
    weatherProxyAddress,
    itemProxyAddress
  );
  await plantLogic.waitForDeployment();
  const newPlantLogicAddress = await plantLogic.getAddress();
  console.log("✅ PlantLogic deployed to:", newPlantLogicAddress);

  console.log("\n✅ Tất cả Plant contracts đã được deploy thành công!");

  // === REGISTER PLANTLOGIC IN WORLD ===
  console.log("\n🔗 PHASE 2: Registering PlantLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Unregister old PlantLogic if it exists
    if (
      oldPlantLogicAddress &&
      oldPlantLogicAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      try {
        const isOldRegistered = await world.isLogicRegistered(
          oldPlantLogicAddress
        );
        // if (isOldRegistered) {
        //   console.log("   • Unregistering old PlantLogic from World...");
        //   const unregisterTx = await world.unregisterLogic(
        //     oldPlantLogicAddress
        //   );
        //   await unregisterTx.wait();
        //   console.log("✅ Old PlantLogic unregistered successfully!");
        // }
      } catch (error) {
        console.log(
          "⚠️  Warning: Could not unregister old PlantLogic:",
          error.message
        );
      }
    }

    // Register new PlantLogic
    console.log("   • Registering new PlantLogic in World contract...");
    const registerTx = await world.registerLogic(newPlantLogicAddress);
    await registerTx.wait();
    console.log("✅ New PlantLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register PlantLogic:", error.message);
    throw error;
  }

  // === UPDATE PLANT CONTRACTS IN JSON ===
  console.log("\n💾 PHASE 3: Updating Plant Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Plant contracts mới
    deploymentInfo.contracts.PlantComponent = newPlantComponentAddress;
    deploymentInfo.contracts.PlantProxy = newPlantProxyAddress;
    deploymentInfo.contracts.PlantLogic = newPlantLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Plant contracts updated in: ${deploymentPath}`);
    console.log(`   • PlantComponent: ${newPlantComponentAddress}`);
    console.log(`   • PlantProxy: ${newPlantProxyAddress}`);
    console.log(`   • PlantLogic: ${newPlantLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
    throw error;
  }

  // === SYNC FRONTEND DEPLOYMENT FILE ===
  console.log("\n🔄 PHASE 4: Syncing Frontend Deployment File...");

  try {
    const frontendDeploymentPath = `./frontend/deployed/contract-addresses-${network.name}.json`;

    if (fs.existsSync(frontendDeploymentPath)) {
      const frontendDeploymentInfo = JSON.parse(
        fs.readFileSync(frontendDeploymentPath, "utf8")
      );
      frontendDeploymentInfo.contracts.PlantComponent =
        newPlantComponentAddress;
      frontendDeploymentInfo.contracts.PlantProxy = newPlantProxyAddress;
      frontendDeploymentInfo.contracts.PlantLogic = newPlantLogicAddress;

      fs.writeFileSync(
        frontendDeploymentPath,
        JSON.stringify(frontendDeploymentInfo, null, 2)
      );
      console.log(
        `✅ Frontend deployment file updated: ${frontendDeploymentPath}`
      );
      console.log(`   • PlantComponent: ${newPlantComponentAddress}`);
      console.log(`   • PlantProxy: ${newPlantProxyAddress}`);
      console.log(`   • PlantLogic: ${newPlantLogicAddress}`);
    } else {
      console.log("⚠️  Frontend deployment file not found, skipping sync");
      console.log(`   Expected path: ${frontendDeploymentPath}`);
    }
  } catch (error) {
    console.error("❌ Failed to sync frontend deployment file:", error.message);
    // Không throw error vì đây không phải là bước critical
  }

  // === SUMMARY ===
  console.log("\n🎉 PLANT SYSTEM DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Plant System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • PlantComponent: ${newPlantComponentAddress} (NEW)`);
  console.log(`   • PlantProxy: ${newPlantProxyAddress} (NEW)`);
  console.log(`   • PlantLogic: ${newPlantLogicAddress} (NEW)`);
  console.log("\n📋 Dependencies:");
  console.log(`   • PlotProxy: ${plotProxyAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • WeatherProxy: ${weatherProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log("\n✨ Optimizations Applied:");
  console.log("   • Plant struct: 3 slots (96 bytes) instead of 4 slots");
  console.log("   • Plot struct: 3 slots (96 bytes) instead of 9 slots");
  console.log("   • Deterministic plot type (no random)");
  console.log("   • Skip random for single drop harvest");
  console.log("\n✅ All Plant contracts deployed and registered successfully!");
  console.log("\n📝 Deployment files updated:");
  console.log(`   • Backend: ${deploymentPath}`);
  const frontendPath = `./frontend/deployed/contract-addresses-${network.name}.json`;
  if (fs.existsSync(frontendPath)) {
    console.log(`   • Frontend: ${frontendPath}`);
  }
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Plant functions through proxy`);
  console.log(`   • Verify contracts on block explorer`);
  console.log(`   • Test plantCrop, plantTended, plantHarvest functions`);
  console.log(`   • Monitor gas usage in production`);
  console.log(`   • Update frontend configuration if needed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Plant deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
