const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("📊 Kiểm tra trạng thái NPCMarketNative...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const npcMarketNativeLogicAddress =
    deploymentInfo.contracts.NPCMarketNativeLogic;

  if (!npcMarketNativeLogicAddress) {
    throw new Error("NPCMarketNativeLogic not found in deployment file");
  }

  console.log("📋 NPCMarketNativeLogic address:", npcMarketNativeLogicAddress);

  // Get contract instance
  const npcMarketNativeLogic = await ethers.getContractAt(
    "NPCMarketNativeLogic",
    npcMarketNativeLogicAddress
  );

  // === CHECK CONTRACT BALANCE ===
  console.log("\n💰 CONTRACT BALANCE:");
  try {
    const contractBalance = await npcMarketNativeLogic.getContractBalance();
    console.log(`   • ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);
  } catch (error) {
    console.error("   ❌ Failed to get contract balance:", error.message);
  }

  // === CHECK ALL MARKETS ===
  console.log("\n🏪 NPC MARKETS STATUS:");

  const marketIds = [1, 2, 3, 4]; // Blacksmith, Potion Shop, Weapon Dealer, General Store

  for (const npcId of marketIds) {
    try {
      const marketInfo = await npcMarketNativeLogic.getNPCMarketInfo(npcId);
      const isOpen = await npcMarketNativeLogic.isMarketOpen(npcId);
      const marketStats = await npcMarketNativeLogic.getMarketStats(npcId);
      const allItems = await npcMarketNativeLogic.getAllMarketItems(npcId);

      console.log(`\n   📍 NPC ${npcId} - ${marketInfo.name}:`);
      console.log(`      • Status: ${isOpen ? "🟢 Open" : "🔴 Closed"}`);
      console.log(`      • Items: ${marketInfo.itemCount} total`);
      console.log(
        `      • Min Transaction: ${ethers.formatEther(
          marketInfo.minTransactionAmount
        )} ETH`
      );
      console.log(
        `      • Max Transaction: ${ethers.formatEther(
          marketInfo.maxTransactionAmount
        )} ETH`
      );
      console.log(
        `      • Total Earnings: ${ethers.formatEther(
          marketInfo.totalEarnings
        )} ETH`
      );
      console.log(
        `      • Total Spent: ${ethers.formatEther(marketInfo.totalSpent)} ETH`
      );
      console.log(
        `      • Total Transactions: ${marketStats.totalTransactions}`
      );
      console.log(
        `      • Total Volume: ${ethers.formatEther(
          marketStats.totalVolume
        )} ETH`
      );
      console.log(
        `      • Buy Transactions: ${marketStats.totalBuyTransactions}`
      );
      console.log(
        `      • Sell Transactions: ${marketStats.totalSellTransactions}`
      );

      if (allItems.length > 0) {
        console.log(`      • Items:`);
        for (const item of allItems) {
          const status = item.isSelling ? "🛒 Selling" : "💰 Buying";
          console.log(
            `         - ${item.itemId}: ${status} ${ethers.formatEther(
              item.pricePerUnit
            )} ETH (limit: ${item.limitPerUser})`
          );
        }
      }
    } catch (error) {
      console.error(`   ❌ Failed to get market ${npcId} info:`, error.message);
    }
  }

  // === CHECK RECENT TRANSACTIONS ===
  console.log("\n📈 RECENT TRANSACTIONS:");
  try {
    // Get transaction counter from component
    const npcMarketNativeComponent = await ethers.getContractAt(
      "NPCMarketNativeComponent",
      deploymentInfo.contracts.NPCMarketNativeComponent
    );
    const transactionCounter =
      await npcMarketNativeComponent.transactionCounter();

    console.log(`   • Total Transactions: ${transactionCounter}`);

    if (transactionCounter > 0) {
      console.log(`   • Recent Transactions (last 5):`);
      const startTx = Math.max(1, transactionCounter - 4);
      const endTx = transactionCounter;

      for (let i = startTx; i <= endTx; i++) {
        try {
          const tx = await npcMarketNativeLogic.getTransactionRecord(i);
          const type = tx.isBuy ? "🛒 BUY" : "💰 SELL";
          const time = new Date(Number(tx.timestamp) * 1000).toLocaleString();
          console.log(
            `      ${i}. ${type} - Player: ${tx.player} - Item: ${
              tx.itemId
            } - Qty: ${tx.quantity} - Price: ${ethers.formatEther(
              tx.totalPrice
            )} ETH - ${time}`
          );
        } catch (error) {
          console.log(`      ${i}. ❌ Failed to get transaction details`);
        }
      }
    }
  } catch (error) {
    console.error("   ❌ Failed to get transaction info:", error.message);
  }

  // === CHECK USER STATISTICS ===
  console.log("\n👥 USER STATISTICS:");
  try {
    // Get some sample addresses to check (you can modify these)
    const sampleAddresses = [
      "0x0000000000000000000000000000000000000000", // Zero address as example
      // Add more addresses if you have them
    ];

    for (const address of sampleAddresses) {
      if (address !== "0x0000000000000000000000000000000000000000") {
        try {
          const userStats = await npcMarketNativeLogic.getUserMarketStats(
            1,
            address
          );
          if (userStats.totalTransactions > 0) {
            console.log(`   • User ${address}:`);
            console.log(
              `      - Total Transactions: ${userStats.totalTransactions}`
            );
            console.log(
              `      - Total Volume: ${ethers.formatEther(
                userStats.totalVolume
              )} ETH`
            );
            console.log(
              `      - Buy Transactions: ${userStats.totalBuyTransactions}`
            );
            console.log(
              `      - Sell Transactions: ${userStats.totalSellTransactions}`
            );
          }
        } catch (error) {
          // Skip if user has no stats
        }
      }
    }
  } catch (error) {
    console.error("   ❌ Failed to get user statistics:", error.message);
  }

  // === SUMMARY ===
  console.log("\n📊 NPCMARKETNATIVE STATUS SUMMARY:");
  console.log("=".repeat(50));

  try {
    const contractBalance = await npcMarketNativeLogic.getContractBalance();
    console.log(
      `💰 Contract Balance: ${ethers.formatEther(contractBalance)} ETH`
    );

    let totalItems = 0;
    let totalMarkets = 0;
    let totalTransactions = 0;
    let totalVolume = ethers.BigNumber.from(0);

    for (const npcId of marketIds) {
      try {
        const marketInfo = await npcMarketNativeLogic.getNPCMarketInfo(npcId);
        const marketStats = await npcMarketNativeLogic.getMarketStats(npcId);

        if (marketInfo.isActive) {
          totalMarkets++;
          totalItems += Number(marketInfo.itemCount);
          totalTransactions += Number(marketStats.totalTransactions);
          totalVolume = totalVolume.add(marketStats.totalVolume);
        }
      } catch (error) {
        // Skip if market doesn't exist
      }
    }

    console.log(`🏪 Active Markets: ${totalMarkets}`);
    console.log(`📦 Total Items: ${totalItems}`);
    console.log(`📈 Total Transactions: ${totalTransactions}`);
    console.log(`💰 Total Volume: ${ethers.formatEther(totalVolume)} ETH`);

    if (totalVolume.gt(0)) {
      console.log(
        `📊 Average Transaction: ${ethers.formatEther(
          totalVolume.div(totalTransactions)
        )} ETH`
      );
    }

    console.log("\n✅ NPCMarketNative is operational!");
  } catch (error) {
    console.error("❌ Failed to get summary:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NPCMarketNative status check failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
