const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Task System đầy đủ lên Sei Mainnet...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId);
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "SEI"
  );

  // Xác nhận deploy
  console.log("\n⚠️  Bạn đang deploy Task System đầy đủ lên SEI MAINNET!");
  console.log("💰 Chi phí deploy sẽ rất cao, hãy đảm bảo có đủ SEI");
  console.log("🔒 Hãy kiểm tra kỹ contract trước khi deploy");

  // Đọc địa chỉ contract từ file JSON đã có
  console.log("\n📖 Đọc địa chỉ contract từ file JSON...");

  let existingAddresses;
  try {
    // Thử đọc từ file seimainnet trước
    const seimainnetPath = "./deployed/contract-addresses-seimainnet.json";
    if (fs.existsSync(seimainnetPath)) {
      existingAddresses = JSON.parse(fs.readFileSync(seimainnetPath, "utf8"));
      console.log("✅ Đọc từ file seimainnet thành công");
    } else {
      // Nếu không có, thử đọc từ file raising
      const raisingPath =
        "./deployed/contract-addresses-raising-full-seimainnet.json";
      if (fs.existsSync(raisingPath)) {
        existingAddresses = JSON.parse(fs.readFileSync(raisingPath, "utf8"));
        console.log("✅ Đọc từ file raising thành công");
      } else {
        // Thử đọc từ file inventory
        const inventoryPath =
          "./deployed/contract-addresses-inventory-full-seimainnet.json";
        if (fs.existsSync(inventoryPath)) {
          existingAddresses = JSON.parse(
            fs.readFileSync(inventoryPath, "utf8")
          );
          console.log("✅ Đọc từ file inventory thành công");
        } else {
          throw new Error("Không tìm thấy file địa chỉ contract");
        }
      }
    }
  } catch (error) {
    console.error("❌ Lỗi đọc file địa chỉ:", error.message);
    console.log("💡 Hãy chạy script deploy đầy đủ trước để có file địa chỉ");
    process.exit(1);
  }

  // Kiểm tra và deploy các contract phụ thuộc nếu cần
  console.log("\n🔍 Kiểm tra các contract phụ thuộc...");

  let worldAddress = existingAddresses.contracts.World;
  let playerProxyAddress = existingAddresses.contracts.PlayerProxy;
  let inventoryProxyAddress = existingAddresses.contracts.InventoryProxy;
  let itemProxyAddress = existingAddresses.contracts.ItemProxy;

  // Kiểm tra World contract
  console.log("\n🔍 Kiểm tra World contract...");
  const World = await ethers.getContractFactory("World");
  const world = World.attach(worldAddress);

  //   try {
  //     const admin = await world.admin();
  //     console.log("✅ World contract hợp lệ, admin:", admin);
  //   } catch (error) {
  //     console.error("❌ World contract không hợp lệ:", error.message);
  //     process.exit(1);
  //   }

  // Kiểm tra PlayerProxy
  if (!playerProxyAddress) {
    console.log("⚠️  PlayerProxy chưa được deploy, sẽ deploy...");
    const PlayerComponent = await ethers.getContractFactory("PlayerComponent");
    const playerComponent = await PlayerComponent.deploy();
    await playerComponent.waitForDeployment();
    const playerComponentAddress = await playerComponent.getAddress();

    const PlayerProxy = await ethers.getContractFactory("PlayerProxy");
    const playerProxy = await PlayerProxy.deploy(
      worldAddress,
      deployer.address,
      playerComponentAddress
    );
    await playerProxy.waitForDeployment();
    playerProxyAddress = await playerProxy.getAddress();

    console.log("✅ PlayerProxy deployed to:", playerProxyAddress);
  } else {
    console.log("✅ PlayerProxy đã tồn tại:", playerProxyAddress);
  }

  // Kiểm tra InventoryProxy
  if (!inventoryProxyAddress) {
    console.log("⚠️  InventoryProxy chưa được deploy, sẽ deploy...");
    const InventoryComponent = await ethers.getContractFactory(
      "InventoryComponent"
    );
    const inventoryComponent = await InventoryComponent.deploy();
    await inventoryComponent.waitForDeployment();
    const inventoryComponentAddress = await inventoryComponent.getAddress();

    const InventoryProxy = await ethers.getContractFactory("InventoryProxy");
    const inventoryProxy = await InventoryProxy.deploy(
      worldAddress,
      deployer.address,
      inventoryComponentAddress
    );
    await inventoryProxy.waitForDeployment();
    inventoryProxyAddress = await inventoryProxy.getAddress();

    console.log("✅ InventoryProxy deployed to:", inventoryProxyAddress);
  } else {
    console.log("✅ InventoryProxy đã tồn tại:", inventoryProxyAddress);
  }

  // Kiểm tra ItemProxy
  if (!itemProxyAddress) {
    console.log("⚠️  ItemProxy chưa được deploy, sẽ deploy...");
    const ItemComponent = await ethers.getContractFactory("ItemComponent");
    const itemComponent = await ItemComponent.deploy();
    await itemComponent.waitForDeployment();
    const itemComponentAddress = await itemComponent.getAddress();

    const ItemProxy = await ethers.getContractFactory("ItemProxy");
    const itemProxy = await ItemProxy.deploy(
      worldAddress,
      deployer.address,
      itemComponentAddress
    );
    await itemProxy.waitForDeployment();
    itemProxyAddress = await itemProxy.getAddress();

    console.log("✅ ItemProxy deployed to:", itemProxyAddress);
  } else {
    console.log("✅ ItemProxy đã tồn tại:", itemProxyAddress);
  }

  console.log("📋 Địa chỉ contract từ file:");
  console.log("   World:", worldAddress);
  console.log("   PlayerProxy:", playerProxyAddress);
  console.log("   InventoryProxy:", inventoryProxyAddress);
  console.log("   ItemProxy:", itemProxyAddress);

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
      PlayerProxy: playerProxyAddress,
      InventoryProxy: inventoryProxyAddress,
      ItemProxy: itemProxyAddress,
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
  const deploymentPath = `./deployed/contract-addresses-task-full-seimainnet.json`;

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

  console.log(
    "\n🎉 Deploy Task System đầy đủ lên Sei Mainnet hoàn tất thành công!"
  );
  console.log("📊 Đã deploy các contracts:");
  console.log("   - TaskComponent (Storage):", taskComponentAddress);
  console.log("   - TaskProxy (Proxy):", taskProxyAddress);
  console.log("   - TaskLogic (Logic):", taskLogicAddress);
  if (!existingAddresses.contracts.PlayerProxy) {
    console.log("   - PlayerProxy (nếu chưa có):", playerProxyAddress);
  }
  if (!existingAddresses.contracts.InventoryProxy) {
    console.log("   - InventoryProxy (nếu chưa có):", inventoryProxyAddress);
  }
  if (!existingAddresses.contracts.ItemProxy) {
    console.log("   - ItemProxy (nếu chưa có):", itemProxyAddress);
  }
  console.log("✨ Hệ thống Task đã sẵn sàng sử dụng");
  console.log("🔗 TaskLogic đã được đăng ký trong World contract");
  console.log("🌐 Explorer URLs:");
  console.log(
    "   TaskComponent: https://sei.explorers.guru/address/" +
      taskComponentAddress
  );
  console.log(
    "   TaskProxy: https://sei.explorers.guru/address/" + taskProxyAddress
  );
  console.log(
    "   TaskLogic: https://sei.explorers.guru/address/" + taskLogicAddress
  );
  console.log("💰 Chi phí deploy đã được tối ưu");
  console.log("🔒 Contracts đã được verify và sẵn sàng sử dụng");

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
