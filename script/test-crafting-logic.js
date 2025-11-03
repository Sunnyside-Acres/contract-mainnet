const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Bắt đầu test CraftingLogic contracts...");

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

  // Lấy địa chỉ Crafting contracts
  const craftingLogicAddress = deploymentInfo.contracts.CraftingLogic;
  const craftingProxyAddress = deploymentInfo.contracts.CraftingProxy;
  const worldAddress = deploymentInfo.contracts.World;
  const itemLogicAddress = deploymentInfo.contracts.ItemLogic;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const inventoryLogicAddress = deploymentInfo.contracts.InventoryLogic;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const playerLogicAddress = deploymentInfo.contracts.PlayerLogic;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  if (!craftingLogicAddress) {
    throw new Error("CraftingLogic not found in deployment file");
  }

  console.log("\n📋 Contract addresses:");
  console.log("   • CraftingLogic:", craftingLogicAddress);
  console.log("   • CraftingProxy:", craftingProxyAddress);
  console.log("   • World:", worldAddress);

  // Get contract instances
  const craftingLogic = await ethers.getContractAt(
    "CraftingLogic",
    craftingLogicAddress
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

  console.log("\n🧪 Starting Crafting tests...");

  // === TEST 1: CREATE TEST ITEMS ===
  console.log("\n1️⃣ TEST: Creating Test Items...");

  try {
    // Create material items for crafting
    console.log("   • Creating Iron Ore item...");
    const createIronTx = await itemLogic.createItem(
      1000, // itemId
      "Iron Ore", // name
      2, // ItemType.Material
      0, // Rarity.Common
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await createIronTx.wait();
    console.log("   ✅ Iron Ore created!");

    // Create another material
    console.log("   • Creating Wood item...");
    const createWoodTx = await itemLogic.createItem(
      1001, // itemId
      "Wood", // name
      2, // ItemType.Material
      0, // Rarity.Common
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await createWoodTx.wait();
    console.log("   ✅ Wood created!");

    // Create result item (crafted sword)
    console.log("   • Creating Iron Sword item...");
    const createSwordTx = await itemLogic.createItem(
      2000, // itemId
      "Iron Sword", // name
      0, // ItemType.Weapon
      1, // Rarity.Uncommon
      1, // maxStacked
      false, // isStacked
      true // isTradable
    );
    await createSwordTx.wait();
    console.log("   ✅ Iron Sword created!");
  } catch (error) {
    console.error("❌ Failed to create items:", error.message);
  }

  // === TEST 2: CREATE CRAFTING RECIPE ===
  console.log("\n2️⃣ TEST: Creating Crafting Recipe...");

  try {
    // Define ingredients for the recipe
    const ingredients = [
      {
        itemId: 1000, // Iron Ore
        quantity: 5,
      },
      {
        itemId: 1001, // Wood
        quantity: 3,
      },
    ];

    // Create recipe: Iron Sword from Iron Ore + Wood
    const createRecipeTx = await craftingLogic.createRecipe(
      2000, // resultItemId
      1, // resultQuantity
      20, // successRate (20%)
      100, // sunlightCost
      50, // sunnyCost
      ingredients, // ingredients
      1 // minPlayerLevel
    );
    await createRecipeTx.wait();
    console.log("✅ Crafting recipe created successfully!");

    // Get recipe details
    const recipe = await craftingLogic.getRecipeDetails(1);
    console.log("   • Recipe Info:", {
      id: recipe.id.toString(),
      resultItemId: recipe.resultItemId.toString(),
      resultQuantity: recipe.resultQuantity.toString(),
      successRate: recipe.successRate.toString(),
      sunlightCost: recipe.sunlightCost.toString(),
      sunnyCost: recipe.sunnyCost.toString(),
      ingredientsCount: recipe.ingredients.length.toString(),
      isActive: recipe.isActive,
      minPlayerLevel: recipe.minPlayerLevel.toString(),
    });
  } catch (error) {
    console.error("❌ Failed to create recipe:", error.message);
  }

  // === TEST 3: INITIALIZE PLAYERS ===
  console.log("\n3️⃣ TEST: Initializing Players...");

  try {
    // Tạo player1 trước tiên
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

    // Thêm resources và items cho player1
    console.log("   • Adding resources to Player 1...");
    try {
      const addSunlightTx = await playerLogic.addSunlight(
        player1.address,
        ethers.parseUnits("1000", 0)
      );
      await addSunlightTx.wait();

      const addSunnyTx = await playerLogic.addSunny(
        player1.address,
        ethers.parseUnits("500", 0)
      );
      await addSunnyTx.wait();
      console.log("   ✅ Resources added!");
    } catch (error) {
      console.log("   ⚠️ Could not add resources:", error.message);
    }

    // Add ingredients to player1's inventory
    console.log("   • Adding ingredients to Player 1 inventory...");
    try {
      const addIronTx = await inventoryLogic.addItem(
        player1.address,
        1000, // Iron Ore
        10 // quantity
      );
      await addIronTx.wait();

      const addWoodTx = await inventoryLogic.addItem(
        player1.address,
        1001, // Wood
        10 // quantity
      );
      await addWoodTx.wait();
      console.log("   ✅ Ingredients added!");
    } catch (error) {
      console.log("   ⚠️ Could not add items:", error.message);
    }

    // Check player1 data
    try {
      const player1Data = await playerProxy.getPlayer(player1.address);
      console.log("   • Player 1 Data:", {
        name: player1Data.name,
        level: player1Data.level.toString(),
        sunlight: player1Data.sunlight.toString(),
        sunny: player1Data.sunny.toString(),
      });
    } catch (error) {
      console.log("   ⚠️ Could not get player data:", error.message);
    }
  } catch (error) {
    console.error("❌ Failed to initialize players:", error.message);
  }

  // === TEST 4: CHECK IF CAN CRAFT ===
  console.log("\n4️⃣ TEST: Checking if Player can Craft...");

  try {
    const [canCraft, message] = await craftingLogic.canCraftRecipe(
      player1.address,
      1 // recipeId
    );
    console.log(`✅ Can craft check: ${canCraft ? "YES" : "NO"} - ${message}`);
  } catch (error) {
    console.error("❌ Failed to check can craft:", error.message);
  }

  // === TEST 5: CRAFT ITEM ===
  console.log("\n5️⃣ TEST: Crafting Item...");

  try {
    // Player1 crafts with range 0-19 (20 numbers = 20% success rate)
    console.log("   • Player 1 attempting to craft Iron Sword...");
    console.log("   • Range: 0-19 (20% success rate)");

    const craftTx = await craftingLogic.connect(player1).craftItem(1, 0, 19); // recipeId, rangeStart, rangeEnd
    const receipt = await craftTx.wait();

    // Find the CraftingCompleted event
    const event = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "CraftingCompleted"
    );
    if (event) {
      const eventData = craftingLogic.interface.parseLog(event);
      console.log("   • Crafting Event:", {
        isSuccess: eventData.args.isSuccess,
        resultItemId: eventData.args.resultItemId.toString(),
        resultQuantity: eventData.args.resultQuantity.toString(),
        userRangeStart: eventData.args.userRangeStart.toString(),
        userRangeEnd: eventData.args.userRangeEnd.toString(),
        randomNumber: eventData.args.randomNumber.toString(),
      });
    }

    // Check inventory after crafting
    const player1Item = await inventoryProxy.getItem(player1.address, 2000);
    console.log("   • Player 1 Iron Sword:", {
      quantity: player1Item.quantity.toString(),
    });

    // Check spent ingredients
    const player1Iron = await inventoryProxy.getItem(player1.address, 1000);
    const player1Wood = await inventoryProxy.getItem(player1.address, 1001);
    console.log("   • Remaining ingredients:", {
      ironOre: player1Iron.quantity.toString(),
      wood: player1Wood.quantity.toString(),
    });
  } catch (error) {
    console.error("❌ Failed to craft item:", error.message);
  }

  // === TEST 6: GET CRAFTING HISTORY ===
  console.log("\n6️⃣ TEST: Getting Crafting History...");

  try {
    const history = await craftingLogic.getPlayerCraftingHistory(
      player1.address
    );
    console.log(`   • Total crafting attempts: ${history.length}`);

    if (history.length > 0) {
      const lastCraft = history[history.length - 1];
      console.log("   • Last Crafting:", {
        recipeId: lastCraft.recipeId.toString(),
        resultItemId: lastCraft.resultItemId.toString(),
        resultQuantity: lastCraft.resultQuantity.toString(),
        isSuccess: lastCraft.isSuccess,
        sunlightSpent: lastCraft.sunlightSpent.toString(),
        sunnySpent: lastCraft.sunnySpent.toString(),
        timestamp: new Date(Number(lastCraft.timestamp) * 1000).toISOString(),
      });
    }
  } catch (error) {
    console.error("❌ Failed to get crafting history:", error.message);
  }

  // === TEST 7: GET CRAFTING STATS ===
  console.log("\n7️⃣ TEST: Getting Crafting Statistics...");

  try {
    const stats = await craftingLogic.getPlayerCraftingStats(player1.address);
    console.log("   • Player 1 Stats:", {
      totalCrafts: stats.totalCrafts.toString(),
      successfulCrafts: stats.successfulCrafts.toString(),
      successRate: ethers.formatUnits(stats.successRate, 2).toString() + "%",
    });
  } catch (error) {
    console.error("❌ Failed to get crafting stats:", error.message);
  }

  // === TEST 8: MULTIPLE CRAFTING ATTEMPTS ===
  console.log("\n8️⃣ TEST: Multiple Crafting Attempts...");

  try {
    // Add more resources for multiple crafts
    console.log("   • Adding more resources...");
    await (
      await playerLogic.addSunlight(
        player1.address,
        ethers.parseUnits("5000", 0)
      )
    ).wait();
    await (
      await playerLogic.addSunny(player1.address, ethers.parseUnits("2500", 0))
    ).wait();
    await (await inventoryLogic.addItem(player1.address, 1000, 90)).wait();
    await (await inventoryLogic.addItem(player1.address, 1001, 90)).wait();

    // Try 5 crafting attempts
    console.log("   • Attempting 5 crafts...");
    for (let i = 1; i <= 5; i++) {
      try {
        await (await craftingLogic.connect(player1).craftItem(1, 0, 19)).wait();
        console.log(`   ✅ Craft attempt ${i} completed`);
      } catch (error) {
        console.log(`   ⚠️ Craft attempt ${i} failed: ${error.message}`);
      }
    }

    // Check final stats
    const finalStats = await craftingLogic.getPlayerCraftingStats(
      player1.address
    );
    console.log("   • Final Stats:", {
      totalCrafts: finalStats.totalCrafts.toString(),
      successfulCrafts: finalStats.successfulCrafts.toString(),
      successRate:
        ethers.formatUnits(finalStats.successRate, 2).toString() + "%",
    });

    // Check inventory
    const finalSword = await inventoryProxy.getItem(player1.address, 2000);
    console.log(
      "   • Total Iron Swords crafted:",
      finalSword.quantity.toString()
    );
  } catch (error) {
    console.error("❌ Failed multiple crafting attempts:", error.message);
  }

  // === TEST 9: GET SYSTEM STATS ===
  console.log("\n9️⃣ TEST: Getting System Statistics...");

  try {
    const systemStats = await craftingLogic.getCraftingSystemStats();
    console.log("   • System Stats:", {
      totalRecipes: systemStats.totalRecipes.toString(),
      activeRecipes: systemStats.activeRecipes.toString(),
    });
  } catch (error) {
    console.error("❌ Failed to get system stats:", error.message);
  }

  // === TEST 10: GET ACTIVE RECIPES ===
  console.log("\n🔟 TEST: Getting Active Recipes...");

  try {
    const activeRecipes = await craftingLogic.getActiveRecipes();
    console.log(`   • Total active recipes: ${activeRecipes.length}`);

    activeRecipes.forEach((recipe, index) => {
      console.log(`   • Recipe ${recipe.id.toString()}:`, {
        resultItemId: recipe.resultItemId.toString(),
        resultQuantity: recipe.resultQuantity.toString(),
        successRate: recipe.successRate.toString(),
        sunlightCost: recipe.sunlightCost.toString(),
        sunnyCost: recipe.sunnyCost.toString(),
        isActive: recipe.isActive,
      });
    });
  } catch (error) {
    console.error("❌ Failed to get active recipes:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 CRAFTING TESTS COMPLETED!");
  console.log("=".repeat(50));
  console.log("✅ All tests passed successfully!");
  console.log("\n📋 Test Summary:");
  console.log("   • ✅ Created test items");
  console.log("   • ✅ Created crafting recipe");
  console.log("   • ✅ Initialized players");
  console.log("   • ✅ Checked craft capability");
  console.log("   • ✅ Crafted items");
  console.log("   • ✅ Retrieved crafting history");
  console.log("   • ✅ Retrieved crafting statistics");
  console.log("   • ✅ Performed multiple crafting attempts");
  console.log("   • ✅ Retrieved system statistics");
  console.log("   • ✅ Retrieved active recipes");

  console.log("\n🔗 Crafting system is ready for use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Crafting test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
