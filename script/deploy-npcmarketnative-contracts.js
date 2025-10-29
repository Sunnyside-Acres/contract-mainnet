const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy NPCMarketNative contracts...");

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
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  console.log("\n📋 Required contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);

  // === DEPLOY NPCMARKETNATIVE COMPONENT ===
  console.log("\n🚀 PHASE 1: Deploying NPCMarketNativeComponent...");

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

  // === DEPLOY NPCMARKETNATIVE LOGIC ===
  console.log("\n🚀 PHASE 2: Deploying NPCMarketNativeLogic...");

  const NPCMarketNativeLogic = await ethers.getContractFactory(
    "NPCMarketNativeLogic"
  );
  const npcMarketNativeLogic = await NPCMarketNativeLogic.deploy(
    worldAddress,
    npcMarketNativeComponentAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await npcMarketNativeLogic.waitForDeployment();
  const npcMarketNativeLogicAddress = await npcMarketNativeLogic.getAddress();
  console.log(
    "✅ NPCMarketNativeLogic deployed to:",
    npcMarketNativeLogicAddress
  );

  // === DEPLOY NPCMARKETNATIVE PROXY ===
  console.log("\n🚀 PHASE 3: Deploying NPCMarketNativeProxy...");

  const NPCMarketNativeProxy = await ethers.getContractFactory(
    "NPCMarketNativeProxy"
  );
  const npcMarketNativeProxy = await NPCMarketNativeProxy.deploy(
    worldAddress,
    deployer.address, // admin
    npcMarketNativeLogicAddress
  );
  await npcMarketNativeProxy.waitForDeployment();
  const npcMarketNativeProxyAddress = await npcMarketNativeProxy.getAddress();
  console.log(
    "✅ NPCMarketNativeProxy deployed to:",
    npcMarketNativeProxyAddress
  );

  // === REGISTER NPCMARKETNATIVE LOGIC IN WORLD ===
  console.log("\n🔗 PHASE 4: Registering NPCMarketNativeLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering NPCMarketNativeLogic in World contract...");
    const registerTx = await world.registerLogic(npcMarketNativeLogicAddress);
    await registerTx.wait();
    console.log("✅ NPCMarketNativeLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register NPCMarketNativeLogic:", error.message);
    throw error;
  }

  // === FUND CONTRACT WITH ETH (OPTIONAL) ===
  console.log("\n💰 PHASE 5: Funding contract with ETH (optional)...");

  try {
    const fundAmount = ethers.parseEther("1.0"); // 1 ETH
    const fundTx = await deployer.sendTransaction({
      to: npcMarketNativeLogicAddress,
      value: fundAmount,
    });
    await fundTx.wait();

    const contractBalance = await ethers.provider.getBalance(
      npcMarketNativeLogicAddress
    );
    console.log(
      `✅ Contract funded with ${ethers.formatEther(fundAmount)} ETH`
    );
    console.log(
      `   • Contract balance: ${ethers.formatEther(contractBalance)} ETH`
    );
  } catch (error) {
    console.log(
      "⚠️  Warning: Failed to fund contract with ETH:",
      error.message
    );
    console.log("   • You can manually fund the contract later if needed");
  }

  // === UPDATE DEPLOYMENT JSON ===
  console.log("\n💾 PHASE 6: Updating deployment JSON...");

  try {
    // Cập nhật địa chỉ NPCMarketNative contracts
    deploymentInfo.contracts.NPCMarketNativeComponent =
      npcMarketNativeComponentAddress;
    deploymentInfo.contracts.NPCMarketNativeLogic = npcMarketNativeLogicAddress;
    deploymentInfo.contracts.NPCMarketNativeProxy = npcMarketNativeProxyAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ NPCMarketNative contracts updated in: ${deploymentPath}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 NPCMARKETNATIVE DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  console.log("\n📋 NPCMarketNative Contracts:");
  console.log(
    `   • NPCMarketNativeComponent: ${npcMarketNativeComponentAddress}`
  );
  console.log(`   • NPCMarketNativeLogic: ${npcMarketNativeLogicAddress}`);
  console.log(`   • NPCMarketNativeProxy: ${npcMarketNativeProxyAddress}`);

  console.log("\n📋 Dependencies:");
  console.log(`   • World: ${worldAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • PlayerProxy: ${playerProxyAddress}`);

  console.log("\n✅ NPCMarketNative deployed successfully!");
  console.log("\n📝 Deployment file updated with new contracts!");

  console.log("\n🔗 Next Steps:");
  console.log(`   • Test NPCMarketNative functions`);
  console.log(`   • Create NPC markets using createNPCMarket()`);
  console.log(`   • Add items to markets using addItemToMarket()`);
  console.log(`   • Fund contract with ETH for buying items from players`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Verify contracts on block explorer`);

  console.log("\n💡 Usage Examples:");
  console.log(`   // Create a market`);
  console.log(`   await npcMarketNativeLogic.createNPCMarket(`);
  console.log(`     1, // npcId`);
  console.log(`     "Blacksmith", // name`);
  console.log(`     ethers.parseEther("0.001"), // minTransactionAmount`);
  console.log(`     ethers.parseEther("10") // maxTransactionAmount`);
  console.log(`   );`);
  console.log(`   `);
  console.log(`   // Add item to market`);
  console.log(`   await npcMarketNativeLogic.addItemToMarket(`);
  console.log(`     1, // npcId`);
  console.log(`     101, // itemId`);
  console.log(`     5, // limitPerUser`);
  console.log(`     ethers.parseEther("0.1"), // pricePerUnit`);
  console.log(`     true // isSelling`);
  console.log(`   );`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NPCMarketNative deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
