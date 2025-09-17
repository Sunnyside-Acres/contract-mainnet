const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy CraftingLogic only...");

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
  const craftingProxyAddress = deploymentInfo.contracts.CraftingProxy;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • CraftingProxy:", craftingProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);

  // Kiểm tra CraftingProxy đã tồn tại chưa
  if (!craftingProxyAddress) {
    throw new Error(
      "CraftingProxy chưa được deploy. Vui lòng chạy deploy-crafting-contracts.js trước!"
    );
  }

  // === DEPLOY CRAFTINGLOGIC ONLY ===
  console.log("\n🚀 PHASE: Deploying CraftingLogic Only...");

  // Deploy CraftingLogic
  console.log("\n1️⃣ Deploying CraftingLogic...");
  const CraftingLogic = await ethers.getContractFactory("CraftingLogic");
  const craftingLogic = await CraftingLogic.deploy(
    worldAddress,
    craftingProxyAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress
  );
  await craftingLogic.waitForDeployment();
  const craftingLogicAddress = await craftingLogic.getAddress();
  console.log("✅ CraftingLogic deployed to:", craftingLogicAddress);

  console.log("\n✅ CraftingLogic đã được deploy thành công!");

  // === REGISTER CRAFTINGLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering CraftingLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering CraftingLogic in World contract...");
    const registerTx = await world.registerLogic(craftingLogicAddress);
    await registerTx.wait();
    console.log("✅ CraftingLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register CraftingLogic:", error.message);
    throw error;
  }

  // === UPDATE CRAFTINGLOGIC IN JSON ===
  console.log("\n💾 PHASE: Updating CraftingLogic in JSON...");

  try {
    // Cập nhật địa chỉ CraftingLogic mới
    deploymentInfo.contracts.CraftingLogic = craftingLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ CraftingLogic updated in: ${deploymentPath}`);
    console.log(`   • CraftingLogic: ${craftingLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 CRAFTINGLOGIC DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 CraftingLogic Details:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • CraftingLogic: ${craftingLogicAddress}`);
  console.log("\n🔗 Dependencies:");
  console.log(`   • CraftingProxy: ${craftingProxyAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log("\n✅ CraftingLogic deployed successfully!");
  console.log("\n📝 Deployment file updated with new CraftingLogic!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test CraftingLogic functions`);
  console.log(`   • Create initial recipes`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Test crafting mechanics with new logic`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ CraftingLogic deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
