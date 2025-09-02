const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy FleaMarket contracts...");

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

  // Lấy địa chỉ FleaMarket contracts cũ (nếu có)
  const oldFleaMarketComponentAddress =
    deploymentInfo.contracts.FleaMarketComponent ||
    "0x0000000000000000000000000000000000000000";
  const oldFleaMarketProxyAddress =
    deploymentInfo.contracts.FleaMarketProxy ||
    "0x0000000000000000000000000000000000000000";
  const oldFleaMarketLogicAddress =
    deploymentInfo.contracts.FleaMarketLogic ||
    "0x0000000000000000000000000000000000000000";

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • Old FleaMarketComponent:", oldFleaMarketComponentAddress);
  console.log("   • Old FleaMarketProxy:", oldFleaMarketProxyAddress);
  console.log("   • Old FleaMarketLogic:", oldFleaMarketLogicAddress);

  // === DEPLOY FLEAMARKET CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying FleaMarket Contracts...");

  // 1. Deploy FleaMarketComponent
  console.log("\n1️⃣ Deploying FleaMarketComponent...");
  const FleaMarketComponent = await ethers.getContractFactory(
    "FleaMarketComponent"
  );
  const fleaMarketComponent = await FleaMarketComponent.deploy();
  await fleaMarketComponent.waitForDeployment();
  const newFleaMarketComponentAddress = await fleaMarketComponent.getAddress();
  console.log(
    "✅ FleaMarketComponent deployed to:",
    newFleaMarketComponentAddress
  );

  // 2. Deploy FleaMarketProxy
  console.log("\n2️⃣ Deploying FleaMarketProxy...");
  const FleaMarketProxy = await ethers.getContractFactory("FleaMarketProxy");
  const fleaMarketProxy = await FleaMarketProxy.deploy(
    worldAddress,
    deployer.address,
    newFleaMarketComponentAddress
  );
  await fleaMarketProxy.waitForDeployment();
  const newFleaMarketProxyAddress = await fleaMarketProxy.getAddress();
  console.log("✅ FleaMarketProxy deployed to:", newFleaMarketProxyAddress);

  // 3. Deploy FleaMarketLogic
  console.log("\n3️⃣ Deploying FleaMarketLogic...");
  const FleaMarketLogic = await ethers.getContractFactory("FleaMarketLogic");
  const fleaMarketLogic = await FleaMarketLogic.deploy(
    worldAddress,
    newFleaMarketProxyAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress
  );
  await fleaMarketLogic.waitForDeployment();
  const newFleaMarketLogicAddress = await fleaMarketLogic.getAddress();
  console.log("✅ FleaMarketLogic deployed to:", newFleaMarketLogicAddress);

  console.log("\n✅ Tất cả FleaMarket contracts đã được deploy thành công!");

  // === REGISTER FLEAMARKETLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering FleaMarketLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering FleaMarketLogic in World contract...");
    const registerTx = await world.registerLogic(newFleaMarketLogicAddress);
    await registerTx.wait();
    console.log("✅ FleaMarketLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register FleaMarketLogic:", error.message);
    throw error;
  }

  // === UPDATE FLEAMARKET CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating FleaMarket Contracts in JSON...");

  try {
    // Cập nhật địa chỉ FleaMarket contracts mới
    deploymentInfo.contracts.FleaMarketComponent =
      newFleaMarketComponentAddress;
    deploymentInfo.contracts.FleaMarketProxy = newFleaMarketProxyAddress;
    deploymentInfo.contracts.FleaMarketLogic = newFleaMarketLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ FleaMarket contracts updated in: ${deploymentPath}`);
    console.log(`   • FleaMarketComponent: ${newFleaMarketComponentAddress}`);
    console.log(`   • FleaMarketProxy: ${newFleaMarketProxyAddress}`);
    console.log(`   • FleaMarketLogic: ${newFleaMarketLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 FLEAMARKET CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New FleaMarket System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • FleaMarketComponent: ${newFleaMarketComponentAddress}`);
  console.log(`   • FleaMarketProxy: ${newFleaMarketProxyAddress}`);
  console.log(`   • FleaMarketLogic: ${newFleaMarketLogicAddress}`);
  console.log("\n📋 Dependencies:");
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log("\n✅ All FleaMarket contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new FleaMarket contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test FleaMarket functions`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Verify contracts on block explorer`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ FleaMarket deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
