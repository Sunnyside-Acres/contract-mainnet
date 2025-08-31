const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy tất cả contracts...");

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

  // === PHASE 1: DEPLOY CORE CONTRACTS (KHÔNG PHỤ THUỘC) ===
  console.log("\n📦 PHASE 1: Deploying Core Contracts...");

  // 1. Deploy World contract (core contract)
  console.log("\n1️⃣ Deploying World contract...");
  const World = await ethers.getContractFactory("World");
  const world = await World.deploy(deployer.address);
  await world.waitForDeployment();
  const worldAddress = await world.getAddress();
  console.log("✅ World deployed to:", worldAddress);

  // === PHASE 2: DEPLOY COMPONENTS (KHÔNG PHỤ THUỘC) ===
  console.log("\n📦 PHASE 2: Deploying Components...");

  // 2. Deploy PlayerComponent
  console.log("\n2️⃣ Deploying PlayerComponent...");
  const PlayerComponent = await ethers.getContractFactory("PlayerComponent");
  const playerComponent = await PlayerComponent.deploy();
  await playerComponent.waitForDeployment();
  const playerComponentAddress = await playerComponent.getAddress();
  console.log("✅ PlayerComponent deployed to:", playerComponentAddress);

  // 3. Deploy ItemComponent
  console.log("\n3️⃣ Deploying ItemComponent...");
  const ItemComponent = await ethers.getContractFactory("ItemComponent");
  const itemComponent = await ItemComponent.deploy();
  await itemComponent.waitForDeployment();
  const itemComponentAddress = await itemComponent.getAddress();
  console.log("✅ ItemComponent deployed to:", itemComponentAddress);

  // 4. Deploy WeatherComponent
  console.log("\n4️⃣ Deploying WeatherComponent...");
  const WeatherComponent = await ethers.getContractFactory("WeatherComponent");
  const weatherComponent = await WeatherComponent.deploy();
  await weatherComponent.waitForDeployment();
  const weatherComponentAddress = await weatherComponent.getAddress();
  console.log("✅ WeatherComponent deployed to:", weatherComponentAddress);

  // 5. Deploy PlotComponent
  console.log("\n5️⃣ Deploying PlotComponent...");
  const PlotComponent = await ethers.getContractFactory("PlotComponent");
  const plotComponent = await PlotComponent.deploy();
  await plotComponent.waitForDeployment();
  const plotComponentAddress = await plotComponent.getAddress();
  console.log("✅ PlotComponent deployed to:", plotComponentAddress);

  // 6. Deploy InventoryComponent
  console.log("\n6️⃣ Deploying InventoryComponent...");
  const InventoryComponent = await ethers.getContractFactory(
    "InventoryComponent"
  );
  const inventoryComponent = await InventoryComponent.deploy();
  await inventoryComponent.waitForDeployment();
  const inventoryComponentAddress = await inventoryComponent.getAddress();
  console.log("✅ InventoryComponent deployed to:", inventoryComponentAddress);

  // 7. Deploy PlantComponent
  console.log("\n7️⃣ Deploying PlantComponent...");
  const PlantComponent = await ethers.getContractFactory("PlantComponent");
  const plantComponent = await PlantComponent.deploy();
  await plantComponent.waitForDeployment();
  const plantComponentAddress = await plantComponent.getAddress();
  console.log("✅ PlantComponent deployed to:", plantComponentAddress);

  // 8. Deploy NPCMarketComponent
  console.log("\n8️⃣ Deploying NPCMarketComponent...");
  const NPCMarketComponent = await ethers.getContractFactory(
    "NPCMarketComponent"
  );
  const npcMarketComponent = await NPCMarketComponent.deploy();
  await npcMarketComponent.waitForDeployment();
  const npcMarketComponentAddress = await npcMarketComponent.getAddress();
  console.log("✅ NPCMarketComponent deployed to:", npcMarketComponentAddress);

  // 9. Deploy GachaComponent
  console.log("\n9️⃣ Deploying GachaComponent...");
  const GachaComponent = await ethers.getContractFactory("GachaComponent");
  const gachaComponent = await GachaComponent.deploy();
  await gachaComponent.waitForDeployment();
  const gachaComponentAddress = await gachaComponent.getAddress();
  console.log("✅ GachaComponent deployed to:", gachaComponentAddress);

  // 10. Deploy TaskComponent
  console.log("\n🔟 Deploying TaskComponent...");
  const TaskComponent = await ethers.getContractFactory("TaskComponent");
  const taskComponent = await TaskComponent.deploy();
  await taskComponent.waitForDeployment();
  const taskComponentAddress = await taskComponent.getAddress();
  console.log("✅ TaskComponent deployed to:", taskComponentAddress);

  // 11. Deploy FleaMarketComponent
  console.log("\n1️⃣1️⃣ Deploying FleaMarketComponent...");
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

  // 12. Deploy CraftingComponent
  console.log("\n1️⃣2️⃣ Deploying CraftingComponent...");
  const CraftingComponent = await ethers.getContractFactory(
    "CraftingComponent"
  );
  const craftingComponent = await CraftingComponent.deploy();
  await craftingComponent.waitForDeployment();
  const craftingComponentAddress = await craftingComponent.getAddress();
  console.log("✅ CraftingComponent deployed to:", craftingComponentAddress);

  // 13. Deploy RaisingComponent
  console.log("\n1️⃣3️⃣ Deploying RaisingComponent...");
  const RaisingComponent = await ethers.getContractFactory("RaisingComponent");
  const raisingComponent = await RaisingComponent.deploy();
  await raisingComponent.waitForDeployment();
  const raisingComponentAddress = await raisingComponent.getAddress();
  console.log("✅ RaisingComponent deployed to:", raisingComponentAddress);

  // === PHASE 3: DEPLOY PROXIES (PHỤ THUỘC WORLD + COMPONENTS) ===
  console.log("\n📦 PHASE 3: Deploying Proxies...");

  // 14. Deploy PlayerProxy
  console.log("\n1️⃣4️⃣ Deploying PlayerProxy...");
  const PlayerProxy = await ethers.getContractFactory("PlayerProxy");
  const playerProxy = await PlayerProxy.deploy(
    worldAddress,
    deployer.address,
    playerComponentAddress
  );
  await playerProxy.waitForDeployment();
  const playerProxyAddress = await playerProxy.getAddress();
  console.log("✅ PlayerProxy deployed to:", playerProxyAddress);

  // 15. Deploy ItemProxy
  console.log("\n1️⃣5️⃣ Deploying ItemProxy...");
  const ItemProxy = await ethers.getContractFactory("ItemProxy");
  const itemProxy = await ItemProxy.deploy(
    worldAddress,
    deployer.address,
    itemComponentAddress
  );
  await itemProxy.waitForDeployment();
  const itemProxyAddress = await itemProxy.getAddress();
  console.log("✅ ItemProxy deployed to:", itemProxyAddress);

  // 16. Deploy WeatherProxy
  console.log("\n1️⃣6️⃣ Deploying WeatherProxy...");
  const WeatherProxy = await ethers.getContractFactory("WeatherProxy");
  const weatherProxy = await WeatherProxy.deploy(
    worldAddress,
    deployer.address,
    weatherComponentAddress
  );
  await weatherProxy.waitForDeployment();
  const weatherProxyAddress = await weatherProxy.getAddress();
  console.log("✅ WeatherProxy deployed to:", weatherProxyAddress);

  // 17. Deploy PlotProxy
  console.log("\n1️⃣7️⃣ Deploying PlotProxy...");
  const PlotProxy = await ethers.getContractFactory("PlotProxy");
  const plotProxy = await PlotProxy.deploy(
    worldAddress,
    deployer.address,
    plotComponentAddress
  );
  await plotProxy.waitForDeployment();
  const plotProxyAddress = await plotProxy.getAddress();
  console.log("✅ PlotProxy deployed to:", plotProxyAddress);

  // 18. Deploy InventoryProxy
  console.log("\n1️⃣8️⃣ Deploying InventoryProxy...");
  const InventoryProxy = await ethers.getContractFactory("InventoryProxy");
  const inventoryProxy = await InventoryProxy.deploy(
    worldAddress,
    deployer.address,
    inventoryComponentAddress
  );
  await inventoryProxy.waitForDeployment();
  const inventoryProxyAddress = await inventoryProxy.getAddress();
  console.log("✅ InventoryProxy deployed to:", inventoryProxyAddress);

  // 19. Deploy PlantProxy
  console.log("\n1️⃣9️⃣ Deploying PlantProxy...");
  const PlantProxy = await ethers.getContractFactory("PlantProxy");
  const plantProxy = await PlantProxy.deploy(
    worldAddress,
    deployer.address,
    plantComponentAddress
  );
  await plantProxy.waitForDeployment();
  const plantProxyAddress = await plantProxy.getAddress();
  console.log("✅ PlantProxy deployed to:", plantProxyAddress);

  // 20. Deploy NPCMarketProxy
  console.log("\n2️⃣0️⃣ Deploying NPCMarketProxy...");
  const NPCMarketProxy = await ethers.getContractFactory("NPCMarketProxy");
  const npcMarketProxy = await NPCMarketProxy.deploy(
    worldAddress,
    deployer.address,
    npcMarketComponentAddress
  );
  await npcMarketProxy.waitForDeployment();
  const npcMarketProxyAddress = await npcMarketProxy.getAddress();
  console.log("✅ NPCMarketProxy deployed to:", npcMarketProxyAddress);

  // 21. Deploy GachaProxy
  console.log("\n2️⃣1️⃣ Deploying GachaProxy...");
  const GachaProxy = await ethers.getContractFactory("GachaProxy");
  const gachaProxy = await GachaProxy.deploy(
    worldAddress,
    deployer.address,
    gachaComponentAddress
  );
  await gachaProxy.waitForDeployment();
  const gachaProxyAddress = await gachaProxy.getAddress();
  console.log("✅ GachaProxy deployed to:", gachaProxyAddress);

  // 22. Deploy TaskProxy
  console.log("\n2️⃣2️⃣ Deploying TaskProxy...");
  const TaskProxy = await ethers.getContractFactory("TaskProxy");
  const taskProxy = await TaskProxy.deploy(
    worldAddress,
    deployer.address,
    taskComponentAddress
  );
  await taskProxy.waitForDeployment();
  const taskProxyAddress = await taskProxy.getAddress();
  console.log("✅ TaskProxy deployed to:", taskProxyAddress);

  // 23. Deploy FleaMarketProxy
  console.log("\n2️⃣3️⃣ Deploying FleaMarketProxy...");
  const FleaMarketProxy = await ethers.getContractFactory("FleaMarketProxy");
  const fleaMarketProxy = await FleaMarketProxy.deploy(
    worldAddress,
    deployer.address,
    fleaMarketComponentAddress
  );
  await fleaMarketProxy.waitForDeployment();
  const fleaMarketProxyAddress = await fleaMarketProxy.getAddress();
  console.log("✅ FleaMarketProxy deployed to:", fleaMarketProxyAddress);

  // 24. Deploy CraftingProxy
  console.log("\n2️⃣4️⃣ Deploying CraftingProxy...");
  const CraftingProxy = await ethers.getContractFactory("CraftingProxy");
  const craftingProxy = await CraftingProxy.deploy(
    worldAddress,
    deployer.address,
    craftingComponentAddress
  );
  await craftingProxy.waitForDeployment();
  const craftingProxyAddress = await craftingProxy.getAddress();
  console.log("✅ CraftingProxy deployed to:", craftingProxyAddress);

  // 25. Deploy RaisingProxy
  console.log("\n2️⃣5️⃣ Deploying RaisingProxy...");
  const RaisingProxy = await ethers.getContractFactory("RaisingProxy");
  const raisingProxy = await RaisingProxy.deploy(
    worldAddress,
    deployer.address,
    raisingComponentAddress
  );
  await raisingProxy.waitForDeployment();
  const raisingProxyAddress = await raisingProxy.getAddress();
  console.log("✅ RaisingProxy deployed to:", raisingProxyAddress);

  // === PHASE 4: DEPLOY LOGIC CONTRACTS (PHỤ THUỘC WORLD + PROXIES) ===
  console.log("\n📦 PHASE 4: Deploying Logic Contracts...");

  // 26. Deploy PlayerLogic (world, playerProxy)
  console.log("\n2️⃣6️⃣ Deploying PlayerLogic...");
  const PlayerLogic = await ethers.getContractFactory("PlayerLogic");
  const playerLogic = await PlayerLogic.deploy(
    worldAddress,
    playerProxyAddress
  );
  await playerLogic.waitForDeployment();
  const playerLogicAddress = await playerLogic.getAddress();
  console.log("✅ PlayerLogic deployed to:", playerLogicAddress);

  // 27. Deploy ItemLogic (world, itemProxy)
  console.log("\n2️⃣7️⃣ Deploying ItemLogic...");
  const ItemLogic = await ethers.getContractFactory("ItemLogic");
  const itemLogic = await ItemLogic.deploy(worldAddress, itemProxyAddress);
  await itemLogic.waitForDeployment();
  const itemLogicAddress = await itemLogic.getAddress();
  console.log("✅ ItemLogic deployed to:", itemLogicAddress);

  // 28. Deploy WeatherLogic (world, weatherProxy)
  console.log("\n2️⃣8️⃣ Deploying WeatherLogic...");
  const WeatherLogic = await ethers.getContractFactory("WeatherLogic");
  const weatherLogic = await WeatherLogic.deploy(
    worldAddress,
    weatherProxyAddress
  );
  await weatherLogic.waitForDeployment();
  const weatherLogicAddress = await weatherLogic.getAddress();
  console.log("✅ WeatherLogic deployed to:", weatherLogicAddress);

  // 29. Deploy PlotLogic (world, plotProxy, weatherProxy, playerProxy)
  console.log("\n2️⃣9️⃣ Deploying PlotLogic...");
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

  // 30. Deploy InventoryLogic (world, inventoryProxy, itemProxy, playerProxy)
  console.log("\n3️⃣0️⃣ Deploying InventoryLogic...");
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

  // 31. Deploy PlantLogic (world, plantProxy, plotProxy, inventoryProxy, weatherProxy, itemProxy)
  console.log("\n3️⃣1️⃣ Deploying PlantLogic...");
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

  // 32. Deploy FishingLogic (world, inventoryProxy, itemProxy, playerProxy, weatherProxy)
  console.log("\n3️⃣2️⃣ Deploying FishingLogic...");
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

  // 33. Deploy NPCMarketLogic (world, npcMarketProxy, itemProxy, inventoryProxy, playerProxy)
  console.log("\n3️⃣3️⃣ Deploying NPCMarketLogic...");
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

  // 34. Deploy GachaLogic (world, gachaProxy, playerProxy, inventoryProxy, itemProxy, deployer.address)
  console.log("\n3️⃣4️⃣ Deploying GachaLogic...");
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

  // 35. Deploy TaskLogic (world, taskProxy, playerProxy, inventoryProxy, itemProxy)
  console.log("\n3️⃣5️⃣ Deploying TaskLogic...");
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

  // 36. Deploy FleaMarketLogic (world, fleaMarketProxy, inventoryProxy, itemProxy, playerProxy)
  console.log("\n3️⃣6️⃣ Deploying FleaMarketLogic...");
  const FleaMarketLogic = await ethers.getContractFactory("FleaMarketLogic");
  const fleaMarketLogic = await FleaMarketLogic.deploy(
    worldAddress,
    fleaMarketProxyAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress
  );
  await fleaMarketLogic.waitForDeployment();
  const fleaMarketLogicAddress = await fleaMarketLogic.getAddress();
  console.log("✅ FleaMarketLogic deployed to:", fleaMarketLogicAddress);

  // 37. Deploy CraftingLogic (world, craftingProxy, inventoryProxy, itemProxy, playerProxy)
  console.log("\n3️⃣7️⃣ Deploying CraftingLogic...");
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

  // 38. Deploy RaisingLogic (world, raisingProxy, inventoryProxy, weatherProxy, itemProxy)
  console.log("\n3️⃣8️⃣ Deploying RaisingLogic...");
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

  // === PHASE 5: CONFIGURE WORLD CONTRACT ===
  console.log("\n⚙️ PHASE 5: Configuring World Contract...");

  // Register tất cả Logic contracts trong World
  const logicContracts = [
    { name: "PlayerLogic", address: playerLogicAddress },
    { name: "ItemLogic", address: itemLogicAddress },
    { name: "WeatherLogic", address: weatherLogicAddress },
    { name: "PlotLogic", address: plotLogicAddress },
    { name: "InventoryLogic", address: inventoryLogicAddress },
    { name: "PlantLogic", address: plantLogicAddress },
    { name: "FishingLogic", address: fishingLogicAddress },
    { name: "NPCMarketLogic", address: npcMarketLogicAddress },
    { name: "GachaLogic", address: gachaLogicAddress },
    { name: "TaskLogic", address: taskLogicAddress },
    { name: "FleaMarketLogic", address: fleaMarketLogicAddress },
    { name: "CraftingLogic", address: craftingLogicAddress },
    { name: "RaisingLogic", address: raisingLogicAddress },
  ];

  for (const logic of logicContracts) {
    console.log(`\n🔗 Registering ${logic.name} in World...`);
    const tx = await world.registerLogic(logic.address);
    await tx.wait();
    console.log(`✅ ${logic.name} registered successfully`);
  }

  // === PHASE 6: SAVE DEPLOYMENT INFO ===
  console.log("\n💾 PHASE 6: Saving Deployment Information...");

  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      // Core
      World: worldAddress,

      // Components
      PlayerComponent: playerComponentAddress,
      ItemComponent: itemComponentAddress,
      WeatherComponent: weatherComponentAddress,
      PlotComponent: plotComponentAddress,
      InventoryComponent: inventoryComponentAddress,
      PlantComponent: plantComponentAddress,
      NPCMarketComponent: npcMarketComponentAddress,
      GachaComponent: gachaComponentAddress,
      TaskComponent: taskComponentAddress,
      FleaMarketComponent: fleaMarketComponentAddress,
      CraftingComponent: craftingComponentAddress,
      RaisingComponent: raisingComponentAddress,

      // Proxies
      PlayerProxy: playerProxyAddress,
      ItemProxy: itemProxyAddress,
      WeatherProxy: weatherProxyAddress,
      PlotProxy: plotProxyAddress,
      InventoryProxy: inventoryProxyAddress,
      PlantProxy: plantProxyAddress,
      NPCMarketProxy: npcMarketProxyAddress,
      GachaProxy: gachaProxyAddress,
      TaskProxy: taskProxyAddress,
      FleaMarketProxy: fleaMarketProxyAddress,
      CraftingProxy: craftingProxyAddress,
      RaisingProxy: raisingProxyAddress,

      // Logic Contracts
      PlayerLogic: playerLogicAddress,
      ItemLogic: itemLogicAddress,
      WeatherLogic: weatherLogicAddress,
      PlotLogic: plotLogicAddress,
      InventoryLogic: inventoryLogicAddress,
      PlantLogic: plantLogicAddress,
      FishingLogic: fishingLogicAddress,
      NPCMarketLogic: npcMarketLogicAddress,
      GachaLogic: gachaLogicAddress,
      TaskLogic: taskLogicAddress,
      FleaMarketLogic: fleaMarketLogicAddress,
      CraftingLogic: craftingLogicAddress,
      RaisingLogic: raisingLogicAddress,
    },
    deploymentOrder: [
      "World",
      "PlayerComponent",
      "ItemComponent",
      "WeatherComponent",
      "PlotComponent",
      "InventoryComponent",
      "PlantComponent",
      "NPCMarketComponent",
      "GachaComponent",
      "TaskComponent",
      "FleaMarketComponent",
      "CraftingComponent",
      "RaisingComponent",
      "PlayerProxy",
      "ItemProxy",
      "WeatherProxy",
      "PlotProxy",
      "InventoryProxy",
      "PlantProxy",
      "NPCMarketProxy",
      "GachaProxy",
      "TaskProxy",
      "FleaMarketProxy",
      "CraftingProxy",
      "RaisingProxy",
      "PlayerLogic",
      "ItemLogic",
      "WeatherLogic",
      "PlotLogic",
      "InventoryLogic",
      "PlantLogic",
      "FishingLogic",
      "NPCMarketLogic",
      "GachaLogic",
      "TaskLogic",
      "FleaMarketLogic",
      "CraftingLogic",
      "RaisingLogic",
    ],
  };

  // Lưu vào file
  const fs = require("fs");
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  // === SUMMARY ===
  console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(`📊 Tổng số contracts đã deploy: 38 contracts`);
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Contract Categories:");
  console.log(`   • Core: 1 contract`);
  console.log(`   • Components: 13 contracts`);
  console.log(`   • Proxies: 13 contracts`);
  console.log(`   • Logic: 13 contracts`);
  console.log("\n🎮 Game Systems:");
  console.log(`   • Player Management`);
  console.log(`   • Item System`);
  console.log(`   • Weather System`);
  console.log(`   • Plot Management`);
  console.log(`   • Inventory System`);
  console.log(`   • Plant/Farming`);
  console.log(`   • Fishing`);
  console.log(`   • NPC Market`);
  console.log(`   • Gacha System`);
  console.log(`   • Task System`);
  console.log(`   • Flea Market`);
  console.log(`   • Crafting System`);
  console.log(`   • Raising/Livestock`);
  console.log("\n🔗 Next Steps:");
  console.log(`   • Verify contracts on block explorer`);
  console.log(`   • Initialize game data`);
  console.log(`   • Test all game functions`);
  console.log(`   • Update frontend configuration`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
