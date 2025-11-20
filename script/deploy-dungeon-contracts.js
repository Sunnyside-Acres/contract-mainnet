const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Dungeon contracts...");

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
  const dungeonComponentAddress = deploymentInfo.contracts.DungeonComponent;
  const dungeonProxyAddress = deploymentInfo.contracts.DungeonProxy;
  const dungeonLogicAddress = deploymentInfo.contracts.DungeonLogic;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • Old DungeonComponent:", dungeonComponentAddress);
  console.log("   • Old DungeonProxy:", dungeonProxyAddress);
  console.log("   • Old DungeonLogic:", dungeonLogicAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);

  // === DEPLOY DUNGEON CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Dungeon Contracts...");

  // 1. Deploy DungeonComponent
  console.log("\n1️⃣ Deploying DungeonComponent...");
  const DungeonComponent = await ethers.getContractFactory("DungeonComponent");
  const dungeonComponent = await DungeonComponent.deploy();
  await dungeonComponent.waitForDeployment();
  const newDungeonComponentAddress = await dungeonComponent.getAddress();
  console.log("✅ DungeonComponent deployed to:", newDungeonComponentAddress);

  // 2. Deploy DungeonProxy
  console.log("\n2️⃣ Deploying DungeonProxy...");
  const DungeonProxy = await ethers.getContractFactory("DungeonProxy");
  const dungeonProxy = await DungeonProxy.deploy(
    worldAddress,
    deployer.address,
    newDungeonComponentAddress
  );
  await dungeonProxy.waitForDeployment();
  const newDungeonProxyAddress = await dungeonProxy.getAddress();
  console.log("✅ DungeonProxy deployed to:", newDungeonProxyAddress);

  // 3. Deploy DungeonLogic
  console.log("\n3️⃣ Deploying DungeonLogic...");
  const DungeonLogic = await ethers.getContractFactory("DungeonLogic");
  const dungeonLogic = await DungeonLogic.deploy(
    worldAddress,
    newDungeonProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await dungeonLogic.waitForDeployment();
  const newDungeonLogicAddress = await dungeonLogic.getAddress();
  console.log("✅ DungeonLogic deployed to:", newDungeonLogicAddress);

  console.log("\n✅ Tất cả Dungeon contracts đã được deploy thành công!");

  // === REGISTER DUNGEONLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering DungeonLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering DungeonLogic in World contract...");
    const registerTx = await world.registerLogic(newDungeonLogicAddress);
    await registerTx.wait();
    console.log("✅ DungeonLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register DungeonLogic:", error.message);
    throw error;
  }

  // === UPDATE DUNGEON CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Dungeon Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Dungeon contracts mới
    deploymentInfo.contracts.DungeonComponent = newDungeonComponentAddress;
    deploymentInfo.contracts.DungeonProxy = newDungeonProxyAddress;
    deploymentInfo.contracts.DungeonLogic = newDungeonLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Dungeon contracts updated in: ${deploymentPath}`);
    console.log(`   • DungeonComponent: ${newDungeonComponentAddress}`);
    console.log(`   • DungeonProxy: ${newDungeonProxyAddress}`);
    console.log(`   • DungeonLogic: ${newDungeonLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 DUNGEON CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New Dungeon System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • DungeonComponent: ${newDungeonComponentAddress}`);
  console.log(`   • DungeonProxy: ${newDungeonProxyAddress}`);
  console.log(`   • DungeonLogic: ${newDungeonLogicAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log("\n✅ All Dungeon contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Dungeon contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Register DungeonLogic in World contract`);
  console.log(`   • Test Dungeon functions`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Deploy betting integration if needed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Dungeon deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
