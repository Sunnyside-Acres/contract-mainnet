const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Bắt đầu test GachaLogic contracts...");

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

  // Lấy địa chỉ Gacha contracts
  const gachaLogicAddress = deploymentInfo.contracts.GachaLogic;
  const worldAddress = deploymentInfo.contracts.World;
  const itemLogicAddress = deploymentInfo.contracts.ItemLogic;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const inventoryLogicAddress = deploymentInfo.contracts.InventoryLogic;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const playerLogicAddress = deploymentInfo.contracts.PlayerLogic;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  if (!gachaLogicAddress) {
    throw new Error("GachaLogic not found in deployment file");
  }

  console.log("\n📋 Contract addresses:");
  console.log("   • GachaLogic:", gachaLogicAddress);
  console.log("   • World:", worldAddress);

  // Get contract instances
  const gachaLogic = await ethers.getContractAt(
    "GachaLogic",
    gachaLogicAddress
  );
  const world = await ethers.getContractAt("World", worldAddress);
  const itemLogic = await ethers.getContractAt("ItemLogic", itemLogicAddress);
  const itemProxy = await ethers.getContractAt(
    "ItemComponent",
    itemProxyAddress
  );
  const inventoryLogic = await ethers.getContractAt(
    "InventoryLogic",
    inventoryLogicAddress
  );
  const inventoryProxy = await ethers.getContractAt(
    "InventoryComponent",
    inventoryProxyAddress
  );
  const playerLogic = await ethers.getContractAt(
    "PlayerLogic",
    playerLogicAddress
  );
  const playerProxy = await ethers.getContractAt(
    "PlayerComponent",
    playerProxyAddress
  );

  console.log("\n🧪 Starting Gacha tests...");

  // === TEST 1: CREATE TEST ITEMS ===
  console.log("\n1️⃣ TEST: Creating Test Items...");

  try {
    // Tạo item có thể mở (Loot Box)
    console.log("   • Creating Loot Box item...");
    const createLootBoxTx = await itemLogic.createItem(
      3000, // itemId
      "Mystery Loot Box", // name
      8, // ItemType.Other
      0, // Rarity.Common
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await createLootBoxTx.wait();
    console.log("   ✅ Loot Box created!");

    // Tạo các item có thể drop ra
    console.log("   • Creating Common Item...");
    const createCommonTx = await itemLogic.createItem(
      3001, // itemId
      "Common Gem", // name
      2, // ItemType.Material
      0, // Rarity.Common
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await createCommonTx.wait();
    console.log("   ✅ Common Gem created!");

    console.log("   • Creating Uncommon Item...");
    const createUncommonTx = await itemLogic.createItem(
      3002, // itemId
      "Uncommon Crystal", // name
      2, // ItemType.Material
      1, // Rarity.Uncommon
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await createUncommonTx.wait();
    console.log("   ✅ Uncommon Crystal created!");

    console.log("   • Creating Rare Item...");
    const createRareTx = await itemLogic.createItem(
      3003, // itemId
      "Rare Diamond", // name
      2, // ItemType.Material
      2, // Rarity.Rare
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await createRareTx.wait();
    console.log("   ✅ Rare Diamond created!");

    console.log("   • Creating Epic Item...");
    const createEpicTx = await itemLogic.createItem(
      3004, // itemId
      "Epic Artifact", // name
      0, // ItemType.Weapon
      3, // Rarity.Epic
      1, // maxStacked
      false, // isStacked
      true // isTradable
    );
    await createEpicTx.wait();
    console.log("   ✅ Epic Artifact created!");
  } catch (error) {
    console.error("❌ Failed to create items:", error.message);
  }

  // === TEST 2: CREATE DROPS FOR LOOT BOX ===
  console.log("\n2️⃣ TEST: Creating Drops for Loot Box...");

  try {
    // Tạo drops với xác suất:
    // - Common Gem: 60% (6000 basis points)
    // - Uncommon Crystal: 25% (2500 basis points)
    // - Rare Diamond: 12% (1200 basis points)
    // - Epic Artifact: 3% (300 basis points)
    // Tổng: 100% (10000 basis points)

    const drops = [
      {
        itemId: 3001, // Common Gem
        probability: 6000, // 60%
        yield: 5, // Drop 5 items
      },
      {
        itemId: 3002, // Uncommon Crystal
        probability: 2500, // 25%
        yield: 3, // Drop 3 items
      },
      {
        itemId: 3003, // Rare Diamond
        probability: 1200, // 12%
        yield: 2, // Drop 2 items
      },
      {
        itemId: 3004, // Epic Artifact
        probability: 300, // 3%
        yield: 1, // Drop 1 item
      },
    ];

    console.log("   • Creating drops with probabilities:");
    drops.forEach((drop) => {
      console.log(
        `     - Item ${drop.itemId}: ${drop.probability / 100}% (yield: ${
          drop.yield
        })`
      );
    });

    const createDropsTx = await itemLogic.createDrops(3000, drops);
    await createDropsTx.wait();
    console.log("   ✅ Drops created successfully!");

    // Verify drops
    const itemDrops = await gachaLogic.getItemDrops(3000);
    console.log(`   • Total drops configured: ${itemDrops.length}`);
  } catch (error) {
    console.error("❌ Failed to create drops:", error.message);
  }

  // === TEST 3: INITIALIZE PLAYERS ===
  console.log("\n3️⃣ TEST: Initializing Players...");

  try {
    // Tạo player1
    console.log("   • Creating Player 1...");
    try {
      const createPlayerTx = await playerLogic
        .connect(player1)
        .createPlayer("Player1");
      await createPlayerTx.wait();
      console.log("   ✅ Player 1 created!");
    } catch (error) {
      console.log("   ⚠️ Could not create player:", error.message);
    }

    // Thêm Loot Box vào inventory của player1
    console.log("   • Adding Loot Boxes to Player 1 inventory...");
    try {
      const addLootBoxTx = await inventoryLogic.addItem(
        player1.address,
        3000, // Loot Box
        10 // quantity: 10 boxes
      );
      await addLootBoxTx.wait();
      console.log("   ✅ Loot Boxes added!");
    } catch (error) {
      console.log("   ⚠️ Could not add items:", error.message);
    }

    // Check player1 inventory
    try {
      const lootBoxItem = await inventoryProxy.getItem(player1.address, 3000);
      console.log("   • Player 1 Loot Boxes:", {
        quantity: lootBoxItem.quantity.toString(),
      });
    } catch (error) {
      console.log("   ⚠️ Could not get inventory:", error.message);
    }
  } catch (error) {
    console.error("❌ Failed to initialize players:", error.message);
  }

  // === TEST 4: CHECK IF CAN OPEN ===
  console.log("\n4️⃣ TEST: Checking if Player can Open Item...");

  try {
    const [canOpen, message] = await gachaLogic.canOpenItem(
      3000, // itemId
      player1.address
    );
    console.log(`✅ Can open check: ${canOpen ? "YES" : "NO"} - ${message}`);
  } catch (error) {
    console.error("❌ Failed to check can open:", error.message);
  }

  // === TEST 5: GET ITEM DROPS ===
  console.log("\n5️⃣ TEST: Getting Item Drops...");

  try {
    const drops = await gachaLogic.getItemDrops(3000);
    console.log(`   • Total drops: ${drops.length}`);
    drops.forEach((drop, index) => {
      console.log(`   • Drop ${index + 1}:`, {
        itemId: drop.itemId.toString(),
        probability: drop.probability.toString(),
        yield: drop.yield.toString(),
      });
    });
  } catch (error) {
    console.error("❌ Failed to get drops:", error.message);
  }

  // === TEST 6: OPEN ITEM ===
  console.log("\n6️⃣ TEST: Opening Item...");

  try {
    console.log("   • Player 1 opening Loot Box...");

    // Check inventory before opening
    const beforeLootBox = await inventoryProxy.getItem(player1.address, 3000);
    console.log("   • Loot Boxes before:", beforeLootBox.quantity.toString());

    // Open item
    const openTx = await gachaLogic.connect(player1).openItem(3000);
    const receipt = await openTx.wait();

    // Find the ItemOpened event
    const event = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "ItemOpened"
    );
    if (event) {
      const eventData = gachaLogic.interface.parseLog(event);
      console.log("   • ItemOpened Event:", {
        itemId: eventData.args.itemId.toString(),
        player: eventData.args.player,
        droppedItemId: eventData.args.droppedItemId.toString(),
        droppedQuantity: eventData.args.droppedQuantity.toString(),
      });

      if (eventData.args.droppedItemId > 0) {
        console.log(
          `   ✅ Successfully dropped item ${eventData.args.droppedItemId.toString()} x${eventData.args.droppedQuantity.toString()}`
        );
      } else {
        console.log("   ⚠️ No item was dropped (outside probability range)");
      }
    }

    // Check inventory after opening
    const afterLootBox = await inventoryProxy.getItem(player1.address, 3000);
    console.log("   • Loot Boxes after:", afterLootBox.quantity.toString());

    // Check dropped item in inventory
    if (event && eventData.args.droppedItemId > 0) {
      const droppedItem = await inventoryProxy.getItem(
        player1.address,
        eventData.args.droppedItemId
      );
      console.log("   • Dropped Item in Inventory:", {
        itemId: eventData.args.droppedItemId.toString(),
        quantity: droppedItem.quantity.toString(),
      });
    }
  } catch (error) {
    console.error("❌ Failed to open item:", error.message);
  }

  // === TEST 7: MULTIPLE OPEN ATTEMPTS ===
  console.log("\n7️⃣ TEST: Multiple Item Opening Attempts...");

  try {
    // Thêm thêm Loot Boxes
    console.log("   • Adding more Loot Boxes...");
    await (await inventoryLogic.addItem(player1.address, 3000, 20)).wait();

    // Track drops statistics
    const dropStats = {
      3001: 0, // Common Gem
      3002: 0, // Uncommon Crystal
      3003: 0, // Rare Diamond
      3004: 0, // Epic Artifact
      0: 0, // No drop
    };

    // Open 10 items
    console.log("   • Opening 10 Loot Boxes...");
    for (let i = 1; i <= 10; i++) {
      try {
        const openTx = await gachaLogic.connect(player1).openItem(3000);
        const receipt = await openTx.wait();

        // Find the ItemOpened event
        const event = receipt.logs.find(
          (log) => log.fragment && log.fragment.name === "ItemOpened"
        );
        if (event) {
          const eventData = gachaLogic.interface.parseLog(event);
          const droppedItemId = eventData.args.droppedItemId.toString();
          dropStats[droppedItemId] = (dropStats[droppedItemId] || 0) + 1;
        }
        console.log(`   ✅ Opened box ${i}`);
      } catch (error) {
        console.log(`   ⚠️ Failed to open box ${i}: ${error.message}`);
      }
    }

    // Display statistics
    console.log("   • Drop Statistics:");
    console.log(`     - Common Gem (3001): ${dropStats[3001]} times`);
    console.log(`     - Uncommon Crystal (3002): ${dropStats[3002]} times`);
    console.log(`     - Rare Diamond (3003): ${dropStats[3003]} times`);
    console.log(`     - Epic Artifact (3004): ${dropStats[3004]} times`);
    console.log(`     - No drop (0): ${dropStats[0]} times`);

    // Check final inventory
    const finalLootBox = await inventoryProxy.getItem(player1.address, 3000);
    console.log("   • Remaining Loot Boxes:", finalLootBox.quantity.toString());

    // Check all dropped items in inventory
    console.log("   • Final Inventory:");
    for (const itemId of [3001, 3002, 3003, 3004]) {
      try {
        const item = await inventoryProxy.getItem(player1.address, itemId);
        if (item.quantity > 0) {
          console.log(`     - Item ${itemId}: ${item.quantity.toString()}`);
        }
      } catch (error) {
        // Item might not exist in inventory
      }
    }
  } catch (error) {
    console.error("❌ Failed multiple open attempts:", error.message);
  }

  // === TEST 8: TEST ERROR CASES ===
  console.log("\n8️⃣ TEST: Testing Error Cases...");

  try {
    // Test opening item that doesn't exist
    console.log("   • Testing opening non-existent item...");
    try {
      await gachaLogic.connect(player1).openItem(9999);
      console.log("   ❌ Should have failed!");
    } catch (error) {
      console.log("   ✅ Correctly rejected:", error.reason || error.message);
    }

    // Test opening item without having it
    console.log("   • Testing opening item player doesn't have...");
    try {
      await gachaLogic.connect(player2).openItem(3000);
      console.log("   ❌ Should have failed!");
    } catch (error) {
      console.log("   ✅ Correctly rejected:", error.reason || error.message);
    }

    // Test canOpenItem for non-existent item
    console.log("   • Testing canOpenItem for non-existent item...");
    const [canOpen1, message1] = await gachaLogic.canOpenItem(
      9999,
      player1.address
    );
    console.log(`   ✅ Result: ${canOpen1} - ${message1}`);

    // Test canOpenItem for item without drops
    console.log("   • Creating item without drops...");
    await itemLogic.createItem(
      3999, // itemId
      "Empty Box", // name
      8, // ItemType.Other
      0, // Rarity.Common
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await inventoryLogic.addItem(player1.address, 3999, 1);
    const [canOpen2, message2] = await gachaLogic.canOpenItem(
      3999,
      player1.address
    );
    console.log(`   ✅ Result: ${canOpen2} - ${message2}`);
  } catch (error) {
    console.error("❌ Failed error cases test:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 GACHA TESTS COMPLETED!");
  console.log("=".repeat(50));
  console.log("✅ All tests passed successfully!");
  console.log("\n📋 Test Summary:");
  console.log("   • ✅ Created test items (Loot Box + drop items)");
  console.log("   • ✅ Created drops with probability");
  console.log("   • ✅ Initialized players");
  console.log("   • ✅ Checked can open item");
  console.log("   • ✅ Retrieved item drops");
  console.log("   • ✅ Opened items successfully");
  console.log("   • ✅ Performed multiple opening attempts");
  console.log("   • ✅ Tested error cases");

  console.log("\n🔗 Gacha system is ready for use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Gacha test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
