const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Raising contracts...");

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
  const weatherProxyAddress = deploymentInfo.contracts.WeatherProxy;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;

  // Lấy địa chỉ Raising contracts cũ (nếu có)
  const oldRaisingComponentAddress =
    deploymentInfo.contracts.RaisingComponent ||
    "0x0000000000000000000000000000000000000000";
  const oldRaisingProxyAddress =
    deploymentInfo.contracts.RaisingProxy ||
    "0x0000000000000000000000000000000000000000";
  const oldRaisingLogicAddress =
    deploymentInfo.contracts.RaisingLogic ||
    "0x0000000000000000000000000000000000000000";

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • WeatherProxy:", weatherProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • Old RaisingComponent:", oldRaisingComponentAddress);
  console.log("   • Old RaisingProxy:", oldRaisingProxyAddress);
  console.log("   • Old RaisingLogic:", oldRaisingLogicAddress);

  // === DEPLOY RAISING CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Raising Contracts...");

  // 1. Deploy RaisingComponent
  console.log("\n1️⃣ Deploying RaisingComponent...");
  const RaisingComponent = await ethers.getContractFactory("RaisingComponent");
  const raisingComponent = await RaisingComponent.deploy();
  await raisingComponent.waitForDeployment();
  const newRaisingComponentAddress = await raisingComponent.getAddress();
  console.log("✅ RaisingComponent deployed to:", newRaisingComponentAddress);

  // 2. Deploy RaisingProxy
  console.log("\n2️⃣ Deploying RaisingProxy...");
  const RaisingProxy = await ethers.getContractFactory("RaisingProxy");
  const raisingProxy = await RaisingProxy.deploy(
    worldAddress,
    deployer.address,
    newRaisingComponentAddress
  );
  await raisingProxy.waitForDeployment();
  const newRaisingProxyAddress = await raisingProxy.getAddress();
  console.log("✅ RaisingProxy deployed to:", newRaisingProxyAddress);

  // 3. Deploy RaisingLogic
  console.log("\n3️⃣ Deploying RaisingLogic...");
  const RaisingLogic = await ethers.getContractFactory("RaisingLogic");
  const raisingLogic = await RaisingLogic.deploy(
    worldAddress,
    newRaisingProxyAddress,
    inventoryProxyAddress,
    weatherProxyAddress,
    itemProxyAddress
  );
  await raisingLogic.waitForDeployment();
  const newRaisingLogicAddress = await raisingLogic.getAddress();
  console.log("✅ RaisingLogic deployed to:", newRaisingLogicAddress);

  console.log("\n✅ Tất cả Raising contracts đã được deploy thành công!");

  // === REGISTER RAISINGLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering RaisingLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering RaisingLogic in World contract...");
    const registerTx = await world.registerLogic(newRaisingLogicAddress);
    await registerTx.wait();
    console.log("✅ RaisingLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register RaisingLogic:", error.message);
    throw error;
  }

  // === UPDATE RAISING CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Raising Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Raising contracts mới
    deploymentInfo.contracts.RaisingComponent = newRaisingComponentAddress;
    deploymentInfo.contracts.RaisingProxy = newRaisingProxyAddress;
    deploymentInfo.contracts.RaisingLogic = newRaisingLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Raising contracts updated in: ${deploymentPath}`);
    console.log(`   • RaisingComponent: ${newRaisingComponentAddress}`);
    console.log(`   • RaisingProxy: ${newRaisingProxyAddress}`);
    console.log(`   • RaisingLogic: ${newRaisingLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 RAISING CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New Raising System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • RaisingComponent: ${newRaisingComponentAddress}`);
  console.log(`   • RaisingProxy: ${newRaisingProxyAddress}`);
  console.log(`   • RaisingLogic: ${newRaisingLogicAddress}`);
  console.log("\n📋 Dependencies:");
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • WeatherProxy: ${weatherProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log("\n✅ All Raising contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Raising contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Raising functions`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Verify contracts on block explorer`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Raising deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
