const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy contracts lên Local Network...");

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

  // Register InventoryLogic trong World
  const registerInventoryLogicTx = await world.registerLogic(
    inventoryLogicAddress
  );
  await registerInventoryLogicTx.wait();
  console.log("✅ InventoryLogic registered in World");

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

  // 8. Cấu hình World contract
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

  // 9. Lưu thông tin deploy
  const deploymentInfo = {
    network: "local",
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
    },
    timestamp: new Date().toISOString(),
    rpcUrl: "http://127.0.0.1:8545",
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Lưu vào file
  const fs = require("fs");
  const deploymentPath = `./deployed/contract-addresses-local.json`;

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  console.log("\n🎉 Deploy lên Local Network hoàn tất thành công!");
  console.log("🔗 Để test, hãy chạy: npx hardhat node");
  console.log("🌐 Frontend sẽ tự động load contract addresses từ file local");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
