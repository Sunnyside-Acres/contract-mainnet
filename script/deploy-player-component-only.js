const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy PlayerComponent duy nhất...");

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
  const playerLogicAddress = deploymentInfo.contracts.PlayerLogic;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • PlayerLogic:", playerLogicAddress);

  // === DEPLOY PLAYER COMPONENT ===
  console.log("\n🚀 PHASE: Deploying PlayerComponent...");

  // Deploy PlayerComponent
  console.log("\n1️⃣ Deploying PlayerComponent...");
  const PlayerComponent = await ethers.getContractFactory("PlayerComponent");
  const playerComponent = await PlayerComponent.deploy();
  await playerComponent.waitForDeployment();
  const newPlayerComponentAddress = await playerComponent.getAddress();
  console.log("✅ PlayerComponent deployed to:", newPlayerComponentAddress);

  // === UPDATE PROXY IMPLEMENTATION ===
  console.log("\n🔗 PHASE: Updating PlayerProxy Implementation...");

  try {
    const playerProxy = await ethers.getContractAt(
      "PlayerProxy",
      playerProxyAddress
    );

    console.log("   • Upgrading PlayerProxy implementation...");
    const upgradeTx = await playerProxy.upgrade(newPlayerComponentAddress);
    await upgradeTx.wait();
    console.log("✅ PlayerProxy implementation updated successfully!");
    console.log("   • New implementation:", newPlayerComponentAddress);
  } catch (error) {
    console.error("❌ Failed to upgrade PlayerProxy:", error.message);
    throw error;
  }

  // === REGISTER PLAYERLOGIC IN WORLD (if not already registered) ===
  console.log("\n🔗 PHASE: Checking PlayerLogic Registration in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Check if PlayerLogic is already registered
    const isRegistered = await world.isLogicRegistered(playerLogicAddress);

    if (!isRegistered) {
      console.log("   • Registering PlayerLogic in World contract...");
      const registerTx = await world.registerLogic(playerLogicAddress);
      await registerTx.wait();
      console.log("✅ PlayerLogic registered successfully in World!");
    } else {
      console.log("✅ PlayerLogic already registered in World!");
    }
  } catch (error) {
    console.error("❌ Failed to register PlayerLogic:", error.message);
    throw error;
  }

  // === UPDATE PLAYER COMPONENT IN JSON ===
  console.log("\n💾 PHASE: Updating PlayerComponent in JSON...");

  try {
    // Cập nhật địa chỉ PlayerComponent mới
    deploymentInfo.contracts.PlayerComponent = newPlayerComponentAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ PlayerComponent updated in: ${deploymentPath}`);
    console.log(`   • New PlayerComponent: ${newPlayerComponentAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 PLAYER COMPONENT DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Player System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • PlayerComponent: ${newPlayerComponentAddress} (NEW)`);
  console.log(`   • PlayerProxy: ${playerProxyAddress} (UPDATED)`);
  console.log(`   • PlayerLogic: ${playerLogicAddress}`);
  console.log("\n✅ PlayerComponent deployed and proxy updated successfully!");
  console.log("\n📝 Deployment file updated with new PlayerComponent!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Player functions through proxy`);
  console.log(`   • Verify proxy delegation works correctly`);
  console.log(`   • Update frontend configuration if needed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ PlayerComponent deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
