const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy các contract mới lên Local Network...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network: Local (Hardhat)");
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Load existing deployment info
  let existingDeployment = {};
  const deploymentPath = `./deployed/contract-addresses-local.json`;

  if (fs.existsSync(deploymentPath)) {
    existingDeployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("📋 Loaded existing deployment info");
  } else {
    console.log(
      "❌ Không tìm thấy file deployment hiện tại. Vui lòng chạy deploy-local.js trước."
    );
    process.exit(1);
  }

  // Get existing contract addresses
  const worldAddress = existingDeployment.contracts.World;
  const itemProxyAddress = existingDeployment.contracts.ItemProxy;
  const inventoryProxyAddress = existingDeployment.contracts.InventoryProxy;
  const playerProxyAddress = existingDeployment.contracts.PlayerProxy;

  console.log("🌍 World address:", worldAddress);
  console.log("📦 ItemProxy address:", itemProxyAddress);
  console.log("🎒 InventoryProxy address:", inventoryProxyAddress);
  console.log("👤 PlayerProxy address:", playerProxyAddress);

  // Get World contract instance
  const World = await ethers.getContractFactory("World");
  const world = World.attach(worldAddress);

  // === DEPLOY CÁC CONTRACT MỚI ===

  // 1. Deploy GachaComponent
  console.log("\n📦 Deploying GachaComponent...");
  const GachaComponent = await ethers.getContractFactory("GachaComponent");
  const gachaComponent = await GachaComponent.deploy();
  await gachaComponent.waitForDeployment();
  const gachaComponentAddress = await gachaComponent.getAddress();
  console.log("✅ GachaComponent deployed to:", gachaComponentAddress);

  // 2. Deploy GachaProxy
  console.log("\n📦 Deploying GachaProxy...");
  const GachaProxy = await ethers.getContractFactory("GachaProxy");
  const gachaProxy = await GachaProxy.deploy(
    worldAddress,
    deployer.address,
    gachaComponentAddress // Implementation address
  );
  await gachaProxy.waitForDeployment();
  const gachaProxyAddress = await gachaProxy.getAddress();
  console.log("✅ GachaProxy deployed to:", gachaProxyAddress);

  // 3. Deploy GachaLogic
  console.log("\n📦 Deploying GachaLogic...");
  const GachaLogic = await ethers.getContractFactory("GachaLogic");
  const gachaLogic = await GachaLogic.deploy(
    worldAddress,
    gachaProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await gachaLogic.waitForDeployment();
  const gachaLogicAddress = await gachaLogic.getAddress();
  console.log("✅ GachaLogic deployed to:", gachaLogicAddress);

  // 4. Deploy TaskComponent
  console.log("\n📦 Deploying TaskComponent...");
  const TaskComponent = await ethers.getContractFactory("TaskComponent");
  const taskComponent = await TaskComponent.deploy();
  await taskComponent.waitForDeployment();
  const taskComponentAddress = await taskComponent.getAddress();
  console.log("✅ TaskComponent deployed to:", taskComponentAddress);

  // 5. Deploy TaskProxy
  console.log("\n📦 Deploying TaskProxy...");
  const TaskProxy = await ethers.getContractFactory("TaskProxy");
  const taskProxy = await TaskProxy.deploy(
    worldAddress,
    deployer.address,
    taskComponentAddress // Implementation address
  );
  await taskProxy.waitForDeployment();
  const taskProxyAddress = await taskProxy.getAddress();
  console.log("✅ TaskProxy deployed to:", taskProxyAddress);

  // 6. Deploy TaskLogic
  console.log("\n📦 Deploying TaskLogic...");
  const TaskLogic = await ethers.getContractFactory("TaskLogic");
  const taskLogic = await TaskLogic.deploy(
    worldAddress,
    taskProxyAddress,
    playerProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress
  );
  await taskLogic.waitForDeployment();
  const taskLogicAddress = await taskLogic.getAddress();
  console.log("✅ TaskLogic deployed to:", taskLogicAddress);

  // 7. Deploy FleaMarketComponent
  console.log("\n📦 Deploying FleaMarketComponent...");
  const FleaMarketComponent = await ethers.getContractFactory(
    "FleaMarketComponent"
  );
  const fleaMarketComponent = await FleaMarketComponent.deploy();
  await fleaMarketComponent.waitForDeployment();
  const fleaMarketComponentAddress = await fleaMarketComponent.getAddress();
  console.log(
    "✅ FleaMarketComponent deployed to:",
    fleaMarketComponentAddress
  );

  // 8. Deploy FleaMarketProxy
  console.log("\n📦 Deploying FleaMarketProxy...");
  const FleaMarketProxy = await ethers.getContractFactory("FleaMarketProxy");
  const fleaMarketProxy = await FleaMarketProxy.deploy(
    worldAddress,
    deployer.address,
    fleaMarketComponentAddress // Implementation address
  );
  await fleaMarketProxy.waitForDeployment();
  const fleaMarketProxyAddress = await fleaMarketProxy.getAddress();
  console.log("✅ FleaMarketProxy deployed to:", fleaMarketProxyAddress);

  // 9. Deploy FleaMarketLogic
  console.log("\n📦 Deploying FleaMarketLogic...");
  const FleaMarketLogic = await ethers.getContractFactory("FleaMarketLogic");
  const fleaMarketLogic = await FleaMarketLogic.deploy(
    worldAddress,
    fleaMarketProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await fleaMarketLogic.waitForDeployment();
  const fleaMarketLogicAddress = await fleaMarketLogic.getAddress();
  console.log("✅ FleaMarketLogic deployed to:", fleaMarketLogicAddress);

  // 10. Deploy CraftingComponent
  console.log("\n📦 Deploying CraftingComponent...");
  const CraftingComponent = await ethers.getContractFactory(
    "CraftingComponent"
  );
  const craftingComponent = await CraftingComponent.deploy();
  await craftingComponent.waitForDeployment();
  const craftingComponentAddress = await craftingComponent.getAddress();
  console.log("✅ CraftingComponent deployed to:", craftingComponentAddress);

  // 11. Deploy CraftingProxy
  console.log("\n📦 Deploying CraftingProxy...");
  const CraftingProxy = await ethers.getContractFactory("CraftingProxy");
  const craftingProxy = await CraftingProxy.deploy(
    worldAddress,
    deployer.address,
    craftingComponentAddress // Implementation address
  );
  await craftingProxy.waitForDeployment();
  const craftingProxyAddress = await craftingProxy.getAddress();
  console.log("✅ CraftingProxy deployed to:", craftingProxyAddress);

  // 12. Deploy CraftingLogic
  console.log("\n📦 Deploying CraftingLogic...");
  const CraftingLogic = await ethers.getContractFactory("CraftingLogic");
  const craftingLogic = await CraftingLogic.deploy(
    worldAddress,
    craftingProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await craftingLogic.waitForDeployment();
  const craftingLogicAddress = await craftingLogic.getAddress();
  console.log("✅ CraftingLogic deployed to:", craftingLogicAddress);

  // 13. Deploy RaisingComponent
  console.log("\n📦 Deploying RaisingComponent...");
  const RaisingComponent = await ethers.getContractFactory("RaisingComponent");
  const raisingComponent = await RaisingComponent.deploy();
  await raisingComponent.waitForDeployment();
  const raisingComponentAddress = await raisingComponent.getAddress();
  console.log("✅ RaisingComponent deployed to:", raisingComponentAddress);

  // 14. Deploy RaisingProxy
  console.log("\n📦 Deploying RaisingProxy...");
  const RaisingProxy = await ethers.getContractFactory("RaisingProxy");
  const raisingProxy = await RaisingProxy.deploy(
    worldAddress,
    deployer.address,
    raisingComponentAddress // Implementation address
  );
  await raisingProxy.waitForDeployment();
  const raisingProxyAddress = await raisingProxy.getAddress();
  console.log("✅ RaisingProxy deployed to:", raisingProxyAddress);

  // 15. Deploy RaisingLogic
  console.log("\n📦 Deploying RaisingLogic...");
  const RaisingLogic = await ethers.getContractFactory("RaisingLogic");
  const raisingLogic = await RaisingLogic.deploy(
    worldAddress,
    raisingProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await raisingLogic.waitForDeployment();
  const raisingLogicAddress = await raisingLogic.getAddress();
  console.log("✅ RaisingLogic deployed to:", raisingLogicAddress);

  // === CẤU HÌNH WORLD CONTRACT ===
  console.log("\n⚙️ Configuring World contract...");

  // Register GachaLogic trong World
  const registerGachaLogicTx = await world.registerLogic(gachaLogicAddress);
  await registerGachaLogicTx.wait();
  console.log("✅ GachaLogic registered in World");

  // Register TaskLogic trong World
  const registerTaskLogicTx = await world.registerLogic(taskLogicAddress);
  await registerTaskLogicTx.wait();
  console.log("✅ TaskLogic registered in World");

  // Register FleaMarketLogic trong World
  const registerFleaMarketLogicTx = await world.registerLogic(
    fleaMarketLogicAddress
  );
  await registerFleaMarketLogicTx.wait();
  console.log("✅ FleaMarketLogic registered in World");

  // Register CraftingLogic trong World
  const registerCraftingLogicTx = await world.registerLogic(
    craftingLogicAddress
  );
  await registerCraftingLogicTx.wait();
  console.log("✅ CraftingLogic registered in World");

  // Register RaisingLogic trong World
  const registerRaisingLogicTx = await world.registerLogic(raisingLogicAddress);
  await registerRaisingLogicTx.wait();
  console.log("✅ RaisingLogic registered in World");

  // === CẬP NHẬT THÔNG TIN DEPLOY ===
  const newContracts = {
    // Contract mới
    GachaComponent: gachaComponentAddress,
    GachaLogic: gachaLogicAddress,
    GachaProxy: gachaProxyAddress,
    TaskComponent: taskComponentAddress,
    TaskLogic: taskLogicAddress,
    TaskProxy: taskProxyAddress,
    FleaMarketComponent: fleaMarketComponentAddress,
    FleaMarketLogic: fleaMarketLogicAddress,
    FleaMarketProxy: fleaMarketProxyAddress,
    CraftingComponent: craftingComponentAddress,
    CraftingLogic: craftingLogicAddress,
    CraftingProxy: craftingProxyAddress,
    RaisingComponent: raisingComponentAddress,
    RaisingLogic: raisingLogicAddress,
    RaisingProxy: raisingProxyAddress,
  };

  // Merge với deployment hiện tại
  const updatedDeployment = {
    ...existingDeployment,
    contracts: {
      ...existingDeployment.contracts,
      ...newContracts,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Updated Deployment Summary:");
  console.log(JSON.stringify(updatedDeployment, null, 2));

  // Lưu vào file
  fs.writeFileSync(deploymentPath, JSON.stringify(updatedDeployment, null, 2));
  console.log(`\n💾 Updated deployment info saved to: ${deploymentPath}`);

  console.log("\n🎉 Deploy các contract mới hoàn tất thành công!");
  console.log("📊 Tổng số contract mới đã deploy: 15 contracts");
  console.log(
    "✨ Bao gồm 5 hệ thống: Gacha, Task, FleaMarket, Crafting, Raising"
  );
  console.log("🔗 Tất cả contract đã được đăng ký trong World contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
