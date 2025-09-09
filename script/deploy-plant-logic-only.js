const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy PlantLogic duy nhất...");

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
  const plantProxyAddress = deploymentInfo.contracts.PlantProxy;
  const oldPlantLogicAddress = deploymentInfo.contracts.PlantLogic;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • PlantProxy:", plantProxyAddress);
  console.log("   • Old PlantLogic:", oldPlantLogicAddress);

  // Kiểm tra các dependencies cần thiết
  const requiredContracts = [
    "PlotProxy",
    "InventoryProxy",
    "WeatherProxy",
    "ItemProxy",
  ];

  console.log("\n📋 Checking dependencies:");
  for (const contractName of requiredContracts) {
    const address = deploymentInfo.contracts[contractName];
    if (!address) {
      throw new Error(`Missing required contract: ${contractName}`);
    }
    console.log(`   • ${contractName}: ${address}`);
  }

  // === DEPLOY PLANT LOGIC ===
  console.log("\n🚀 PHASE: Deploying PlantLogic...");

  // Deploy PlantLogic
  console.log("\n1️⃣ Deploying PlantLogic...");
  const PlantLogic = await ethers.getContractFactory("PlantLogic");
  const plantLogic = await PlantLogic.deploy(
    worldAddress,
    plantProxyAddress,
    deploymentInfo.contracts.PlotProxy,
    deploymentInfo.contracts.InventoryProxy,
    deploymentInfo.contracts.WeatherProxy,
    deploymentInfo.contracts.ItemProxy
  );
  await plantLogic.waitForDeployment();
  const newPlantLogicAddress = await plantLogic.getAddress();
  console.log("✅ PlantLogic deployed to:", newPlantLogicAddress);

  // === REGISTER PLANTLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering PlantLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Check if old PlantLogic is registered and unregister it first
    if (
      oldPlantLogicAddress &&
      oldPlantLogicAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      const isOldRegistered = await world.isLogicRegistered(
        oldPlantLogicAddress
      );
      //   if (isOldRegistered) {
      //     console.log("   • Unregistering old PlantLogic from World contract...");
      //     const unregisterTx = await world.unregisterLogic(oldPlantLogicAddress);
      //     await unregisterTx.wait();
      //     console.log("✅ Old PlantLogic unregistered successfully!");
      //   }
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

  // === UPDATE PLANT LOGIC IN JSON ===
  console.log("\n💾 PHASE: Updating PlantLogic in JSON...");

  try {
    // Cập nhật địa chỉ PlantLogic mới
    deploymentInfo.contracts.PlantLogic = newPlantLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ PlantLogic updated in: ${deploymentPath}`);
    console.log(`   • New PlantLogic: ${newPlantLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SYNC FRONTEND CONFIG ===
  console.log("\n🔄 PHASE: Syncing Frontend Configuration...");

  try {
    const frontendPath = `./frontend/deployed/contract-addresses-${network.name}.json`;

    if (fs.existsSync(frontendPath)) {
      const frontendInfo = JSON.parse(fs.readFileSync(frontendPath, "utf8"));
      frontendInfo.contracts.PlantLogic = newPlantLogicAddress;

      fs.writeFileSync(frontendPath, JSON.stringify(frontendInfo, null, 2));
      console.log(`✅ Frontend config updated: ${frontendPath}`);
    } else {
      console.log("⚠️  Frontend config file not found, skipping sync");
    }
  } catch (error) {
    console.error("❌ Failed to sync frontend config:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 PLANT LOGIC DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Plant System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(
    `   • PlantComponent: ${deploymentInfo.contracts.PlantComponent}`
  );
  console.log(`   • PlantProxy: ${plantProxyAddress}`);
  console.log(`   • PlantLogic: ${newPlantLogicAddress} (NEW)`);
  console.log("\n📋 Dependencies:");
  console.log(`   • PlotProxy: ${deploymentInfo.contracts.PlotProxy}`);
  console.log(
    `   • InventoryProxy: ${deploymentInfo.contracts.InventoryProxy}`
  );
  console.log(`   • WeatherProxy: ${deploymentInfo.contracts.WeatherProxy}`);
  console.log(`   • ItemProxy: ${deploymentInfo.contracts.ItemProxy}`);
  console.log("\n✅ PlantLogic deployed and registered successfully!");
  console.log("\n📝 Deployment files updated with new PlantLogic!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Plant functions through proxy`);
  console.log(`   • Verify new logic works correctly`);
  console.log(`   • Update frontend configuration if needed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ PlantLogic deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
