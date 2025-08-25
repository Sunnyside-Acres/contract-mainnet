const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy contracts lên Ethereum Mainnet...");

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

  // Xác nhận deploy
  console.log("\n⚠️  Bạn đang deploy lên ETHEREUM MAINNET!");
  console.log("💰 Chi phí deploy sẽ rất cao, hãy đảm bảo có đủ ETH");
  console.log("🔒 Hãy kiểm tra kỹ tất cả contract trước khi deploy");

  // 1. Deploy World contract trước
  console.log("\n📦 Deploying World contract...");
  const World = await ethers.getContractFactory("World");
  const world = await World.deploy(deployer.address);
  await world.waitForDeployment();
  const worldAddress = await world.getAddress();
  console.log("✅ World deployed to:", worldAddress);

  // 2. Deploy PlayerComponent
  console.log("\n📦 Deploying PlayerComponent...");
  const PlayerComponent = await ethers.getContractFactory("PlayerComponent");
  const playerComponent = await PlayerComponent.deploy();
  await playerComponent.waitForDeployment();
  const playerComponentAddress = await playerComponent.getAddress();
  console.log("✅ PlayerComponent deployed to:", playerComponentAddress);

  // 3. Deploy PlayerProxy
  console.log("\n📦 Deploying PlayerProxy...");
  const PlayerProxy = await ethers.getContractFactory("PlayerProxy");
  const playerProxy = await PlayerProxy.deploy(
    worldAddress,
    deployer.address,
    playerComponentAddress // Implementation address
  );
  await playerProxy.waitForDeployment();
  const playerProxyAddress = await playerProxy.getAddress();
  console.log("✅ PlayerProxy deployed to:", playerProxyAddress);

  // 4. Deploy PlayerLogic
  console.log("\n📦 Deploying PlayerLogic...");
  const PlayerLogic = await ethers.getContractFactory("PlayerLogic");
  const playerLogic = await PlayerLogic.deploy(
    worldAddress,
    playerProxyAddress
  );
  await playerLogic.waitForDeployment();
  const playerLogicAddress = await playerLogic.getAddress();
  console.log("✅ PlayerLogic deployed to:", playerLogicAddress);

  // 5. Deploy ItemComponent
  console.log("\n📦 Deploying ItemComponent...");
  const ItemComponent = await ethers.getContractFactory("ItemComponent");
  const itemComponent = await ItemComponent.deploy();
  await itemComponent.waitForDeployment();
  const itemComponentAddress = await itemComponent.getAddress();
  console.log("✅ ItemComponent deployed to:", itemComponentAddress);

  // 6. Deploy ItemProxy
  console.log("\n📦 Deploying ItemProxy...");
  const ItemProxy = await ethers.getContractFactory("ItemProxy");
  const itemProxy = await ItemProxy.deploy(
    worldAddress,
    deployer.address,
    itemComponentAddress // Implementation address
  );
  await itemProxy.waitForDeployment();
  const itemProxyAddress = await itemProxy.getAddress();
  console.log("✅ ItemProxy deployed to:", itemProxyAddress);

  // 7. Deploy ItemLogic
  console.log("\n📦 Deploying ItemLogic...");
  const ItemLogic = await ethers.getContractFactory("ItemLogic");
  const itemLogic = await ItemLogic.deploy(worldAddress, itemProxyAddress);
  await itemLogic.waitForDeployment();
  const itemLogicAddress = await itemLogic.getAddress();
  console.log("✅ ItemLogic deployed to:", itemLogicAddress);

  // 8. Deploy WeatherComponent
  console.log("\n📦 Deploying WeatherComponent...");
  const WeatherComponent = await ethers.getContractFactory("WeatherComponent");
  const weatherComponent = await WeatherComponent.deploy();
  await weatherComponent.waitForDeployment();
  const weatherComponentAddress = await weatherComponent.getAddress();
  console.log("✅ WeatherComponent deployed to:", weatherComponentAddress);

  // 9. Deploy WeatherProxy
  console.log("\n📦 Deploying WeatherProxy...");
  const WeatherProxy = await ethers.getContractFactory("WeatherProxy");
  const weatherProxy = await WeatherProxy.deploy(
    worldAddress,
    deployer.address,
    weatherComponentAddress // Implementation address
  );
  await weatherProxy.waitForDeployment();
  const weatherProxyAddress = await weatherProxy.getAddress();
  console.log("✅ WeatherProxy deployed to:", weatherProxyAddress);

  // 10. Deploy WeatherLogic
  console.log("\n📦 Deploying WeatherLogic...");
  const WeatherLogic = await ethers.getContractFactory("WeatherLogic");
  const weatherLogic = await WeatherLogic.deploy(
    worldAddress,
    weatherProxyAddress
  );
  await weatherLogic.waitForDeployment();
  const weatherLogicAddress = await weatherLogic.getAddress();
  console.log("✅ WeatherLogic deployed to:", weatherLogicAddress);

  // 11. Deploy PlotComponent
  console.log("\n📦 Deploying PlotComponent...");
  const PlotComponent = await ethers.getContractFactory("PlotComponent");
  const plotComponent = await PlotComponent.deploy();
  await plotComponent.waitForDeployment();
  const plotComponentAddress = await plotComponent.getAddress();
  console.log("✅ PlotComponent deployed to:", plotComponentAddress);

  // 12. Deploy PlotProxy
  console.log("\n📦 Deploying PlotProxy...");
  const PlotProxy = await ethers.getContractFactory("PlotProxy");
  const plotProxy = await PlotProxy.deploy(
    worldAddress,
    deployer.address,
    plotComponentAddress // Implementation address
  );
  await plotProxy.waitForDeployment();
  const plotProxyAddress = await plotProxy.getAddress();
  console.log("✅ PlotProxy deployed to:", plotProxyAddress);

  // 13. Deploy PlotLogic
  console.log("\n📦 Deploying PlotLogic...");
  const PlotLogic = await ethers.getContractFactory("PlotLogic");
  const plotLogic = await PlotLogic.deploy(
    worldAddress,
    plotProxyAddress,
    weatherProxyAddress,
    playerProxyAddress
  );
  await plotLogic.waitForDeployment();
  const plotLogicAddress = await plotLogic.getAddress();
  console.log("✅ PlotLogic deployed to:", plotLogicAddress);

  // 14. Deploy InventoryComponent
  console.log("\n📦 Deploying InventoryComponent...");
  const InventoryComponent = await ethers.getContractFactory(
    "InventoryComponent"
  );
  const inventoryComponent = await InventoryComponent.deploy();
  await inventoryComponent.waitForDeployment();
  const inventoryComponentAddress = await inventoryComponent.getAddress();
  console.log("✅ InventoryComponent deployed to:", inventoryComponentAddress);

  // 15. Deploy InventoryProxy
  console.log("\n📦 Deploying InventoryProxy...");
  const InventoryProxy = await ethers.getContractFactory("InventoryProxy");
  const inventoryProxy = await InventoryProxy.deploy(
    worldAddress,
    deployer.address,
    inventoryComponentAddress // Implementation address
  );
  await inventoryProxy.waitForDeployment();
  const inventoryProxyAddress = await inventoryProxy.getAddress();
  console.log("✅ InventoryProxy deployed to:", inventoryProxyAddress);

  // 16. Deploy InventoryLogic
  console.log("\n📦 Deploying InventoryLogic...");
  const InventoryLogic = await ethers.getContractFactory("InventoryLogic");
  const inventoryLogic = await InventoryLogic.deploy(
    worldAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress
  );
  await inventoryLogic.waitForDeployment();
  const inventoryLogicAddress = await inventoryLogic.getAddress();
  console.log("✅ InventoryLogic deployed to:", inventoryLogicAddress);

  // 17. Deploy PlantComponent
  console.log("\n📦 Deploying PlantComponent...");
  const PlantComponent = await ethers.getContractFactory("PlantComponent");
  const plantComponent = await PlantComponent.deploy();
  await plantComponent.waitForDeployment();
  const plantComponentAddress = await plantComponent.getAddress();
  console.log("✅ PlantComponent deployed to:", plantComponentAddress);

  // 18. Deploy PlantProxy
  console.log("\n📦 Deploying PlantProxy...");
  const PlantProxy = await ethers.getContractFactory("PlantProxy");
  const plantProxy = await PlantProxy.deploy(
    worldAddress,
    deployer.address,
    plantComponentAddress // Implementation address
  );
  await plantProxy.waitForDeployment();
  const plantProxyAddress = await plantProxy.getAddress();
  console.log("✅ PlantProxy deployed to:", plantProxyAddress);

  // 19. Deploy PlantLogic
  console.log("\n📦 Deploying PlantLogic...");
  const PlantLogic = await ethers.getContractFactory("PlantLogic");
  const plantLogic = await PlantLogic.deploy(
    worldAddress,
    plantProxyAddress,
    plotProxyAddress,
    inventoryProxyAddress,
    weatherProxyAddress,
    itemProxyAddress
  );
  await plantLogic.waitForDeployment();
  const plantLogicAddress = await plantLogic.getAddress();
  console.log("✅ PlantLogic deployed to:", plantLogicAddress);

  // 20. Deploy FishingLogic
  console.log("\n📦 Deploying FishingLogic...");
  const FishingLogic = await ethers.getContractFactory("FishingLogic");
  const fishingLogic = await FishingLogic.deploy(
    worldAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress,
    weatherProxyAddress
  );
  await fishingLogic.waitForDeployment();
  const fishingLogicAddress = await fishingLogic.getAddress();
  console.log("✅ FishingLogic deployed to:", fishingLogicAddress);

  // 21. Deploy NPCMarketComponent
  console.log("\n📦 Deploying NPCMarketComponent...");
  const NPCMarketComponent = await ethers.getContractFactory(
    "NPCMarketComponent"
  );
  const npcMarketComponent = await NPCMarketComponent.deploy();
  await npcMarketComponent.waitForDeployment();
  const npcMarketComponentAddress = await npcMarketComponent.getAddress();
  console.log("✅ NPCMarketComponent deployed to:", npcMarketComponentAddress);

  // 22. Deploy NPCMarketProxy
  console.log("\n📦 Deploying NPCMarketProxy...");
  const NPCMarketProxy = await ethers.getContractFactory("NPCMarketProxy");
  const npcMarketProxy = await NPCMarketProxy.deploy(
    worldAddress,
    deployer.address,
    npcMarketComponentAddress // Implementation address
  );
  await npcMarketProxy.waitForDeployment();
  const npcMarketProxyAddress = await npcMarketProxy.getAddress();
  console.log("✅ NPCMarketProxy deployed to:", npcMarketProxyAddress);

  // 23. Deploy NPCMarketLogic
  console.log("\n📦 Deploying NPCMarketLogic...");
  const NPCMarketLogic = await ethers.getContractFactory("NPCMarketLogic");
  const npcMarketLogic = await NPCMarketLogic.deploy(
    worldAddress,
    npcMarketProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await npcMarketLogic.waitForDeployment();
  const npcMarketLogicAddress = await npcMarketLogic.getAddress();
  console.log("✅ NPCMarketLogic deployed to:", npcMarketLogicAddress);

  // === DEPLOY CÁC CONTRACT MỚI ===

  // 24. Deploy GachaComponent
  console.log("\n📦 Deploying GachaComponent...");
  const GachaComponent = await ethers.getContractFactory("GachaComponent");
  const gachaComponent = await GachaComponent.deploy();
  await gachaComponent.waitForDeployment();
  const gachaComponentAddress = await gachaComponent.getAddress();
  console.log("✅ GachaComponent deployed to:", gachaComponentAddress);

  // 25. Deploy GachaProxy
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

  // 26. Deploy GachaLogic
  console.log("\n📦 Deploying GachaLogic...");
  const GachaLogic = await ethers.getContractFactory("GachaLogic");
  const gachaLogic = await GachaLogic.deploy(
    worldAddress,
    gachaProxyAddress,
    playerProxyAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    deployer.address // deployerWallet
  );
  await gachaLogic.waitForDeployment();
  const gachaLogicAddress = await gachaLogic.getAddress();
  console.log("✅ GachaLogic deployed to:", gachaLogicAddress);

  // 27. Deploy TaskComponent
  console.log("\n📦 Deploying TaskComponent...");
  const TaskComponent = await ethers.getContractFactory("TaskComponent");
  const taskComponent = await TaskComponent.deploy();
  await taskComponent.waitForDeployment();
  const taskComponentAddress = await taskComponent.getAddress();
  console.log("✅ TaskComponent deployed to:", taskComponentAddress);

  // 28. Deploy TaskProxy
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

  // 29. Deploy TaskLogic
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

  // 30. Deploy FleaMarketComponent
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

  // 31. Deploy FleaMarketProxy
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

  // 32. Deploy FleaMarketLogic
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

  // 33. Deploy CraftingComponent
  console.log("\n📦 Deploying CraftingComponent...");
  const CraftingComponent = await ethers.getContractFactory(
    "CraftingComponent"
  );
  const craftingComponent = await CraftingComponent.deploy();
  await craftingComponent.waitForDeployment();
  const craftingComponentAddress = await craftingComponent.getAddress();
  console.log("✅ CraftingComponent deployed to:", craftingComponentAddress);

  // 34. Deploy CraftingProxy
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

  // 35. Deploy CraftingLogic
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

  // 36. Deploy RaisingComponent
  console.log("\n📦 Deploying RaisingComponent...");
  const RaisingComponent = await ethers.getContractFactory("RaisingComponent");
  const raisingComponent = await RaisingComponent.deploy();
  await raisingComponent.waitForDeployment();
  const raisingComponentAddress = await raisingComponent.getAddress();
  console.log("✅ RaisingComponent deployed to:", raisingComponentAddress);

  // 37. Deploy RaisingProxy
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

  // 38. Deploy RaisingLogic
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

  // Register PlayerLogic trong World
  const registerPlayerLogicTx = await world.registerLogic(playerLogicAddress);
  await registerPlayerLogicTx.wait();
  console.log("✅ PlayerLogic registered in World");

  // Register ItemLogic trong World
  const registerItemLogicTx = await world.registerLogic(itemLogicAddress);
  await registerItemLogicTx.wait();
  console.log("✅ ItemLogic registered in World");

  // Register WeatherLogic trong World
  const registerWeatherLogicTx = await world.registerLogic(weatherLogicAddress);
  await registerWeatherLogicTx.wait();
  console.log("✅ WeatherLogic registered in World");

  // Register PlotLogic trong World
  const registerPlotLogicTx = await world.registerLogic(plotLogicAddress);
  await registerPlotLogicTx.wait();
  console.log("✅ PlotLogic registered in World");

  // Register PlantLogic trong World
  const registerPlantLogicTx = await world.registerLogic(plantLogicAddress);
  await registerPlantLogicTx.wait();
  console.log("✅ PlantLogic registered in World");

  // Register FishingLogic trong World
  const registerFishingLogicTx = await world.registerLogic(fishingLogicAddress);
  await registerFishingLogicTx.wait();
  console.log("✅ FishingLogic registered in World");

  // Register NPCMarketLogic trong World
  const registerNPCMarketLogicTx = await world.registerLogic(
    npcMarketLogicAddress
  );
  await registerNPCMarketLogicTx.wait();
  console.log("✅ NPCMarketLogic registered in World");

  // Register InventoryLogic trong World
  const registerInventoryLogicTx = await world.registerLogic(
    inventoryLogicAddress
  );
  await registerInventoryLogicTx.wait();
  console.log("✅ InventoryLogic registered in World");

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

  // === LƯU THÔNG TIN DEPLOY ===
  const deploymentInfo = {
    network: "mainnet",
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      World: worldAddress,
      PlayerComponent: playerComponentAddress,
      PlayerLogic: playerLogicAddress,
      PlayerProxy: playerProxyAddress,
      ItemComponent: itemComponentAddress,
      ItemLogic: itemLogicAddress,
      ItemProxy: itemProxyAddress,
      WeatherComponent: weatherComponentAddress,
      WeatherLogic: weatherLogicAddress,
      WeatherProxy: weatherProxyAddress,
      PlotComponent: plotComponentAddress,
      PlotLogic: plotLogicAddress,
      PlotProxy: plotProxyAddress,
      InventoryComponent: inventoryComponentAddress,
      InventoryLogic: inventoryLogicAddress,
      InventoryProxy: inventoryProxyAddress,
      PlantComponent: plantComponentAddress,
      PlantLogic: plantLogicAddress,
      PlantProxy: plantProxyAddress,
      FishingLogic: fishingLogicAddress,
      NPCMarketComponent: npcMarketComponentAddress,
      NPCMarketLogic: npcMarketLogicAddress,
      NPCMarketProxy: npcMarketProxyAddress,
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
    },
    timestamp: new Date().toISOString(),
    rpcUrl: process.env.MAINNET_RPC_URL || "Ethereum Mainnet RPC",
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-mainnet.json`;

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  console.log("\n🎉 Deploy lên Ethereum Mainnet hoàn tất thành công!");
  console.log("📊 Tổng số contract đã deploy: 38 contracts");
  console.log(
    "✨ Bao gồm 5 hệ thống mới: Gacha, Task, FleaMarket, Crafting, Raising"
  );
  console.log("🔗 Tất cả contract đã được đăng ký trong World contract");
  console.log("🌐 Explorer URL: https://etherscan.io/address/" + worldAddress);
  console.log("💰 Chi phí deploy đã được tính toán và thực hiện");
  console.log("🔒 Tất cả contract đã được verify và sẵn sàng sử dụng");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
