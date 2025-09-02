const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Task contracts...");

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
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;

  console.log("\n📋 Required contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • ItemProxy:", itemProxyAddress);

  // Kiểm tra các contracts cần thiết
  if (
    !worldAddress ||
    !playerProxyAddress ||
    !inventoryProxyAddress ||
    !itemProxyAddress
  ) {
    throw new Error(
      "Thiếu các contracts cần thiết. Hãy deploy các contracts cơ bản trước."
    );
  }

  // === DEPLOY TASK CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Task Contracts...");

  // 1. Deploy TaskComponent
  console.log("\n1️⃣ Deploying TaskComponent...");
  const TaskComponent = await ethers.getContractFactory("TaskComponent");
  const taskComponent = await TaskComponent.deploy();
  await taskComponent.waitForDeployment();
  const taskComponentAddress = await taskComponent.getAddress();
  console.log("✅ TaskComponent deployed to:", taskComponentAddress);

  // 2. Deploy TaskProxy
  console.log("\n2️⃣ Deploying TaskProxy...");
  const TaskProxy = await ethers.getContractFactory("TaskProxy");
  const taskProxy = await TaskProxy.deploy(
    worldAddress,
    deployer.address,
    taskComponentAddress
  );
  await taskProxy.waitForDeployment();
  const taskProxyAddress = await taskProxy.getAddress();
  console.log("✅ TaskProxy deployed to:", taskProxyAddress);

  // 3. Deploy TaskLogic
  console.log("\n3️⃣ Deploying TaskLogic...");
  const TaskLogic = await ethers.getContractFactory("TaskLogic");
  const taskLogic = await TaskLogic.deploy(
    worldAddress,
    taskProxyAddress,
    playerProxyAddress,
    inventoryProxyAddress,
    itemProxyAddress
  );
  await taskLogic.waitForDeployment();
  const taskLogicAddress = await taskLogic.getAddress();
  console.log("✅ TaskLogic deployed to:", taskLogicAddress);

  console.log("\n✅ Tất cả Task contracts đã được deploy thành công!");

  // === REGISTER TASKLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering TaskLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering TaskLogic in World contract...");
    const registerTx = await world.registerLogic(taskLogicAddress);
    await registerTx.wait();
    console.log("✅ TaskLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register TaskLogic:", error.message);
    throw error;
  }

  // === UPDATE TASK CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Task Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Task contracts mới
    deploymentInfo.contracts.TaskComponent = taskComponentAddress;
    deploymentInfo.contracts.TaskProxy = taskProxyAddress;
    deploymentInfo.contracts.TaskLogic = taskLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Task contracts updated in: ${deploymentPath}`);
    console.log(`   • TaskComponent: ${taskComponentAddress}`);
    console.log(`   • TaskProxy: ${taskProxyAddress}`);
    console.log(`   • TaskLogic: ${taskLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 TASK CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New Task System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • TaskComponent: ${taskComponentAddress}`);
  console.log(`   • TaskProxy: ${taskProxyAddress}`);
  console.log(`   • TaskLogic: ${taskLogicAddress}`);
  console.log("\n📋 Task System Dependencies (Proxy Pattern):");
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log("\n✅ All Task contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Task contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • TaskLogic đã được đăng ký trong World contract`);
  console.log(
    `   • TaskLogic sử dụng proxy pattern để tương tác với các hệ thống khác`
  );
  console.log(`   • Test Task functions (createTaskProof, claimTaskReward)`);
  console.log(`   • Update frontend configuration`);
  console.log("\n📋 Task System Features:");
  console.log(`   • Admin tạo proof cho task hoàn thành`);
  console.log(`   • Player claim thưởng (Sunny, Sunlight, XP, Items)`);
  console.log(`   • Quản lý thời gian hết hạn proof`);
  console.log(`   • Thống kê và báo cáo task system`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Task deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
