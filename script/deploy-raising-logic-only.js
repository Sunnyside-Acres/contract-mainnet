const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy RaisingLogic only...");

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
  const raisingProxyAddress = deploymentInfo.contracts.RaisingProxy;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const weatherProxyAddress = deploymentInfo.contracts.WeatherProxy;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • RaisingProxy:", raisingProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • WeatherProxy:", weatherProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);

  // Kiểm tra RaisingProxy đã tồn tại chưa
  if (!raisingProxyAddress) {
    throw new Error(
      "RaisingProxy chưa được deploy. Vui lòng chạy deploy-raising-contracts.js trước!"
    );
  }

  // === DEPLOY RAISINGLOGIC ONLY ===
  console.log("\n🚀 PHASE: Deploying RaisingLogic Only...");

  // Deploy RaisingLogic
  console.log("\n1️⃣ Deploying RaisingLogic...");
  const RaisingLogic = await ethers.getContractFactory("RaisingLogic");
  const raisingLogic = await RaisingLogic.deploy(
    worldAddress,
    raisingProxyAddress,
    inventoryProxyAddress,
    weatherProxyAddress,
    itemProxyAddress
  );
  await raisingLogic.waitForDeployment();
  const raisingLogicAddress = await raisingLogic.getAddress();
  console.log("✅ RaisingLogic deployed to:", raisingLogicAddress);

  console.log("\n✅ RaisingLogic đã được deploy thành công!");

  // === REGISTER RAISINGLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering RaisingLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering RaisingLogic in World contract...");
    const registerTx = await world.registerLogic(raisingLogicAddress);
    await registerTx.wait();
    console.log("✅ RaisingLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register RaisingLogic:", error.message);
    throw error;
  }

  // === UPDATE RAISINGLOGIC IN JSON ===
  console.log("\n💾 PHASE: Updating RaisingLogic in JSON...");

  try {
    // Cập nhật địa chỉ RaisingLogic mới
    deploymentInfo.contracts.RaisingLogic = raisingLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ RaisingLogic updated in: ${deploymentPath}`);
    console.log(`   • RaisingLogic: ${raisingLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 RAISINGLOGIC DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 RaisingLogic Details:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • RaisingLogic: ${raisingLogicAddress}`);
  console.log("\n🔗 Dependencies:");
  console.log(`   • RaisingProxy: ${raisingProxyAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • WeatherProxy: ${weatherProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log("\n✅ RaisingLogic deployed successfully!");
  console.log("\n📝 Deployment file updated with new RaisingLogic!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test RaisingLogic functions`);
  console.log(`   • Test raising mechanics with new logic`);
  console.log(`   • Test bonus feeding feature (3x feed = +1 item)`);
  console.log(`   • Update frontend configuration`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ RaisingLogic deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });

