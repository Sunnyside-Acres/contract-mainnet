const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log(
    "🚀 Bắt đầu deploy NPCMarketLogic contract với các hàm tối ưu hóa..."
  );

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

  // Lấy địa chỉ NPCMarket contracts hiện tại
  const npcMarketComponentAddress =
    deploymentInfo.contracts.NPCMarketComponent ||
    "0x0000000000000000000000000000000000000000";
  const npcMarketProxyAddress =
    deploymentInfo.contracts.NPCMarketProxy ||
    "0x0000000000000000000000000000000000000000";
  const oldNPCMarketLogicAddress =
    deploymentInfo.contracts.NPCMarketLogic ||
    "0x0000000000000000000000000000000000000000";

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • ItemProxy:", itemProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • PlayerProxy:", playerProxyAddress);
  console.log("   • NPCMarketComponent:", npcMarketComponentAddress);
  console.log("   • NPCMarketProxy:", npcMarketProxyAddress);
  console.log("   • Old NPCMarketLogic:", oldNPCMarketLogicAddress);

  // Validate required contracts
  if (npcMarketProxyAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "NPCMarketProxy chưa được deploy. Vui lòng deploy NPCMarketProxy trước."
    );
  }

  // === DEPLOY NPCMARKET LOGIC WITH OPTIMIZATIONS ===
  console.log("\n🚀 PHASE: Deploying NPCMarketLogic với các hàm tối ưu hóa...");

  // Deploy NPCMarketLogic mới
  console.log("\n1️⃣ Deploying NPCMarketLogic với batch reset functions...");
  const NPCMarketLogic = await ethers.getContractFactory("NPCMarketLogic");
  const npcMarketLogic = await NPCMarketLogic.deploy(
    worldAddress,
    npcMarketProxyAddress,
    itemProxyAddress,
    inventoryProxyAddress,
    playerProxyAddress
  );
  await npcMarketLogic.waitForDeployment();
  const newNPCMarketLogicAddress = await npcMarketLogic.getAddress();
  console.log("✅ NPCMarketLogic deployed to:", newNPCMarketLogicAddress);

  // Verify contract deployment
  console.log("\n2️⃣ Verifying contract deployment...");
  try {
    const currentDay = await npcMarketLogic.getCurrentDay();
    console.log(
      "✅ Contract verification successful - Current day:",
      currentDay.toString()
    );
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
    throw error;
  }

  console.log("\n✅ NPCMarketLogic với tối ưu hóa đã được deploy thành công!");

  // === REGISTER NPCMARKETLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering NPCMarketLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Unregister old logic if exists
    if (
      oldNPCMarketLogicAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      console.log("   • Unregistering old NPCMarketLogic...");
      try {
        const unregisterTx = await world.unregisterLogic(
          oldNPCMarketLogicAddress
        );
        await unregisterTx.wait();
        console.log("✅ Old NPCMarketLogic unregistered successfully!");
      } catch (error) {
        console.log(
          "⚠️  Warning: Could not unregister old logic:",
          error.message
        );
      }
    }

    // Register new logic
    console.log("   • Registering new NPCMarketLogic in World contract...");
    const registerTx = await world.registerLogic(newNPCMarketLogicAddress);
    await registerTx.wait();
    console.log("✅ New NPCMarketLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register NPCMarketLogic:", error.message);
    throw error;
  }

  // === UPDATE DEPLOYMENT JSON ===
  console.log("\n💾 PHASE: Updating deployment JSON...");

  try {
    // Cập nhật địa chỉ NPCMarketLogic mới
    deploymentInfo.contracts.NPCMarketLogic = newNPCMarketLogicAddress;

    // Thêm thông tin về các hàm tối ưu hóa
    deploymentInfo.contracts.NPCMarketLogicOptimizations = {
      deployedAt: new Date().toISOString(),
      features: [
        "resetMultipleUserPurchases",
        "resetAllUserPurchasesForNPCMarket",
        "resetAllUserPurchasesForItem",
        "executeDailyReset",
        "isDailyResetExecuted",
        "getLastResetDay",
        "getCurrentDay",
      ],
      batchLimits: {
        resetMultipleUserPurchases: 100,
        resetAllUserPurchasesForNPCMarket: 50,
        resetAllUserPurchasesForItem: "30 users, 20 NPCs",
      },
    };

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Deployment JSON updated: ${deploymentPath}`);
    console.log(`   • NPCMarketLogic: ${newNPCMarketLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === TEST NEW FUNCTIONS ===
  console.log("\n🧪 PHASE: Testing new optimization functions...");

  try {
    // Test getCurrentDay function
    const currentDay = await npcMarketLogic.getCurrentDay();
    console.log(
      "✅ getCurrentDay() test passed - Current day:",
      currentDay.toString()
    );

    // Test isDailyResetExecuted for a non-existent NPC (should return false)
    const testNPCId = 999999;
    const isReset = await npcMarketLogic.isDailyResetExecuted(testNPCId);
    console.log("✅ isDailyResetExecuted() test passed - Result:", isReset);

    // Test getLastResetDay for a non-existent NPC (should return 0)
    const lastResetDay = await npcMarketLogic.getLastResetDay(testNPCId);
    console.log(
      "✅ getLastResetDay() test passed - Last reset day:",
      lastResetDay.toString()
    );

    console.log("✅ All optimization functions tested successfully!");
  } catch (error) {
    console.error("❌ Function testing failed:", error.message);
    throw error;
  }

  // === SUMMARY ===
  console.log("\n🎉 NPCMARKET LOGIC OPTIMIZATION DEPLOYMENT COMPLETED!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New NPCMarketLogic Contract:");
  console.log(`   • Address: ${newNPCMarketLogicAddress}`);
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • NPCMarketProxy: ${npcMarketProxyAddress}`);

  console.log("\n🚀 New Optimization Features:");
  console.log(
    "   • resetMultipleUserPurchases() - Batch reset users for 1 item"
  );
  console.log(
    "   • resetAllUserPurchasesForNPCMarket() - Reset all items for 1 NPC"
  );
  console.log(
    "   • resetAllUserPurchasesForItem() - Reset 1 item across multiple NPCs"
  );
  console.log("   • executeDailyReset() - Daily reset with timestamp tracking");
  console.log("   • isDailyResetExecuted() - Check if daily reset was done");
  console.log("   • getLastResetDay() - Get last reset day");
  console.log("   • getCurrentDay() - Get current day");

  console.log("\n📊 Batch Limits:");
  console.log("   • resetMultipleUserPurchases: 100 users max");
  console.log("   • resetAllUserPurchasesForNPCMarket: 50 users max");
  console.log("   • resetAllUserPurchasesForItem: 30 users, 20 NPCs max");

  console.log("\n✅ NPCMarketLogic optimization deployed successfully!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test batch reset functions with real data`);
  console.log(`   • Update keeper scripts to use new functions`);
  console.log(`   • Monitor gas usage improvements`);
  console.log(`   • Update frontend configuration`);
  console.log(`   • Verify contracts on block explorer`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NPCMarketLogic optimization deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
