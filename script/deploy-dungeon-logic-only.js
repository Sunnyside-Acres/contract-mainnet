const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy DungeonLogic duy nhất...");

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
  const dungeonProxyAddress = deploymentInfo.contracts.DungeonProxy;
  const inventoryComponentAddress = deploymentInfo.contracts.InventoryProxy;
  const playerComponentAddress = deploymentInfo.contracts.PlayerProxy;
  const oldDungeonLogicAddress = deploymentInfo.contracts.DungeonLogic;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • DungeonProxy:", dungeonProxyAddress);
  console.log("   • InventoryProxy:", inventoryComponentAddress);
  console.log("   • PlayerProxy:", playerComponentAddress);
  console.log("   • Old DungeonLogic:", oldDungeonLogicAddress);

  // Validate required contracts
  if (!worldAddress) {
    throw new Error("World contract address not found in deployment file");
  }
  if (!dungeonProxyAddress) {
    throw new Error(
      "DungeonProxy contract address not found in deployment file"
    );
  }
  if (!inventoryComponentAddress) {
    throw new Error(
      "InventoryProxy contract address not found in deployment file"
    );
  }
  if (!playerComponentAddress) {
    throw new Error(
      "PlayerProxy contract address not found in deployment file"
    );
  }

  // === DEPLOY DUNGEON LOGIC ===
  console.log("\n🚀 PHASE: Deploying DungeonLogic...");

  // Deploy DungeonLogic
  console.log("\n1️⃣ Deploying DungeonLogic...");
  const DungeonLogic = await ethers.getContractFactory("DungeonLogic");
  const dungeonLogic = await DungeonLogic.deploy(
    worldAddress,
    dungeonProxyAddress,
    inventoryComponentAddress,
    playerComponentAddress
  );
  await dungeonLogic.waitForDeployment();
  const newDungeonLogicAddress = await dungeonLogic.getAddress();
  console.log("✅ DungeonLogic deployed to:", newDungeonLogicAddress);

  // === REGISTER DUNGEONLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering DungeonLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Unregister old DungeonLogic if it exists
    if (oldDungeonLogicAddress) {
      try {
        const isOldRegistered = await world.isLogicRegistered(
          oldDungeonLogicAddress
        );
        if (isOldRegistered) {
          console.log("   • Unregistering old DungeonLogic from World...");
          const unregisterTx = await world.unregisterLogic(
            oldDungeonLogicAddress
          );
          await unregisterTx.wait();
          console.log("✅ Old DungeonLogic unregistered successfully!");
        }
      } catch (error) {
        console.log(
          "⚠️  Warning: Could not unregister old DungeonLogic:",
          error.message
        );
      }
    }

    // Register new DungeonLogic
    console.log("   • Registering new DungeonLogic in World contract...");
    const registerTx = await world.registerLogic(newDungeonLogicAddress);
    await registerTx.wait();
    console.log("✅ New DungeonLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register DungeonLogic:", error.message);
    throw error;
  }

  // === UPDATE DUNGEON LOGIC IN JSON ===
  console.log("\n💾 PHASE: Updating DungeonLogic in JSON...");

  try {
    // Cập nhật địa chỉ DungeonLogic mới
    deploymentInfo.contracts.DungeonLogic = newDungeonLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ DungeonLogic updated in: ${deploymentPath}`);
    console.log(`   • New DungeonLogic: ${newDungeonLogicAddress}`);
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
      frontendDeploymentInfo.contracts.DungeonLogic = newDungeonLogicAddress;

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
  console.log("\n🎉 DUNGEON LOGIC DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Dungeon System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(
    `   • DungeonComponent: ${
      deploymentInfo.contracts.DungeonComponent || "N/A"
    }`
  );
  console.log(`   • DungeonProxy: ${dungeonProxyAddress}`);
  console.log(`   • DungeonLogic: ${newDungeonLogicAddress} (NEW)`);
  console.log(`   • InventoryProxy: ${inventoryComponentAddress}`);
  console.log(`   • PlayerProxy: ${playerComponentAddress}`);
  console.log("\n✅ DungeonLogic deployed successfully!");
  console.log("\n📝 Deployment files updated with new DungeonLogic!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Dungeon functions through proxy`);
  console.log(`   • Verify new logic works correctly`);
  console.log(`   • Update frontend configuration if needed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ DungeonLogic deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
