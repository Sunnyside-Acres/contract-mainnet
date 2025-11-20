const { ethers } = require("hardhat");

async function main() {
  console.log("🏪 Bắt đầu deploy NPCMarketNative contracts...");

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

  // Lấy contract addresses từ file deployment
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;
  if (!require("fs").existsSync(deploymentPath)) {
    throw new Error(`File deployment không tồn tại: ${deploymentPath}`);
  }

  const deploymentData = JSON.parse(
    require("fs").readFileSync(deploymentPath, "utf8")
  );
  const contracts = deploymentData.contracts;

  console.log("📋 Contract addresses loaded from deployment file");

  // Treasury wallet address - có thể set qua environment variable hoặc dùng deployer
  const treasuryWallet =
    process.env.TREASURY_WALLET || deployer.address;
  console.log("💰 Treasury wallet:", treasuryWallet);

  // === PHASE 1: DEPLOY COMPONENT ===
  console.log("\n📦 PHASE 1: Deploying Component...");

  // Deploy NPCMarketNativeComponent
  console.log("\n1️⃣ Deploying NPCMarketNativeComponent...");
  const NPCMarketNativeComponent = await ethers.getContractFactory(
    "NPCMarketNativeComponent"
  );
  const npcMarketNativeComponent = await NPCMarketNativeComponent.deploy();
  await npcMarketNativeComponent.waitForDeployment();
  const npcMarketNativeComponentAddress =
    await npcMarketNativeComponent.getAddress();
  console.log(
    "✅ NPCMarketNativeComponent deployed to:",
    npcMarketNativeComponentAddress
  );

  // === PHASE 2: DEPLOY PROXY ===
  console.log("\n📦 PHASE 2: Deploying Proxy...");

  // Deploy NPCMarketNativeProxy
  console.log("\n2️⃣ Deploying NPCMarketNativeProxy...");
  const NPCMarketNativeProxy = await ethers.getContractFactory(
    "NPCMarketNativeProxy"
  );
  const npcMarketNativeProxy = await NPCMarketNativeProxy.deploy(
    contracts.World,
    deployer.address,
    npcMarketNativeComponentAddress
  );
  await npcMarketNativeProxy.waitForDeployment();
  const npcMarketNativeProxyAddress =
    await npcMarketNativeProxy.getAddress();
  console.log(
    "✅ NPCMarketNativeProxy deployed to:",
    npcMarketNativeProxyAddress
  );

  // === PHASE 3: DEPLOY LOGIC ===
  console.log("\n📦 PHASE 3: Deploying Logic Contract...");

  // Deploy NPCMarketNativeLogic
  console.log("\n3️⃣ Deploying NPCMarketNativeLogic...");
  const NPCMarketNativeLogic = await ethers.getContractFactory(
    "NPCMarketNativeLogic"
  );
  const npcMarketNativeLogic = await NPCMarketNativeLogic.deploy(
    contracts.World,
    npcMarketNativeProxyAddress,
    contracts.ItemProxy,
    contracts.InventoryProxy,
    contracts.PlayerProxy,
    treasuryWallet
  );
  await npcMarketNativeLogic.waitForDeployment();
  const npcMarketNativeLogicAddress =
    await npcMarketNativeLogic.getAddress();
  console.log(
    "✅ NPCMarketNativeLogic deployed to:",
    npcMarketNativeLogicAddress
  );

  // === PHASE 4: REGISTER LOGIC IN WORLD ===
  console.log("\n📦 PHASE 4: Registering Logic in World...");

  // Register Logic trong World: Để World cho phép Logic contract hoạt động
  // Proxy có modifier onlyAuthorized check World.isLogicRegistered(msg.sender)
  // Logic contract gọi Component trực tiếp, không qua Proxy
  const World = await ethers.getContractFactory("World");
  const world = World.attach(contracts.World);

  console.log("\n4️⃣ Registering NPCMarketNativeLogic in World (for authorization)...");
  const registerTx = await world.registerLogic(npcMarketNativeLogicAddress);
  await registerTx.wait();
  console.log("✅ NPCMarketNativeLogic registered in World successfully");

  // === PHASE 5: SAVE DEPLOYMENT INFO ===
  console.log("\n💾 PHASE 5: Saving Deployment Information...");

  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    treasuryWallet: treasuryWallet,
    timestamp: new Date().toISOString(),
    contracts: {
      NPCMarketNativeComponent: npcMarketNativeComponentAddress,
      NPCMarketNativeProxy: npcMarketNativeProxyAddress,
      NPCMarketNativeLogic: npcMarketNativeLogicAddress,
    },
    deploymentOrder: [
      "NPCMarketNativeComponent",
      "NPCMarketNativeProxy",
      "NPCMarketNativeLogic",
    ],
  };

  const fs = require("fs");
  const deploymentPath2 = `./deployed/npcmarketnative-deployment-${network.name}.json`;

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    deploymentPath2,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n💾 Deployment info saved to: ${deploymentPath2}`);

  // Update main deployment file
  const mainDeployment = JSON.parse(
    fs.readFileSync(deploymentPath, "utf8")
  );
  mainDeployment.contracts.NPCMarketNativeComponent =
    npcMarketNativeComponentAddress;
  mainDeployment.contracts.NPCMarketNativeProxy =
    npcMarketNativeProxyAddress;
  mainDeployment.contracts.NPCMarketNativeLogic =
    npcMarketNativeLogicAddress;

  if (!mainDeployment.contracts.treasuryWallet) {
    mainDeployment.contracts.treasuryWallet = treasuryWallet;
  }

  // Add to deployment order if not exists
  if (!mainDeployment.deploymentOrder.includes("NPCMarketNativeComponent")) {
    mainDeployment.deploymentOrder.push("NPCMarketNativeComponent");
    mainDeployment.deploymentOrder.push("NPCMarketNativeProxy");
    mainDeployment.deploymentOrder.push("NPCMarketNativeLogic");
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(mainDeployment, null, 2));
  console.log(`💾 Main deployment file updated: ${deploymentPath}`);

  // === SUMMARY ===
  console.log("\n🎉 NPCMARKETNATIVE DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(`📊 Contracts deployed: 3 contracts`);
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Treasury Wallet: ${treasuryWallet}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Contracts:");
  console.log(
    `   • NPCMarketNativeComponent: ${npcMarketNativeComponentAddress}`
  );
  console.log(`   • NPCMarketNativeProxy: ${npcMarketNativeProxyAddress}`);
  console.log(`   • NPCMarketNativeLogic: ${npcMarketNativeLogicAddress}`);
  console.log("\n🎮 System Features:");
  console.log(`   • BUY ONLY - NPCs sell items to players`);
  console.log(`   • Players pay ETH when buying items`);
  console.log(`   • ETH proceeds go directly to treasury wallet`);
  console.log(`   • Treasury wallet: ${treasuryWallet}`);
  console.log("\n🔗 Next Steps:");
  console.log(`   • Create NPC markets using createNPCMarket()`);
  console.log(`   • Add items to markets using addItemToMarket(isSelling=true)`);
  console.log(`   • Players can buy items using buyItemFromNPC() with ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
