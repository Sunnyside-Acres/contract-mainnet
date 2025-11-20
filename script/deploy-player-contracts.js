const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Player contracts...");

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
  const playerComponentAddress = deploymentInfo.contracts.PlayerComponent;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;
  const playerLogicAddress = deploymentInfo.contracts.PlayerLogic;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • Old PlayerComponent:", playerComponentAddress);
  console.log("   • Old PlayerProxy:", playerProxyAddress);
  console.log("   • Old PlayerLogic:", playerLogicAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);

  // === DEPLOY PLAYER CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Player Contracts...");

  // 1. Deploy PlayerComponent
  console.log("\n1️⃣ Deploying PlayerComponent...");
  const PlayerComponent = await ethers.getContractFactory("PlayerComponent");
  const playerComponent = await PlayerComponent.deploy();
  await playerComponent.waitForDeployment();
  const newPlayerComponentAddress = await playerComponent.getAddress();
  console.log("✅ PlayerComponent deployed to:", newPlayerComponentAddress);

  // 2. Deploy PlayerProxy
  console.log("\n2️⃣ Deploying PlayerProxy...");
  const PlayerProxy = await ethers.getContractFactory("PlayerProxy");
  const playerProxy = await PlayerProxy.deploy(
    worldAddress,
    deployer.address,
    newPlayerComponentAddress
  );
  await playerProxy.waitForDeployment();
  const newPlayerProxyAddress = await playerProxy.getAddress();
  console.log("✅ PlayerProxy deployed to:", newPlayerProxyAddress);

  // 3. Deploy PlayerLogic
  console.log("\n3️⃣ Deploying PlayerLogic...");
  const PlayerLogic = await ethers.getContractFactory("PlayerLogic");
  const playerLogic = await PlayerLogic.deploy(
    worldAddress,
    newPlayerProxyAddress,
    inventoryProxyAddress
  );
  await playerLogic.waitForDeployment();
  const newPlayerLogicAddress = await playerLogic.getAddress();
  console.log("✅ PlayerLogic deployed to:", newPlayerLogicAddress);

  console.log("\n✅ Tất cả Player contracts đã được deploy thành công!");

  // === REGISTER PLAYERLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering PlayerLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering PlayerLogic in World contract...");
    const registerTx = await world.registerLogic(newPlayerLogicAddress);
    await registerTx.wait();
    console.log("✅ PlayerLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register PlayerLogic:", error.message);
    throw error;
  }

  // === UPDATE PLAYER CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Player Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Player contracts mới
    deploymentInfo.contracts.PlayerComponent = newPlayerComponentAddress;
    deploymentInfo.contracts.PlayerProxy = newPlayerProxyAddress;
    deploymentInfo.contracts.PlayerLogic = newPlayerLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Player contracts updated in: ${deploymentPath}`);
    console.log(`   • PlayerComponent: ${newPlayerComponentAddress}`);
    console.log(`   • PlayerProxy: ${newPlayerProxyAddress}`);
    console.log(`   • PlayerLogic: ${newPlayerLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 PLAYER CONTRACTS TESTING COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New Player System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • PlayerComponent: ${newPlayerComponentAddress}`);
  console.log(`   • PlayerProxy: ${newPlayerProxyAddress}`);
  console.log(`   • PlayerLogic: ${newPlayerLogicAddress}`);
  console.log("\n✅ All Player contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Player contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Register PlayerLogic in World contract`);
  console.log(`   • Test Player functions`);
  console.log(`   • Update frontend configuration`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Player deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
