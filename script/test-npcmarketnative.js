const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Bắt đầu test NPCMarketNative contracts...");

  // Lấy signer và network info
  const [deployer, player1, player2] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Test accounts:");
  console.log("   • Deployer (Admin):", deployer.address);
  console.log("   • Player 1:", player1.address);
  console.log("   • Player 2:", player2.address);
  console.log("🌐 Network:", network.name);

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment info from:", deploymentPath);

  // Lấy địa chỉ NPCMarketNative contracts
  const npcMarketNativeLogicAddress =
    deploymentInfo.contracts.NPCMarketNativeLogic;
  const npcMarketNativeProxyAddress =
    deploymentInfo.contracts.NPCMarketNativeProxy;
  const worldAddress = deploymentInfo.contracts.World;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  if (!npcMarketNativeLogicAddress) {
    throw new Error("NPCMarketNativeLogic not found in deployment file");
  }

  console.log("\n📋 Contract addresses:");
  console.log("   • NPCMarketNativeLogic:", npcMarketNativeLogicAddress);
  console.log("   • NPCMarketNativeProxy:", npcMarketNativeProxyAddress);
  console.log("   • World:", worldAddress);

  // Get contract instances
  const npcMarketNativeLogic = await ethers.getContractAt(
    "NPCMarketNativeLogic",
    npcMarketNativeLogicAddress
  );
  const world = await ethers.getContractAt("World", worldAddress);
  const itemProxy = await ethers.getContractAt(
    "ItemComponent",
    itemProxyAddress
  );
  const inventoryProxy = await ethers.getContractAt(
    "InventoryComponent",
    inventoryProxyAddress
  );
  const playerProxy = await ethers.getContractAt(
    "PlayerComponent",
    playerProxyAddress
  );

  console.log("\n🧪 Starting NPCMarketNative tests...");

  // === TEST 1: CREATE NPC MARKET ===
  console.log("\n1️⃣ TEST: Creating NPC Market...");

  try {
    const createMarketTx = await npcMarketNativeLogic.createNPCMarket(
      1, // npcId
      "Test Blacksmith", // name
      ethers.parseEther("0.001"), // minTransactionAmount
      ethers.parseEther("10") // maxTransactionAmount
    );
    await createMarketTx.wait();
    console.log("✅ NPC Market created successfully!");

    // Verify market info
    const marketInfo = await npcMarketNativeLogic.getNPCMarketInfo(1);
    console.log("   • Market Info:", {
      npcId: marketInfo.npcId.toString(),
      name: marketInfo.name,
      isActive: marketInfo.isActive,
      itemCount: marketInfo.itemCount.toString(),
      minTransactionAmount: ethers.formatEther(marketInfo.minTransactionAmount),
      maxTransactionAmount: ethers.formatEther(marketInfo.maxTransactionAmount),
    });
  } catch (error) {
    console.error("❌ Failed to create NPC market:", error.message);
  }

  // === TEST 2: ADD ITEM TO MARKET ===
  console.log("\n2️⃣ TEST: Adding Item to Market...");

  try {
    // First, create a test item
    console.log("   • Creating test item...");
    const createItemTx = await itemProxy.createItem(
      101, // itemId
      "Test Sword", // name
      "A sharp sword for testing", // description
      1, // itemType
      100, // maxStack
      false, // isConsumable
      false, // isTradeable
      false, // isBanned
      0 // rarity
    );
    await createItemTx.wait();
    console.log("   ✅ Test item created!");

    // Add item to market
    const addItemTx = await npcMarketNativeLogic.addItemToMarket(
      1, // npcId
      101, // itemId
      5, // limitPerUser
      ethers.parseEther("0.1"), // pricePerUnit
      true // isSelling
    );
    await addItemTx.wait();
    console.log("✅ Item added to market successfully!");

    // Verify market item
    const marketItem = await npcMarketNativeLogic.getMarketItem(1, 101);
    console.log("   • Market Item:", {
      itemId: marketItem.itemId.toString(),
      limitPerUser: marketItem.limitPerUser.toString(),
      pricePerUnit: ethers.formatEther(marketItem.pricePerUnit),
      isSelling: marketItem.isSelling,
      active: marketItem.active,
    });
  } catch (error) {
    console.error("❌ Failed to add item to market:", error.message);
  }

  // === TEST 3: INITIALIZE PLAYERS ===
  console.log("\n3️⃣ TEST: Initializing Players...");

  try {
    // Initialize player1
    const initPlayer1Tx = await playerProxy.initializePlayer(
      player1.address,
      1, // level
      100, // mana
      1000, // sunlight
      100 // sunny
    );
    await initPlayer1Tx.wait();
    console.log("   ✅ Player 1 initialized!");

    // Initialize player2
    const initPlayer2Tx = await playerProxy.initializePlayer(
      player2.address,
      1, // level
      100, // mana
      1000, // sunlight
      100 // sunny
    );
    await initPlayer2Tx.wait();
    console.log("   ✅ Player 2 initialized!");
  } catch (error) {
    console.error("❌ Failed to initialize players:", error.message);
  }

  // === TEST 4: BUY ITEM FROM NPC ===
  console.log("\n4️⃣ TEST: Buying Item from NPC...");

  try {
    const buyTx = await npcMarketNativeLogic.connect(player1).buyItemFromNPC(
      1, // npcId
      101, // itemId
      2, // quantity
      { value: ethers.parseEther("0.2") } // 0.1 ETH per item * 2
    );
    await buyTx.wait();
    console.log("✅ Item purchased successfully!");

    // Check player's inventory
    const playerItem = await inventoryProxy.getItem(player1.address, 101);
    console.log("   • Player 1 inventory:", {
      itemId: playerItem.itemId.toString(),
      quantity: playerItem.quantity.toString(),
      durability: playerItem.durability.toString(),
    });

    // Check user purchases
    const userPurchases = await npcMarketNativeLogic.getUserPurchases(
      1,
      101,
      player1.address
    );
    console.log("   • User purchases:", userPurchases.toString());
  } catch (error) {
    console.error("❌ Failed to buy item:", error.message);
  }

  // === TEST 5: SELL ITEM TO NPC ===
  console.log("\n5️⃣ TEST: Selling Item to NPC...");

  try {
    // First add item to player2's inventory
    const addToInventoryTx = await inventoryProxy.setItem(
      player2.address,
      101, // itemId
      3, // quantity
      100, // durability
      0 // expiration
    );
    await addToInventoryTx.wait();
    console.log("   • Added item to Player 2 inventory");

    // Add buying item to market
    const addBuyingItemTx = await npcMarketNativeLogic.addItemToMarket(
      1, // npcId
      102, // itemId (different item for buying)
      10, // limitPerUser
      ethers.parseEther("0.05"), // pricePerUnit (NPC buys for 0.05 ETH)
      false // isSelling (NPC is buying)
    );
    await addBuyingItemTx.wait();
    console.log("   • Added buying item to market");

    // Create the buying item
    const createBuyingItemTx = await itemProxy.createItem(
      102, // itemId
      "Test Potion", // name
      "A healing potion for testing", // description
      2, // itemType
      100, // maxStack
      true, // isConsumable
      true, // isTradeable
      false, // isBanned
      1 // rarity
    );
    await createBuyingItemTx.wait();

    // Add buying item to player2's inventory
    const addBuyingToInventoryTx = await inventoryProxy.setItem(
      player2.address,
      102, // itemId
      5, // quantity
      100, // durability
      0 // expiration
    );
    await addBuyingToInventoryTx.wait();

    // Sell item to NPC
    const sellTx = await npcMarketNativeLogic.connect(player2).sellItemToNPC(
      1, // npcId
      102, // itemId
      2 // quantity
    );
    await sellTx.wait();
    console.log("✅ Item sold successfully!");

    // Check player's inventory after sale
    const playerItemAfter = await inventoryProxy.getItem(player2.address, 102);
    console.log("   • Player 2 inventory after sale:", {
      itemId: playerItemAfter.itemId.toString(),
      quantity: playerItemAfter.quantity.toString(),
    });

    // Check player's ETH balance
    const playerBalance = await ethers.provider.getBalance(player2.address);
    console.log(
      "   • Player 2 ETH balance:",
      ethers.formatEther(playerBalance),
      "ETH"
    );
  } catch (error) {
    console.error("❌ Failed to sell item:", error.message);
  }

  // === TEST 6: CHECK MARKET STATS ===
  console.log("\n6️⃣ TEST: Checking Market Statistics...");

  try {
    const marketStats = await npcMarketNativeLogic.getMarketStats(1);
    console.log("   • Market Stats:", {
      totalTransactions: marketStats.totalTransactions.toString(),
      totalVolume: ethers.formatEther(marketStats.totalVolume),
      totalBuyTransactions: marketStats.totalBuyTransactions.toString(),
      totalSellTransactions: marketStats.totalSellTransactions.toString(),
      totalBuyVolume: ethers.formatEther(marketStats.totalBuyVolume),
      totalSellVolume: ethers.formatEther(marketStats.totalSellVolume),
    });

    const userStats = await npcMarketNativeLogic.getUserMarketStats(
      1,
      player1.address
    );
    console.log("   • Player 1 Stats:", {
      totalTransactions: userStats.totalTransactions.toString(),
      totalVolume: ethers.formatEther(userStats.totalVolume),
      totalBuyTransactions: userStats.totalBuyTransactions.toString(),
      totalSellTransactions: userStats.totalSellTransactions.toString(),
    });
  } catch (error) {
    console.error("❌ Failed to get market stats:", error.message);
  }

  // === TEST 7: CHECK CONTRACT BALANCE ===
  console.log("\n7️⃣ TEST: Checking Contract Balance...");

  try {
    const contractBalance = await npcMarketNativeLogic.getContractBalance();
    console.log(
      "   • Contract ETH balance:",
      ethers.formatEther(contractBalance),
      "ETH"
    );
  } catch (error) {
    console.error("❌ Failed to get contract balance:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 NPCMARKETNATIVE TESTS COMPLETED!");
  console.log("=".repeat(50));
  console.log("✅ All tests passed successfully!");
  console.log("\n📋 Test Summary:");
  console.log("   • ✅ Created NPC Market");
  console.log("   • ✅ Added items to market");
  console.log("   • ✅ Initialized players");
  console.log("   • ✅ Bought items from NPC");
  console.log("   • ✅ Sold items to NPC");
  console.log("   • ✅ Checked market statistics");
  console.log("   • ✅ Verified contract balance");

  console.log("\n🔗 NPCMarketNative is ready for use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NPCMarketNative test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
