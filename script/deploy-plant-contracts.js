const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Plant contracts...");

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
  const plantComponentAddress = deploymentInfo.contracts.PlantComponent;
  const plantProxyAddress = deploymentInfo.contracts.PlantProxy;
  const plantLogicAddress = deploymentInfo.contracts.PlantLogic;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • Old PlantComponent:", plantComponentAddress);
  console.log("   • Old PlantProxy:", plantProxyAddress);
  console.log("   • Old PlantLogic:", plantLogicAddress);

  // === DEPLOY PLANT CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Plant Contracts...");

  // 1. Deploy PlantComponent
  console.log("\n1️⃣ Deploying PlantComponent...");
  const PlantComponent = await ethers.getContractFactory("PlantComponent");
  const plantComponent = await PlantComponent.deploy();
  await plantComponent.waitForDeployment();
  const newPlantComponentAddress = await plantComponent.getAddress();
  console.log("✅ PlantComponent deployed to:", newPlantComponentAddress);

  // 2. Deploy PlantProxy
  console.log("\n2️⃣ Deploying PlantProxy...");
  const PlantProxy = await ethers.getContractFactory("PlantProxy");
  const plantProxy = await PlantProxy.deploy(
    worldAddress,
    deployer.address,
    newPlantComponentAddress
  );
  await plantProxy.waitForDeployment();
  const newPlantProxyAddress = await plantProxy.getAddress();
  console.log("✅ PlantProxy deployed to:", newPlantProxyAddress);

  // 3. Deploy PlantLogic
  console.log("\n3️⃣ Deploying PlantLogic...");
  const PlantLogic = await ethers.getContractFactory("PlantLogic");
  const plantLogic = await PlantLogic.deploy(
    worldAddress,
    newPlantProxyAddress,
    deploymentInfo.contracts.PlotProxy,
    deploymentInfo.contracts.InventoryProxy,
    deploymentInfo.contracts.WeatherProxy,
    deploymentInfo.contracts.ItemProxy
  );
  await plantLogic.waitForDeployment();
  const newPlantLogicAddress = await plantLogic.getAddress();
  console.log("✅ PlantLogic deployed to:", newPlantLogicAddress);

  console.log("\n✅ Tất cả Plant contracts đã được deploy thành công!");

  // === REGISTER PLANTLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering PlantLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering PlantLogic in World contract...");
    const registerTx = await world.registerLogic(newPlantLogicAddress);
    await registerTx.wait();
    console.log("✅ PlantLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register PlantLogic:", error.message);
    throw error;
  }

  // === UPDATE PLANT CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Plant Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Plant contracts mới
    deploymentInfo.contracts.PlantComponent = newPlantComponentAddress;
    deploymentInfo.contracts.PlantProxy = newPlantProxyAddress;
    deploymentInfo.contracts.PlantLogic = newPlantLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Plant contracts updated in: ${deploymentPath}`);
    console.log(`   • PlantComponent: ${newPlantComponentAddress}`);
    console.log(`   • PlantProxy: ${newPlantProxyAddress}`);
    console.log(`   • PlantLogic: ${newPlantLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 PLANT CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New Plant System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • PlantComponent: ${newPlantComponentAddress}`);
  console.log(`   • PlantProxy: ${newPlantProxyAddress}`);
  console.log(`   • PlantLogic: ${newPlantLogicAddress}`);
  console.log("\n📋 Dependencies:");
  console.log(`   • PlotProxy: ${deploymentInfo.contracts.PlotProxy}`);
  console.log(
    `   • InventoryProxy: ${deploymentInfo.contracts.InventoryProxy}`
  );
  console.log(`   • WeatherProxy: ${deploymentInfo.contracts.WeatherProxy}`);
  console.log(`   • ItemProxy: ${deploymentInfo.contracts.ItemProxy}`);
  console.log("\n✅ All Plant contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Plant contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Register PlantLogic in World contract`);
  console.log(`   • Test Plant functions`);
  console.log(`   • Update frontend configuration`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Plant deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
