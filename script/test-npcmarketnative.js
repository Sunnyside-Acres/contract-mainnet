const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing NPCMarketNative system...");

  // Lấy signer và network info
  const [deployer, player1] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Admin address:", deployer.address);
  console.log("📝 Player address:", player1.address);
  console.log("🌐 Network:", network.name);

  // Lấy contract addresses từ file deployment
  const deploymentPath = `./deployed/npcmarketnative-deployment-${network.name}.json`;
  if (!require("fs").existsSync(deploymentPath)) {
    throw new Error(
      `File deployment không tồn tại: ${deploymentPath}\nVui lòng chạy deploy-npcmarketnative-contracts.js trước`
    );
  }

  const deploymentData = JSON.parse(
    require("fs").readFileSync(deploymentPath, "utf8")
  );
  const contracts = deploymentData.contracts;

  // Lấy contracts
  const NPCMarketNativeLogic = await ethers.getContractFactory(
    "NPCMarketNativeLogic"
  );
  const npcMarketNativeLogic = NPCMarketNativeLogic.attach(
    contracts.NPCMarketNativeLogic
  );

  const PlayerLogic = await ethers.getContractFactory("PlayerLogic");
  const ItemLogic = await ethers.getContractFactory("ItemLogic");
  const InventoryLogic = await ethers.getContractFactory("InventoryLogic");

  // Get main deployment file
  const mainDeploymentPath = `./deployed/contract-addresses-${network.name}.json`;
  const mainDeploymentData = JSON.parse(
    require("fs").readFileSync(mainDeploymentPath, "utf8")
  );
  const mainContracts = mainDeploymentData.contracts;

  const playerLogic = PlayerLogic.attach(mainContracts.PlayerLogic);
  const itemLogic = ItemLogic.attach(mainContracts.ItemLogic);
  const inventoryLogic = InventoryLogic.attach(
    mainContracts.InventoryLogic
  );

  console.log("🔗 Connected to contracts");

  // Test 1: Get treasury wallet
  console.log("\n📋 Test 1: Getting treasury wallet...");
  const treasuryWallet = await npcMarketNativeLogic.treasuryWallet();
  console.log(`✅ Treasury wallet: ${treasuryWallet}`);

  // Test 2: Get contract balance (should be 0 as players pay ETH directly)
  console.log("\n📋 Test 2: Getting contract balance...");
  const balance = await npcMarketNativeLogic.getContractBalance();
  console.log(
    `✅ Contract balance: ${ethers.formatEther(balance)} ETH (players pay ETH directly when buying)`
  );

  // Test 3: Get all NPC markets
  console.log("\n📋 Test 3: Checking NPC markets...");
  try {
    // Try to get market info for NPC 1
    const marketInfo = await npcMarketNativeLogic.getNPCMarketInfo(1);
    console.log(`✅ Found market: ${marketInfo.name}`);
    console.log(`   Active: ${marketInfo.isActive}`);
    console.log(`   Items: ${marketInfo.itemCount}`);
    console.log(
      `   Min Transaction: ${ethers.formatEther(marketInfo.minTransactionAmount)} ETH`
    );
    console.log(
      `   Max Transaction: ${ethers.formatEther(marketInfo.maxTransactionAmount)} ETH`
    );

    // Get market items
    const items = await npcMarketNativeLogic.getAllMarketItems(1);
    console.log(`   Market items: ${items.length}`);
    for (const item of items) {
      console.log(
        `     • Item ${item.itemId}: ${ethers.formatEther(item.pricePerUnit)} ETH per unit (limit: ${item.limitPerUser === 0 ? "unlimited" : item.limitPerUser})`
      );
    }
  } catch (error) {
    console.log(`ℹ️ No markets found yet. Please run setup-npcmarketnative-sample.js first`);
  }

  // Test 4: Create player if not exists
  console.log("\n📋 Test 4: Creating player...");
  try {
    const createPlayerTx = await playerLogic.createPlayer(
      player1.address,
      "TestPlayer",
      1, // level
      100, // xp
      100, // mana
      100, // maxMana
      1000, // sunlight
      500, // sunny
      Math.floor(Date.now() / 1000) // lastLogin
    );
    await createPlayerTx.wait();
    console.log("✅ Player created successfully");
  } catch (error) {
    if (error.message.includes("Player already exists")) {
      console.log("ℹ️ Player already exists");
    } else {
      throw error;
    }
  }

  // Test 5: Create items if not exists
  console.log("\n📋 Test 5: Creating items...");
  const items = [
    { id: 1, name: "Wood", type: 0, rarity: 0, maxStacked: 100, isStacked: true, isTradable: true },
    { id: 2, name: "Stone", type: 0, rarity: 0, maxStacked: 100, isStacked: true, isTradable: true },
  ];

  for (const item of items) {
    try {
      const createItemTx = await itemLogic.createItem(
        item.id,
        item.name,
        item.type,
        item.rarity,
        item.maxStacked,
        item.isStacked,
        item.isTradable
      );
      await createItemTx.wait();
      console.log(`✅ Item created: ${item.name} (ID: ${item.id})`);
    } catch (error) {
      if (error.message.includes("Item already exists")) {
        console.log(`ℹ️ Item ${item.name} already exists`);
      } else {
        throw error;
      }
    }
  }

  // Test 6: Check player ETH balance
  console.log("\n📋 Test 6: Checking player ETH balance...");
  const playerBalance = await ethers.provider.getBalance(player1.address);
  console.log(
    `✅ Player balance: ${ethers.formatEther(playerBalance)} ETH`
  );

  // Test 7: Test buy item from NPC (only if market exists)
  console.log("\n📋 Test 7: Testing buy item from NPC...");
  try {
    const marketInfo = await npcMarketNativeLogic.getNPCMarketInfo(1);
    if (marketInfo.isActive && marketInfo.itemCount > 0) {
      const items = await npcMarketNativeLogic.getAllMarketItems(1);
      if (items.length > 0) {
        const item = items[0];
        const quantity = 10;
        const totalPrice = await npcMarketNativeLogic.calculateBuyPrice(
          1,
          item.itemId,
          quantity
        );
        console.log(
          `   Trying to buy ${quantity} x Item ${item.itemId} for ${ethers.formatEther(totalPrice)} ETH`
        );

        // Check player has enough ETH
        if (playerBalance >= totalPrice) {
          // Get treasury balance before
          const treasuryBalanceBefore = await ethers.provider.getBalance(
            treasuryWallet
          );

          // Buy item with ETH
          const buyTx = await npcMarketNativeLogic
            .connect(player1)
            .buyItemFromNPC(1, item.itemId, quantity, {
              value: totalPrice
            });
          const receipt = await buyTx.wait();
          console.log("   ✅ Buy transaction successful!");
          console.log(`   Transaction hash: ${receipt.hash}`);

          // Check treasury wallet balance increase
          const treasuryBalanceAfter = await ethers.provider.getBalance(
            treasuryWallet
          );
          const treasuryIncrease = treasuryBalanceAfter - treasuryBalanceBefore;
          console.log(
            `   Treasury wallet received: ${ethers.formatEther(treasuryIncrease)} ETH`
          );
          console.log(
            `   Treasury wallet balance: ${ethers.formatEther(treasuryBalanceAfter)} ETH`
          );

          // Check player inventory
          const playerItem = await inventoryLogic.getItem(player1.address, item.itemId);
          console.log(
            `   Player inventory - Item ${item.itemId}: ${playerItem.quantity}`
          );
        } else {
          console.log(
            `   ⚠️ Player balance insufficient (${ethers.formatEther(playerBalance)} ETH < ${ethers.formatEther(totalPrice)} ETH)`
          );
          console.log(`   Please fund player wallet with ETH first`);
        }
      } else {
        console.log("   ⚠️ No items in market");
      }
    } else {
      console.log("   ⚠️ Market not active or empty");
    }
  } catch (error) {
    console.log(`   ⚠️ Cannot test buy: ${error.message}`);
  }

  console.log("\n🎉 NPCMarketNative test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
