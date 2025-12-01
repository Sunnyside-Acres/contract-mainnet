const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy CheckIn contracts...");

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
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  console.log("\n📋 Required contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);

  // Kiểm tra các contracts cần thiết
  if (
    !worldAddress ||
    !inventoryProxyAddress ||
    !playerProxyAddress
  ) {
    throw new Error(
      "Thiếu các contracts cần thiết. Hãy deploy các contracts cơ bản trước."
    );
  }

  // === DEPLOY CHECKIN CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying CheckIn Contracts...");

  // 1. Deploy CheckInComponent
  console.log("\n1️⃣ Deploying CheckInComponent...");
  const CheckInComponent = await ethers.getContractFactory("CheckInComponent");
  const checkInComponent = await CheckInComponent.deploy();
  await checkInComponent.waitForDeployment();
  const checkInComponentAddress = await checkInComponent.getAddress();
  console.log("✅ CheckInComponent deployed to:", checkInComponentAddress);

  // 2. Deploy CheckInProxy
  console.log("\n2️⃣ Deploying CheckInProxy...");
  const CheckInProxy = await ethers.getContractFactory("CheckInProxy");
  const checkInProxy = await CheckInProxy.deploy(
    worldAddress,
    deployer.address,
    checkInComponentAddress
  );
  await checkInProxy.waitForDeployment();
  const checkInProxyAddress = await checkInProxy.getAddress();
  console.log("✅ CheckInProxy deployed to:", checkInProxyAddress);

  // 3. Deploy CheckInLogic
  console.log("\n3️⃣ Deploying CheckInLogic...");
  const CheckInLogic = await ethers.getContractFactory("CheckInLogic");
  const checkInLogic = await CheckInLogic.deploy(
    worldAddress,
    inventoryProxyAddress,
    checkInProxyAddress,
    playerProxyAddress
  );
  await checkInLogic.waitForDeployment();
  const checkInLogicAddress = await checkInLogic.getAddress();
  console.log("✅ CheckInLogic deployed to:", checkInLogicAddress);

  console.log("\n✅ Tất cả CheckIn contracts đã được deploy thành công!");

  // === REGISTER CHECKINLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering CheckInLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering CheckInLogic in World contract...");
    const registerTx = await world.registerLogic(checkInLogicAddress);
    await registerTx.wait();
    console.log("✅ CheckInLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register CheckInLogic:", error.message);
    throw error;
  }

  // === UPDATE CHECKIN CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating CheckIn Contracts in JSON...");

  try {
    // Cập nhật địa chỉ CheckIn contracts mới
    deploymentInfo.contracts.CheckInComponent = checkInComponentAddress;
    deploymentInfo.contracts.CheckInProxy = checkInProxyAddress;
    deploymentInfo.contracts.CheckInLogic = checkInLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ CheckIn contracts updated in: ${deploymentPath}`);
    console.log(`   • CheckInComponent: ${checkInComponentAddress}`);
    console.log(`   • CheckInProxy: ${checkInProxyAddress}`);
    console.log(`   • CheckInLogic: ${checkInLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 CHECKIN CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New CheckIn System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • CheckInComponent: ${checkInComponentAddress}`);
  console.log(`   • CheckInProxy: ${checkInProxyAddress}`);
  console.log(`   • CheckInLogic: ${checkInLogicAddress}`);
  console.log("\n📋 CheckIn System Dependencies:");
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log("\n✅ All CheckIn contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new CheckIn contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • CheckInLogic đã được đăng ký trong World contract`);
  console.log(`   • Configure daily rewards và milestone rewards`);
  console.log(`   • Test CheckIn functions (checkIn, getDailyRewardsAndMilestones)`);
  console.log(`   • Update frontend configuration`);
  console.log("\n📋 CheckIn System Features:");
  console.log(`   • Daily check-in với 28-day cycle`);
  console.log(`   • Streak tracking (chuỗi ngày check-in liên tiếp)`);
  console.log(`   • Daily rewards (phần thưởng hàng ngày)`);
  console.log(`   • Milestone rewards (phần thưởng tại ngày 7, 14, 28)`);
  console.log(`   • Reward distribution (Items và Sunlight)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ CheckIn deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });

