const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy PlayerLogic duy nhất...");

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
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;
  const inventoryComponentAddress = deploymentInfo.contracts.InventoryProxy;
  const oldPlayerLogicAddress = deploymentInfo.contracts.PlayerLogic;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • InventoryComponent:", inventoryComponentAddress);
  console.log("   • Old PlayerLogic:", oldPlayerLogicAddress);

  // Validate required contracts
  if (!worldAddress) {
    throw new Error("World contract address not found in deployment file");
  }
  if (!playerProxyAddress) {
    throw new Error(
      "PlayerProxy contract address not found in deployment file"
    );
  }
  if (!inventoryComponentAddress) {
    throw new Error(
      "InventoryComponent contract address not found in deployment file"
    );
  }

  // === DEPLOY PLAYER LOGIC ===
  console.log("\n🚀 PHASE: Deploying PlayerLogic...");

  // Deploy PlayerLogic với inventoryProxy parameter mới
  console.log("\n1️⃣ Deploying PlayerLogic with inventoryProxy...");
  const PlayerLogic = await ethers.getContractFactory("PlayerLogic");
  const playerLogic = await PlayerLogic.deploy(
    worldAddress,
    playerProxyAddress,
    inventoryComponentAddress
  );
  await playerLogic.waitForDeployment();
  const newPlayerLogicAddress = await playerLogic.getAddress();
  console.log("✅ PlayerLogic deployed to:", newPlayerLogicAddress);

  // === REGISTER PLAYERLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering PlayerLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Unregister old PlayerLogic if it exists
    if (oldPlayerLogicAddress) {
      try {
        const isOldRegistered = await world.isLogicRegistered(
          oldPlayerLogicAddress
        );
        if (isOldRegistered) {
          console.log("   • Unregistering old PlayerLogic from World...");
          const unregisterTx = await world.unregisterLogic(
            oldPlayerLogicAddress
          );
          await unregisterTx.wait();
          console.log("✅ Old PlayerLogic unregistered successfully!");
        }
      } catch (error) {
        console.log(
          "⚠️  Warning: Could not unregister old PlayerLogic:",
          error.message
        );
      }
    }

    // Register new PlayerLogic
    console.log("   • Registering new PlayerLogic in World contract...");
    const registerTx = await world.registerLogic(newPlayerLogicAddress);
    await registerTx.wait();
    console.log("✅ New PlayerLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register PlayerLogic:", error.message);
    throw error;
  }

  // === UPDATE PLAYER LOGIC IN JSON ===
  console.log("\n💾 PHASE: Updating PlayerLogic in JSON...");

  try {
    // Cập nhật địa chỉ PlayerLogic mới
    deploymentInfo.contracts.PlayerLogic = newPlayerLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ PlayerLogic updated in: ${deploymentPath}`);
    console.log(`   • New PlayerLogic: ${newPlayerLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SYNC FRONTEND DEPLOYMENT FILE ===
  console.log("\n🔄 PHASE: Syncing Frontend Deployment File...");

  try {
    const frontendDeploymentPath = `./frontend/deployed/contract-addresses-${network.name}.json`;

    if (fs.existsSync(frontendDeploymentPath)) {
      const frontendDeploymentInfo = JSON.parse(
        fs.readFileSync(frontendDeploymentPath, "utf8")
      );
      frontendDeploymentInfo.contracts.PlayerLogic = newPlayerLogicAddress;

      fs.writeFileSync(
        frontendDeploymentPath,
        JSON.stringify(frontendDeploymentInfo, null, 2)
      );
      console.log(
        `✅ Frontend deployment file updated: ${frontendDeploymentPath}`
      );
    } else {
      console.log("⚠️  Frontend deployment file not found, skipping sync");
    }
  } catch (error) {
    console.error("❌ Failed to sync frontend deployment file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 PLAYER LOGIC DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Player System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(
    `   • PlayerComponent: ${deploymentInfo.contracts.PlayerComponent}`
  );
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log(`   • PlayerLogic: ${newPlayerLogicAddress} (NEW)`);
  console.log(`   • InventoryComponent: ${inventoryComponentAddress}`);
  console.log(
    "\n✅ PlayerLogic deployed with starter items (ID 8, 10) successfully!"
  );
  console.log("\n📝 Deployment files updated with new PlayerLogic!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Player creation with starter items`);
  console.log(`   • Verify inventory integration works correctly`);
  console.log(`   • Update frontend configuration if needed`);
  console.log("\n🎁 New players will now receive starter items:");
  console.log(`   • Item ID 8: quantity 1, durability 100`);
  console.log(`   • Item ID 10: quantity 1, durability 100`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ PlayerLogic deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
