const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy ItemLogic duy nhất...");

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
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const oldItemLogicAddress = deploymentInfo.contracts.ItemLogic;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • Old ItemLogic:", oldItemLogicAddress);

  // Validate required contracts
  if (!worldAddress) {
    throw new Error("World contract address not found in deployment file");
  }
  if (!itemProxyAddress) {
    throw new Error("ItemProxy contract address not found in deployment file");
  }

  // === DEPLOY ITEM LOGIC ===
  console.log("\n🚀 PHASE: Deploying ItemLogic...");

  // Deploy ItemLogic với world và itemProxy parameters
  console.log("\n1️⃣ Deploying ItemLogic with world and itemProxy...");
  const ItemLogic = await ethers.getContractFactory("ItemLogic");
  const itemLogic = await ItemLogic.deploy(worldAddress, itemProxyAddress);
  await itemLogic.waitForDeployment();
  const newItemLogicAddress = await itemLogic.getAddress();
  console.log("✅ ItemLogic deployed to:", newItemLogicAddress);

  // === REGISTER ITEMLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering ItemLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Unregister old ItemLogic if it exists
    if (oldItemLogicAddress) {
      try {
        const isOldRegistered = await world.isLogicRegistered(
          oldItemLogicAddress
        );
        if (isOldRegistered) {
          console.log("   • Unregistering old ItemLogic from World...");
          const unregisterTx = await world.unregisterLogic(oldItemLogicAddress);
          await unregisterTx.wait();
          console.log("✅ Old ItemLogic unregistered successfully!");
        }
      } catch (error) {
        console.log(
          "⚠️  Warning: Could not unregister old ItemLogic:",
          error.message
        );
      }
    }

    // Register new ItemLogic
    console.log("   • Registering new ItemLogic in World contract...");
    const registerTx = await world.registerLogic(newItemLogicAddress);
    await registerTx.wait();
    console.log("✅ New ItemLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register ItemLogic:", error.message);
    throw error;
  }

  // === UPDATE ITEM LOGIC IN JSON ===
  console.log("\n💾 PHASE: Updating ItemLogic in JSON...");

  try {
    // Cập nhật địa chỉ ItemLogic mới
    deploymentInfo.contracts.ItemLogic = newItemLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ ItemLogic updated in: ${deploymentPath}`);
    console.log(`   • New ItemLogic: ${newItemLogicAddress}`);
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
      frontendDeploymentInfo.contracts.ItemLogic = newItemLogicAddress;

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
  console.log("\n🎉 ITEM LOGIC DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Item System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • ItemComponent: ${deploymentInfo.contracts.ItemComponent}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • ItemLogic: ${newItemLogicAddress} (NEW)`);
  console.log("\n✅ ItemLogic deployed successfully!");
  console.log("\n📝 Deployment files updated with new ItemLogic!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test item creation and management`);
  console.log(`   • Verify item attributes and drops work correctly`);
  console.log(`   • Update frontend configuration if needed`);
  console.log("\n🎁 ItemLogic features:");
  console.log(`   • Create and manage items with basic properties`);
  console.log(`   • Manage item drops (drop rates)`);
  console.log(`   • Set and manage item attributes`);
  console.log(`   • Validate and check items`);
  console.log(
    `   • Support different item types (weapon, armor, material, etc.)`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ItemLogic deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
