const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy NPCMarketLogic contract...");

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
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  // Lấy địa chỉ NPCMarket contracts cũ (nếu có)
  const oldNPCMarketComponentAddress =
    deploymentInfo.contracts.NPCMarketComponent ||
    "0x0000000000000000000000000000000000000000";
  const oldNPCMarketProxyAddress =
    deploymentInfo.contracts.NPCMarketProxy ||
    "0x0000000000000000000000000000000000000000";
  const oldNPCMarketLogicAddress =
    deploymentInfo.contracts.NPCMarketLogic ||
    "0x0000000000000000000000000000000000000000";

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • Old NPCMarketComponent:", oldNPCMarketComponentAddress);
  console.log("   • Old NPCMarketProxy:", oldNPCMarketProxyAddress);
  console.log("   • Old NPCMarketLogic:", oldNPCMarketLogicAddress);

  // === DEPLOY NPCMARKET LOGIC ONLY ===
  console.log("\n🚀 PHASE: Deploying NPCMarketLogic Contract...");

  // Deploy NPCMarketLogic
  console.log("\n1️⃣ Deploying NPCMarketLogic...");
  const NPCMarketLogic = await ethers.getContractFactory("NPCMarketLogic");
  const npcMarketLogic = await NPCMarketLogic.deploy(
    worldAddress,
    oldNPCMarketProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await npcMarketLogic.waitForDeployment();
  const newNPCMarketLogicAddress = await npcMarketLogic.getAddress();
  console.log("✅ NPCMarketLogic deployed to:", newNPCMarketLogicAddress);

  console.log("\n✅ NPCMarketLogic đã được deploy thành công!");

  // === REGISTER NPCMARKETLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering NPCMarketLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering NPCMarketLogic in World contract...");
    const registerTx = await world.registerLogic(newNPCMarketLogicAddress);
    await registerTx.wait();
    console.log("✅ NPCMarketLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register NPCMarketLogic:", error.message);
    throw error;
  }

  // === UPDATE NPCMARKET CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating NPCMarket Contracts in JSON...");

  try {
    // Cập nhật địa chỉ NPCMarketLogic mới
    deploymentInfo.contracts.NPCMarketLogic = newNPCMarketLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ NPCMarketLogic updated in: ${deploymentPath}`);
    console.log(`   • NPCMarketLogic: ${newNPCMarketLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 NPCMARKET LOGIC DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New NPCMarketLogic Contract:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • NPCMarketLogic: ${newNPCMarketLogicAddress}`);
  console.log("\n📋 Dependencies:");
  console.log(`   • NPCMarketProxy: ${oldNPCMarketProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log("\n✅ NPCMarketLogic deployed successfully!");
  console.log("\n📝 Deployment file updated with new NPCMarketLogic!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test NPCMarket functions`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Verify contracts on block explorer`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NPCMarketLogic deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
