const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Task System lên Local Network...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId);
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Đọc địa chỉ contract từ file JSON đã có
  console.log("\n📖 Đọc địa chỉ contract từ file JSON...");

  let existingAddresses;
  try {
    const localPath = "./deployed/contract-addresses-local.json";
    if (fs.existsSync(localPath)) {
      existingAddresses = JSON.parse(fs.readFileSync(localPath, "utf8"));
      console.log("✅ Đọc từ file local thành công");
    } else {
      throw new Error("Không tìm thấy file địa chỉ contract local");
    }
  } catch (error) {
    console.error("❌ Lỗi đọc file địa chỉ:", error.message);
    console.log(
      "💡 Hãy chạy script deploy local đầy đủ trước để có file địa chỉ"
    );
    process.exit(1);
  }

  // Lấy địa chỉ các contract cần thiết cho Task System
  const worldAddress = existingAddresses.contracts.World;
  const playerProxyAddress = existingAddresses.contracts.PlayerProxy;
  const inventoryProxyAddress = existingAddresses.contracts.InventoryProxy;
  const itemProxyAddress = existingAddresses.contracts.ItemProxy;

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   PlayerProxy:", playerProxyAddress);
  console.log("   InventoryProxy:", inventoryProxyAddress);
  console.log("   ItemProxy:", itemProxyAddress);

  // Kiểm tra World contract
  console.log("\n🔍 Kiểm tra World contract...");
  const World = await ethers.getContractFactory("World");
  const world = World.attach(worldAddress);

  try {
    const admin = await world.admin();
    console.log("✅ World contract hợp lệ, admin:", admin);
  } catch (error) {
    console.error("❌ World contract không hợp lệ:", error.message);
    process.exit(1);
  }

  // Deploy TaskComponent (Storage Contract)
  console.log("\n🎯 Deploying TaskComponent (Storage)...");
  const TaskComponent = await ethers.getContractFactory("TaskComponent");
  const taskComponent = await TaskComponent.deploy();
  await taskComponent.waitForDeployment();
  const taskComponentAddress = await taskComponent.getAddress();
  console.log("✅ TaskComponent deployed to:", taskComponentAddress);

  // Deploy TaskProxy (Proxy Contract)
  console.log("\n🎯 Deploying TaskProxy (Proxy)...");
  const TaskProxy = await ethers.getContractFactory("TaskProxy");
  const taskProxy = await TaskProxy.deploy(
    worldAddress,
    deployer.address,
    taskComponentAddress // Implementation address
  );
  await taskProxy.waitForDeployment();
  const taskProxyAddress = await taskProxy.getAddress();
  console.log("✅ TaskProxy deployed to:", taskProxyAddress);

  // Deploy TaskLogic (Logic Contract)
  console.log("\n🎯 Deploying TaskLogic (Logic)...");
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

  // Đăng ký TaskLogic trong World
  console.log("\n🔗 Đăng ký TaskLogic trong World...");
  const registerTaskLogicTx = await world.registerLogic(taskLogicAddress);
  await registerTaskLogicTx.wait();
  console.log("✅ TaskLogic registered in World");

  // Cập nhật thông tin deploy
  const updatedDeploymentInfo = {
    ...existingAddresses,
    contracts: {
      ...existingAddresses.contracts,
      TaskComponent: taskComponentAddress,
      TaskProxy: taskProxyAddress,
      TaskLogic: taskLogicAddress,
    },
    lastUpdated: new Date().toISOString(),
    taskSystemDeployed: true,
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-local.json`;

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(updatedDeploymentInfo, null, 2)
  );
  console.log(`\n💾 Updated deployment info saved to: ${deploymentPath}`);

  console.log("\n🎉 Deploy Task System lên Local Network hoàn tất thành công!");
  console.log("📊 Đã deploy 3 contracts:");
  console.log("   - TaskComponent (Storage):", taskComponentAddress);
  console.log("   - TaskProxy (Proxy):", taskProxyAddress);
  console.log("   - TaskLogic (Logic):", taskLogicAddress);
  console.log("✨ Hệ thống Task đã sẵn sàng sử dụng");
  console.log("🔗 TaskLogic đã được đăng ký trong World contract");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. TaskLogic address:", taskLogicAddress);
  console.log("2. Sử dụng TaskLogic để tương tác với Task system");
  console.log("3. Các function chính:");
  console.log("   - Admin: createTaskProof, revokeTaskProof, extendTaskProof");
  console.log("   - Player: claimTaskReward");
  console.log("   - View: getMyProofs, getTaskProof, getTaskStatistics");
  console.log("4. Quản lý proof và claim thưởng task");
  console.log("5. Tích hợp với Player, Inventory và Item system");
  console.log("6. Hệ thống proof có thời gian hết hạn và có thể gia hạn");

  console.log("\n🧪 Test Scripts:");
  console.log(
    "1. Tạo task proof: await taskLogic.createTaskProof(taskId, player, sunny, exp, items, quantities, expiresIn)"
  );
  console.log("2. Claim reward: await taskLogic.claimTaskReward(proofId)");
  console.log("3. Xem proof: await taskLogic.getTaskProof(proofId)");
  console.log("4. Xem thống kê: await taskLogic.getTaskStatistics()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
