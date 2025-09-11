const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Gacha contracts...");

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

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);

  // === DEPLOY GACHA CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Gacha Contracts...");

  // 1. Deploy GachaLogic (chỉ cần Logic vì không có Component và Proxy riêng)
  console.log("\n1️⃣ Deploying GachaLogic...");
  const GachaLogic = await ethers.getContractFactory("GachaLogic");
  const gachaLogic = await GachaLogic.deploy(
    worldAddress,
    playerProxyAddress,
    inventoryProxyAddress,
    itemProxyAddress
  );
  await gachaLogic.waitForDeployment();
  const gachaLogicAddress = await gachaLogic.getAddress();
  console.log("✅ GachaLogic deployed to:", gachaLogicAddress);

  console.log("\n✅ Tất cả Gacha contracts đã được deploy thành công!");

  // === REGISTER GACHALOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering GachaLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering GachaLogic in World contract...");
    const registerTx = await world.registerLogic(gachaLogicAddress);
    await registerTx.wait();
    console.log("✅ GachaLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register GachaLogic:", error.message);
    throw error;
  }

  // === UPDATE GACHA CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Gacha Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Gacha contracts mới
    deploymentInfo.contracts.GachaLogic = gachaLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Gacha contracts updated in: ${deploymentPath}`);
    console.log(`   • GachaLogic: ${gachaLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 GACHA CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Gacha System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • GachaLogic: ${gachaLogicAddress}`);
  console.log("\n🔗 Dependencies:");
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log("\n✅ All Gacha contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Gacha contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test Gacha functions`);
  console.log(`   • Create items with drop configurations`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Test item opening mechanics`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Gacha deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
