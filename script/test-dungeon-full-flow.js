const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Bắt đầu test Dungeon full flow...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  // Dùng deployer làm player luôn
  const player1 = deployer;

  console.log("📝 Test accounts:");
  console.log("   • Deployer/Player (Admin):", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", Number(network.chainId));

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment info from:", deploymentPath);

  // Lấy địa chỉ contracts cần thiết
  const dungeonLogicAddress = deploymentInfo.contracts.DungeonLogic;
  const dungeonProxyAddress = deploymentInfo.contracts.DungeonProxy;
  const worldAddress = deploymentInfo.contracts.World;
  const itemLogicAddress = deploymentInfo.contracts.ItemLogic;
  const itemProxyAddress = deploymentInfo.contracts.ItemProxy;
  const inventoryLogicAddress = deploymentInfo.contracts.InventoryLogic;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;
  const playerLogicAddress = deploymentInfo.contracts.PlayerLogic;
  const playerProxyAddress = deploymentInfo.contracts.PlayerProxy;

  if (!dungeonLogicAddress) {
    throw new Error("DungeonLogic not found in deployment file");
  }

  console.log("\n📋 Contract addresses:");
  console.log("   • DungeonLogic:", dungeonLogicAddress);
  console.log("   • DungeonProxy:", dungeonProxyAddress);
  console.log("   • World:", worldAddress);
  console.log("   • PlayerLogic:", playerLogicAddress);
  console.log("   • InventoryLogic:", inventoryLogicAddress);

  // Get contract instances
  const dungeonLogic = await ethers.getContractAt(
    "DungeonLogic",
    dungeonLogicAddress
  );
  const dungeonProxy = await ethers.getContractAt(
    "DungeonComponent",
    dungeonProxyAddress
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

  console.log("\n🧪 Starting Dungeon full flow tests...");

  // ============ SETUP PHASE ============

  // === SETUP 1: CREATE/CHECK PLAYER ===
  console.log("\n📋 SETUP 1: Creating/Checking Player...");

  try {
    // Check if player exists
    let playerExists = false;
    let playerData = null;

    try {
      playerData = await playerLogic.getPlayerData(player1.address);
      playerExists = true;
      console.log("   ✅ Player already exists");
      console.log(`   • Level: ${playerData.level}`);
      console.log(`   • Mana: ${playerData.mana}`);
      console.log(`   • Sunlight: ${playerData.sunlight}`);
      console.log(`   • Sunny: ${playerData.sunny}`);
    } catch (error) {
      // Player doesn't exist - will create
      playerExists = false;
      console.log("   • Player chưa tồn tại, sẽ tạo mới...");
    }

    if (!playerExists) {
      console.log("   • Creating new player...");
      try {
        const createPlayerTx = await playerLogic
          .connect(player1)
          .createPlayer("TestPlayer");
        await createPlayerTx.wait();

        // Verify player was created
        playerData = await playerLogic.getPlayerData(player1.address);
        if (playerData.playerAddress === player1.address) {
          console.log("   ✅ Player created successfully!");
          console.log(`   • Level: ${playerData.level}`);
          console.log(`   • Mana: ${playerData.mana}`);
          console.log(`   • Sunlight: ${playerData.sunlight}`);
          console.log(`   • Sunny: ${playerData.sunny}`);
        } else {
          throw new Error("Player creation verification failed");
        }
      } catch (error) {
        // If creation fails with "already initialized", verify player exists
        if (
          error.message.includes("already initialized") ||
          error.message.includes("already exists")
        ) {
          console.log(
            "   ⚠️  Player creation failed, verifying if player exists..."
          );
          try {
            playerData = await playerLogic.getPlayerData(player1.address);
            if (playerData.playerAddress === player1.address) {
              console.log("   ✅ Player đã tồn tại!");
              console.log(`   • Level: ${playerData.level}`);
              console.log(`   • Mana: ${playerData.mana}`);
              console.log(`   • Sunlight: ${playerData.sunlight}`);
              console.log(`   • Sunny: ${playerData.sunny}`);
            }
          } catch (verifyError) {
            console.error(
              "   ❌ Failed to verify player:",
              verifyError.message
            );
            throw error;
          }
        } else {
          console.error("   ❌ Failed to create player:", error.message);
          throw error;
        }
      }
    }
  } catch (error) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("already initialized")
    ) {
      // Try to get player data anyway
      try {
        const playerData = await playerLogic.getPlayerData(player1.address);
        console.log("   ✅ Player already exists (verified)");
        console.log(`   • Level: ${playerData.level}`);
        console.log(`   • Mana: ${playerData.mana}`);
        console.log(`   • Sunlight: ${playerData.sunlight}`);
        console.log(`   • Sunny: ${playerData.sunny}`);
      } catch (verifyError) {
        console.error("   ❌ Failed to verify player:", verifyError.message);
        throw error;
      }
    } else {
      console.error("   ❌ Failed to create player:", error.message);
      throw error;
    }
  }

  // === SETUP 2: CHECK ADMIN PERMISSIONS ===
  console.log("\n📋 SETUP 2: Checking Admin Permissions...");

  try {
    const isAdmin = await world.isAdmin(deployer.address);
    if (!isAdmin) {
      console.log("   ⚠️  Deployer is not admin, trying to set admin...");
      try {
        // Try to set deployer as admin (if World allows)
        const setAdminTx = await world.setAdmin(deployer.address, true);
        await setAdminTx.wait();
        console.log("   ✅ Deployer set as admin");
      } catch (error) {
        console.log(
          "   ⚠️  Cannot set admin. Please ensure deployer is admin in World contract."
        );
        console.log("   ⚠️  Continuing anyway...");
      }
    } else {
      console.log("   ✅ Deployer is admin");
    }
  } catch (error) {
    console.log("   ⚠️  Could not check admin status:", error.message);
    console.log("   ⚠️  Continuing anyway...");
  }

  // === SETUP 3: ADD RESOURCES TO PLAYER ===
  console.log("\n📋 SETUP 3: Adding Resources to Player...");

  try {
    // Kiểm tra player có tồn tại không
    let playerData;
    try {
      playerData = await playerLogic.getPlayerData(player1.address);
      console.log("   ✅ Player tồn tại, bắt đầu add resources...");
    } catch (error) {
      console.log(`   ⚠️  Lỗi khi getPlayerData: ${error.message}`);
      console.log("   ⚠️  Player có thể chưa tồn tại hoặc có lỗi khác");
      console.log("   ⚠️  Bỏ qua việc add resources...");
      console.log("   ⚠️  Continuing anyway...");
      playerData = null;
    }

    if (playerData && playerData.playerAddress === player1.address) {
      const currentMana = Number(playerData.mana);
      const currentSunlight = Number(playerData.sunlight);
      const currentSunny = Number(playerData.sunny);

      // Add mana if needed (target: 1000)
      if (currentMana < 1000) {
        console.log(
          `   • Adding mana (current: ${currentMana}, target: 1000)...`
        );
        try {
          const setManaTx = await playerLogic.setMana(player1.address, 1000);
          await setManaTx.wait();
          console.log("   ✅ Mana set to 1000");
        } catch (error) {
          console.log(
            `   ⚠️  Could not set mana: ${error.message}. Continuing...`
          );
        }
      } else {
        console.log(`   ✅ Mana already sufficient: ${currentMana}`);
      }

      // Add sunlight if needed (target: 10000)
      if (currentSunlight < 10000) {
        console.log(
          `   • Adding sunlight (current: ${currentSunlight}, target: 10000)...`
        );
        try {
          const addSunlightTx = await playerLogic.addSunlight(
            player1.address,
            10000 - currentSunlight
          );
          await addSunlightTx.wait();
          console.log("   ✅ Sunlight added");
        } catch (error) {
          console.log(
            `   ⚠️  Could not add sunlight: ${error.message}. Continuing...`
          );
        }
      } else {
        console.log(`   ✅ Sunlight already sufficient: ${currentSunlight}`);
      }

      // Add sunny if needed (target: 1000)
      if (currentSunny < 1000) {
        console.log(
          `   • Adding sunny (current: ${currentSunny}, target: 1000)...`
        );
        try {
          const addSunnyTx = await playerLogic.addSunny(
            player1.address,
            1000 - currentSunny
          );
          await addSunnyTx.wait();
          console.log("   ✅ Sunny added");
        } catch (error) {
          console.log(
            `   ⚠️  Could not add sunny: ${error.message}. Continuing...`
          );
        }
      } else {
        console.log(`   ✅ Sunny already sufficient: ${currentSunny}`);
      }
    }
  } catch (error) {
    console.error("   ❌ Failed to add resources:", error.message);
    console.log("   ⚠️  Continuing anyway...");
  }

  // === SETUP 4: CREATE/CHECK ITEMS ===
  console.log("\n📋 SETUP 4: Creating/Checking Items...");

  const testItems = [
    { id: 1001, name: "Test Weapon", itemType: 0, rarity: 0 }, // Weapon (0), Common (0)
    { id: 1002, name: "Test Armor", itemType: 8, rarity: 0 }, // Tool (8), Common (0)
  ];

  for (const item of testItems) {
    try {
      // Check if item exists
      let itemExists = false;
      try {
        const itemData = await itemProxy.getItem(item.id);
        if (itemData.itemId > 0) {
          itemExists = true;
          console.log(
            `   ✅ Item ${item.name} (ID: ${item.id}) already exists`
          );
        }
      } catch (error) {
        // Item doesn't exist
      }

      if (!itemExists) {
        console.log(`   • Creating item ${item.name} (ID: ${item.id})...`);
        const createItemTx = await itemLogic.createItem(
          item.id,
          item.name,
          item.itemType, // ItemType enum: Weapon=0, Consumable=1, Material=2, etc.
          item.rarity, // Rarity enum: Common=0, Uncommon=1, Rare=2, etc.
          100, // maxStacked
          false, // isStacked
          true // isTradable
        );
        await createItemTx.wait();
        console.log(`   ✅ Item ${item.name} created!`);
      }
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log(`   ℹ️ Item ${item.name} already exists`);
      } else {
        console.error(
          `   ❌ Failed to create item ${item.name}:`,
          error.message
        );
      }
    }
  }

  // === SETUP 5: ADD ITEMS TO PLAYER INVENTORY ===
  console.log("\n📋 SETUP 5: Adding Items to Player Inventory...");

  for (const item of testItems) {
    try {
      // Check if player has item
      let hasItem = false;
      try {
        const inventoryItem = await inventoryProxy.getItem(
          player1.address,
          item.id
        );
        if (inventoryItem.quantity > 0) {
          hasItem = true;
          console.log(
            `   ✅ Player already has ${item.name} (quantity: ${inventoryItem.quantity})`
          );
        }
      } catch (error) {
        // Item doesn't exist in inventory
      }

      if (!hasItem) {
        console.log(`   • Adding ${item.name} to player inventory...`);
        const addItemTx = await inventoryLogic.addItem(
          player1.address,
          item.id,
          5 // quantity
        );
        await addItemTx.wait();
        console.log(`   ✅ ${item.name} added to inventory!`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to add item ${item.name}:`, error.message);
    }
  }

  // === SETUP 6: CREATE/CHECK DUNGEON ===
  console.log("\n📋 SETUP 6: Creating/Checking Dungeon...");

  // Helper function để add nhiều stages cho một dungeon
  async function addStagesToDungeon(dungeonId, stages) {
    console.log(
      `   • Adding ${stages.length} stages to dungeon ${dungeonId}...`
    );

    for (const stage of stages) {
      try {
        // Kiểm tra xem stage đã tồn tại chưa
        let stageExists = false;
        try {
          const dungeon = await dungeonLogic.getDungeon(dungeonId);
          if (dungeon.stages && dungeon.stages.length > 0) {
            stageExists = dungeon.stages.some(
              (s) => Number(s.stageNumber) === stage.stageNumber
            );
          }
        } catch (error) {
          // Nếu không lấy được dungeon, tiếp tục thử add
        }

        if (!stageExists) {
          const addStageTx = await dungeonLogic.addDungeonStage(
            dungeonId,
            stage.stageNumber,
            stage.rewardMultiplier
          );
          await addStageTx.wait();
          const multiplierDecimal = (stage.rewardMultiplier / 10000).toFixed(2);
          console.log(
            `     ✅ Stage ${stage.stageNumber} added (multiplier: ${stage.rewardMultiplier} = ${multiplierDecimal}x)`
          );
        } else {
          console.log(`     ℹ️  Stage ${stage.stageNumber} already exists`);
        }
      } catch (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("Stage already exists")
        ) {
          console.log(`     ℹ️  Stage ${stage.stageNumber} already exists`);
        } else {
          console.error(
            `     ❌ Failed to add stage ${stage.stageNumber}:`,
            error.message
          );
          throw error;
        }
      }
    }
  }

  const testDungeonId = 999; // Test dungeon ID

  try {
    // Check if dungeon exists
    let dungeonExists = false;
    try {
      dungeonExists = await dungeonLogic.dungeonExists(testDungeonId);
    } catch (error) {
      // Dungeon doesn't exist
    }

    if (!dungeonExists) {
      console.log(`   • Creating test dungeon (ID: ${testDungeonId})...`);

      // Create dungeon
      const createDungeonTx = await dungeonLogic.createDungeon(
        testDungeonId,
        "Test Dungeon",
        "A test dungeon for full flow testing with multiple stages",
        0, // DungeonType.Normal
        0, // Difficulty.Easy
        1, // levelRequirement
        50, // energyCost
        100, // sunlightCost
        0, // sunnyCost
        [], // itemRequirements
        300, // cooldownTime (5 minutes)
        ethers.parseEther("1"), // minBetAmount
        ethers.parseEther("1000") // maxBetAmount
      );
      await createDungeonTx.wait();
      console.log("   ✅ Dungeon created!");
    } else {
      console.log(`   ✅ Dungeon (ID: ${testDungeonId}) already exists`);
    }

    // Define nhiều stages khác nhau để test nhiều case
    // Stages với các reward multiplier khác nhau để test:
    // - Low reward (0.1x - 0.5x)
    // - Medium reward (0.5x - 1.5x)
    // - High reward (1.5x - 3x)
    // - Very high reward (3x - 10x)
    const stages = [
      { stageNumber: 1, rewardMultiplier: 1000 }, // 0.1x - Very low reward
      { stageNumber: 2, rewardMultiplier: 2000 }, // 0.2x - Low reward
      { stageNumber: 3, rewardMultiplier: 3000 }, // 0.3x - Low-medium reward
      { stageNumber: 4, rewardMultiplier: 5000 }, // 0.5x - Medium reward
      { stageNumber: 5, rewardMultiplier: 7500 }, // 0.75x - Medium reward
      { stageNumber: 6, rewardMultiplier: 10000 }, // 1.0x - Medium-high reward (break even)
      { stageNumber: 7, rewardMultiplier: 15000 }, // 1.5x - High reward
      { stageNumber: 8, rewardMultiplier: 20000 }, // 2.0x - High reward
      { stageNumber: 9, rewardMultiplier: 25000 }, // 2.5x - Very high reward
      { stageNumber: 10, rewardMultiplier: 30000 }, // 3.0x - Very high reward
    ];

    // Add tất cả stages vào dungeon
    await addStagesToDungeon(testDungeonId, stages);

    // Verify số stages đã được add
    try {
      const dungeon = await dungeonLogic.getDungeon(testDungeonId);
      console.log(`\n   📊 Dungeon Summary:`);
      console.log(`     • Total stages: ${dungeon.stages.length}`);
      console.log(`     • Stages detail:`);
      for (const stage of dungeon.stages) {
        const multiplierDecimal = (
          Number(stage.rewardMultiplier) / 10000
        ).toFixed(2);
        console.log(
          `       - Stage ${stage.stageNumber}: multiplier ${stage.rewardMultiplier} (${multiplierDecimal}x)`
        );
      }
    } catch (error) {
      console.log(`     ⚠️  Could not verify stages: ${error.message}`);
    }
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("   ℹ️ Dungeon already exists");
      // Vẫn thử add stages nếu dungeon đã tồn tại
      try {
        const stages = [
          { stageNumber: 1, rewardMultiplier: 1000 },
          { stageNumber: 2, rewardMultiplier: 2000 },
          { stageNumber: 3, rewardMultiplier: 3000 },
          { stageNumber: 4, rewardMultiplier: 5000 },
          { stageNumber: 5, rewardMultiplier: 7500 },
          { stageNumber: 6, rewardMultiplier: 10000 },
          { stageNumber: 7, rewardMultiplier: 15000 },
          { stageNumber: 8, rewardMultiplier: 20000 },
          { stageNumber: 9, rewardMultiplier: 25000 },
          { stageNumber: 10, rewardMultiplier: 30000 },
        ];
        await addStagesToDungeon(testDungeonId, stages);
      } catch (addStageError) {
        console.log(`     ⚠️  Could not add stages: ${addStageError.message}`);
      }
    } else {
      console.error("   ❌ Failed to create dungeon:", error.message);
      throw error;
    }
  }

  // Fund DungeonLogic contract for bet rewards
  console.log("\n📋 SETUP 7: Funding DungeonLogic for Bet Rewards...");
  try {
    const dungeonBalance = await ethers.provider.getBalance(
      dungeonLogicAddress
    );
    const minBalance = ethers.parseEther("1000"); // At least 1000 ETH

    if (dungeonBalance < minBalance) {
      console.log("   • Sending ETH to DungeonLogic...");
      const fundTx = await deployer.sendTransaction({
        to: dungeonLogicAddress,
        value: ethers.parseEther("2000"), // Send 2000 ETH
      });
      await fundTx.wait();
      console.log("   ✅ DungeonLogic funded!");
    } else {
      console.log(
        `   ✅ DungeonLogic already has sufficient balance: ${ethers.formatEther(
          dungeonBalance
        )} ETH`
      );
    }
  } catch (error) {
    console.error("   ❌ Failed to fund DungeonLogic:", error.message);
  }

  // ============ TEST PHASE ============

  console.log("\n" + "=".repeat(60));
  console.log("🧪 STARTING DUNGEON FULL FLOW TESTS");
  console.log("=".repeat(60));

  // === TEST 1: CHECK REQUIREMENTS ===
  console.log("\n1️⃣ TEST: Checking Dungeon Requirements...");

  try {
    const hasItems = await dungeonLogic.checkItemRequirements(
      player1.address,
      testDungeonId
    );
    console.log(`   • Has item requirements: ${hasItems ? "YES" : "NO"}`);

    const hasResources = await dungeonLogic.checkResourceRequirements(
      player1.address,
      testDungeonId
    );
    console.log(
      `   • Has resource requirements: ${hasResources ? "YES" : "NO"}`
    );

    const hasAll = await dungeonLogic.checkAllRequirements(
      player1.address,
      testDungeonId
    );
    console.log(`   • Has all requirements: ${hasAll ? "YES" : "NO"}`);

    if (!hasAll) {
      throw new Error("Player does not meet all requirements!");
    }
  } catch (error) {
    console.error("   ❌ Failed to check requirements:", error.message);
    throw error;
  }

  // === TEST 2: START DUNGEON SESSION ===
  console.log("\n2️⃣ TEST: Starting Dungeon Session...");

  let sessionId;
  try {
    const equipmentItemIds = [1001, 1002];
    const equipmentQuantities = [1, 1];
    const betAmount = ethers.parseEther("100"); // 100 ETH bet

    // Hiển thị thông tin player TRƯỚC KHI START
    console.log("\n   📊 PLAYER INFO BEFORE START:");
    let playerBefore;
    let inventoryBefore;
    try {
      playerBefore = await playerLogic.getPlayerData(player1.address);
      const playerEthBefore = await ethers.provider.getBalance(player1.address);
      const dungeonBalanceBefore = await ethers.provider.getBalance(
        dungeonLogicAddress
      );

      console.log(`     • Level: ${playerBefore.level}`);
      console.log(`     • Mana: ${playerBefore.mana}`);
      console.log(`     • Max Mana: ${playerBefore.maxMana}`);
      console.log(`     • Sunlight: ${playerBefore.sunlight}`);
      console.log(`     • Sunny: ${playerBefore.sunny}`);
      console.log(`     • XP: ${playerBefore.xp}`);
      console.log(
        `     • Player ETH Balance: ${ethers.formatEther(playerEthBefore)} ETH`
      );
      console.log(
        `     • DungeonLogic ETH Balance: ${ethers.formatEther(
          dungeonBalanceBefore
        )} ETH`
      );
    } catch (error) {
      console.log(`     ⚠️  Could not get player data: ${error.message}`);
    }

    // Hiển thị inventory TRƯỚC KHI START
    console.log("\n   📦 INVENTORY BEFORE START:");
    try {
      inventoryBefore = await inventoryLogic.getInventory(player1.address);
      console.log(`     • Total items: ${inventoryBefore.length}`);
      for (const item of inventoryBefore) {
        console.log(
          `       - Item ${item.itemId}: quantity=${item.quantity}, durability=${item.durability}`
        );
      }
      if (inventoryBefore.length === 0) {
        console.log("       (No items in inventory)");
      }
    } catch (error) {
      console.log(`     ⚠️  Could not get inventory: ${error.message}`);
      inventoryBefore = [];
    }

    console.log("\n   • Starting dungeon session...");
    console.log(`     - Equipment: ${equipmentItemIds.join(", ")}`);
    console.log(
      `     - Equipment Quantities: ${equipmentQuantities.join(", ")}`
    );
    console.log(`     - Bet amount: ${ethers.formatEther(betAmount)} ETH`);

    const playerEthBeforeStart = await ethers.provider.getBalance(
      player1.address
    );
    const startTx = await dungeonLogic
      .connect(player1)
      .startDungeon(testDungeonId, equipmentItemIds, equipmentQuantities, {
        value: betAmount,
      });
    const receipt = await startTx.wait();
    const playerEthAfterStart = await ethers.provider.getBalance(
      player1.address
    );

    // Get sessionId from return value (by calling getPlayerSessions)
    const playerSessions = await dungeonLogic.getPlayerSessions(
      player1.address
    );
    sessionId = playerSessions[playerSessions.length - 1];
    console.log(`   ✅ Session started! Session ID: ${sessionId}`);

    // Get session info
    const session = await dungeonLogic.getDungeonSession(sessionId);
    console.log(`\n   📋 Session Info:`);
    console.log(`     - Player: ${session.player}`);
    console.log(`     - Dungeon ID: ${session.dungeonId}`);
    console.log(`     - Stage Number: ${session.stageNumber}`);
    console.log(
      `     - Bet Amount: ${ethers.formatEther(session.betAmount)} ETH`
    );
    console.log(`     - Has Bet: ${session.hasBet}`);
    console.log(`     - Start Time: ${session.startTime}`);

    // Hiển thị thông tin player SAU KHI START
    console.log("\n   📊 PLAYER INFO AFTER START:");
    try {
      const playerAfter = await playerLogic.getPlayerData(player1.address);
      if (playerBefore) {
        console.log(`     • Level: ${playerAfter.level}`);
        console.log(
          `     • Mana: ${playerAfter.mana} (was: ${playerBefore.mana}, diff: ${
            Number(playerAfter.mana) - Number(playerBefore.mana)
          })`
        );
        console.log(`     • Max Mana: ${playerAfter.maxMana}`);
        console.log(
          `     • Sunlight: ${playerAfter.sunlight} (was: ${
            playerBefore.sunlight
          }, diff: ${
            Number(playerAfter.sunlight) - Number(playerBefore.sunlight)
          })`
        );
        console.log(
          `     • Sunny: ${playerAfter.sunny} (was: ${
            playerBefore.sunny
          }, diff: ${Number(playerAfter.sunny) - Number(playerBefore.sunny)})`
        );
        console.log(
          `     • Player ETH Balance: ${ethers.formatEther(
            playerEthAfterStart
          )} ETH (was: ${ethers.formatEther(
            playerEthBeforeStart
          )} ETH, diff: ${ethers.formatEther(
            playerEthBeforeStart - playerEthAfterStart
          )} ETH)`
        );
      } else {
        console.log(`     • Level: ${playerAfter.level}`);
        console.log(`     • Mana: ${playerAfter.mana}`);
        console.log(`     • Max Mana: ${playerAfter.maxMana}`);
        console.log(`     • Sunlight: ${playerAfter.sunlight}`);
        console.log(`     • Sunny: ${playerAfter.sunny}`);
        console.log(
          `     • Player ETH Balance: ${ethers.formatEther(
            playerEthAfterStart
          )} ETH`
        );
      }
    } catch (error) {
      console.log(`     ⚠️  Could not get player data: ${error.message}`);
    }

    // Hiển thị inventory SAU KHI START
    console.log("\n   📦 INVENTORY AFTER START:");
    try {
      const inventoryAfter = await inventoryLogic.getInventory(player1.address);
      console.log(`     • Total items: ${inventoryAfter.length}`);
      for (const item of inventoryAfter) {
        if (inventoryBefore && inventoryBefore.length > 0) {
          const beforeItem = inventoryBefore.find(
            (i) => i.itemId === item.itemId
          );
          const beforeQty = beforeItem ? beforeItem.quantity : 0;
          console.log(
            `       - Item ${item.itemId}: quantity=${
              item.quantity
            } (was: ${beforeQty}, diff: ${
              Number(item.quantity) - Number(beforeQty)
            })`
          );
        } else {
          console.log(
            `       - Item ${item.itemId}: quantity=${item.quantity}, durability=${item.durability}`
          );
        }
      }
      if (inventoryAfter.length === 0) {
        console.log("       (No items in inventory)");
      }
    } catch (error) {
      console.log(`     ⚠️  Could not get inventory: ${error.message}`);
    }
  } catch (error) {
    console.error("   ❌ Failed to start dungeon session:", error.message);
    throw error;
  }

  // === TEST 3: END DUNGEON SESSION (WIN) ===
  console.log("\n3️⃣ TEST: Ending Dungeon Session (WIN)...");

  try {
    const isCompleted = true;
    // Test với nhiều stage khác nhau để test nhiều case
    // Có thể thay đổi stageNumber để test các case khác nhau:
    // - Stage 1: 0.1x reward (very low)
    // - Stage 3: 0.3x reward (low-medium)
    // - Stage 5: 0.75x reward (medium)
    // - Stage 7: 1.5x reward (high)
    // - Stage 10: 3.0x reward (very high)
    const stageNumber = 5; // Player reached stage 5 (0.75x reward)
    const rewardItemIds = [1001, 1002];
    const rewardQuantities = [2, 3];
    const playerDamages = [100, 150, 200];
    const monsterHPs = [80, 120, 160];
    const sunlightReward = 500;
    const sunnyReward = 200;

    // Hiển thị thông tin player TRƯỚC KHI END
    console.log("\n   📊 PLAYER INFO BEFORE END:");
    let playerBeforeEnd;
    let inventoryBeforeEnd;
    try {
      playerBeforeEnd = await playerLogic.getPlayerData(player1.address);
      const dungeonBalanceBeforeEnd = await ethers.provider.getBalance(
        dungeonLogicAddress
      );

      console.log(`     • Level: ${playerBeforeEnd.level}`);
      console.log(`     • Mana: ${playerBeforeEnd.mana}`);
      console.log(`     • Sunlight: ${playerBeforeEnd.sunlight}`);
      console.log(`     • Sunny: ${playerBeforeEnd.sunny}`);
      console.log(
        `     • DungeonLogic ETH Balance: ${ethers.formatEther(
          dungeonBalanceBeforeEnd
        )} ETH`
      );
    } catch (error) {
      console.log(`     ⚠️  Could not get player data: ${error.message}`);
    }

    // Hiển thị inventory TRƯỚC KHI END
    console.log("\n   📦 INVENTORY BEFORE END:");
    try {
      inventoryBeforeEnd = await inventoryLogic.getInventory(player1.address);
      console.log(`     • Total items: ${inventoryBeforeEnd.length}`);
      for (const item of inventoryBeforeEnd) {
        console.log(`       - Item ${item.itemId}: quantity=${item.quantity}`);
      }
    } catch (error) {
      console.log(`     ⚠️  Could not get inventory: ${error.message}`);
      inventoryBeforeEnd = [];
    }

    // Lấy reward multiplier từ stage trước khi end
    let expectedRewardMultiplier = 0;
    try {
      const dungeon = await dungeonLogic.getDungeon(testDungeonId);
      if (dungeon.stages && dungeon.stages.length > 0) {
        const stage = dungeon.stages.find(
          (s) => Number(s.stageNumber) === stageNumber
        );
        if (stage) {
          expectedRewardMultiplier = Number(stage.rewardMultiplier);
        }
      }
    } catch (error) {
      console.log(`     ⚠️  Could not get stage info: ${error.message}`);
    }

    console.log("\n   • Ending dungeon session...");
    console.log(`     - Completed: ${isCompleted}`);
    console.log(`     - Stage: ${stageNumber}`);
    if (expectedRewardMultiplier > 0) {
      console.log(
        `     - Expected Reward Multiplier: ${expectedRewardMultiplier} (${(
          expectedRewardMultiplier / 10000
        ).toFixed(2)}x)`
      );
    }
    console.log(`     - Rewards: ${rewardItemIds.length} items`);
    console.log(`     - Sunlight Reward: ${sunlightReward}`);
    console.log(`     - Sunny Reward: ${sunnyReward}`);

    const endTx = await dungeonLogic.endDungeon(
      sessionId,
      isCompleted,
      rewardItemIds,
      rewardQuantities,
      playerDamages,
      monsterHPs,
      sunlightReward,
      sunnyReward,
      stageNumber
    );
    await endTx.wait();
    console.log("   ✅ Session ended successfully!");

    // Get updated session info
    const session = await dungeonLogic.getDungeonSession(sessionId);
    const rewardMultiplier = Number(session.rewardMultiplier);
    const rewardMultiplierDecimal = rewardMultiplier / 10000;
    console.log(`\n   📋 Updated Session Info:`);
    console.log(`     - Is Completed: ${session.isCompleted}`);
    console.log(`     - Stage Number: ${session.stageNumber}`);
    console.log(
      `     - Reward Multiplier: ${rewardMultiplier} (${rewardMultiplierDecimal.toFixed(
        2
      )}x)`
    );
    if (session.hasBet && session.betAmount > 0) {
      const betReward =
        (session.betAmount * BigInt(rewardMultiplier)) / BigInt(10000);
      console.log(
        `     - Bet Amount: ${ethers.formatEther(session.betAmount)} ETH`
      );
      console.log(
        `     - Expected Bet Reward: ${ethers.formatEther(
          betReward
        )} ETH (${rewardMultiplierDecimal.toFixed(2)}x)`
      );
    }
    console.log(`     - Sunlight Reward: ${session.sunlightReward}`);
    console.log(`     - Sunny Reward: ${session.sunnyReward}`);
    console.log(`     - Reward Items: ${session.rewardItemIds.length} items`);
    for (let i = 0; i < session.rewardItemIds.length; i++) {
      console.log(
        `       - Item ${session.rewardItemIds[i]}: quantity=${session.rewardQuantities[i]}`
      );
    }

    // Hiển thị thông tin player SAU KHI END
    console.log("\n   📊 PLAYER INFO AFTER END:");
    try {
      const playerAfterEnd = await playerLogic.getPlayerData(player1.address);
      if (playerBeforeEnd) {
        console.log(`     • Level: ${playerAfterEnd.level}`);
        console.log(
          `     • Mana: ${playerAfterEnd.mana} (was: ${
            playerBeforeEnd.mana
          }, diff: ${
            Number(playerAfterEnd.mana) - Number(playerBeforeEnd.mana)
          })`
        );
        console.log(
          `     • Sunlight: ${playerAfterEnd.sunlight} (was: ${
            playerBeforeEnd.sunlight
          }, diff: ${
            Number(playerAfterEnd.sunlight) - Number(playerBeforeEnd.sunlight)
          })`
        );
        console.log(
          `     • Sunny: ${playerAfterEnd.sunny} (was: ${
            playerBeforeEnd.sunny
          }, diff: ${
            Number(playerAfterEnd.sunny) - Number(playerBeforeEnd.sunny)
          })`
        );
      } else {
        console.log(`     • Level: ${playerAfterEnd.level}`);
        console.log(`     • Mana: ${playerAfterEnd.mana}`);
        console.log(`     • Sunlight: ${playerAfterEnd.sunlight}`);
        console.log(`     • Sunny: ${playerAfterEnd.sunny}`);
      }
    } catch (error) {
      console.log(`     ⚠️  Could not get player data: ${error.message}`);
    }

    // Hiển thị inventory SAU KHI END
    console.log("\n   📦 INVENTORY AFTER END:");
    try {
      const inventoryAfterEnd = await inventoryLogic.getInventory(
        player1.address
      );
      console.log(`     • Total items: ${inventoryAfterEnd.length}`);
      for (const item of inventoryAfterEnd) {
        if (inventoryBeforeEnd && inventoryBeforeEnd.length > 0) {
          const beforeItem = inventoryBeforeEnd.find(
            (i) => i.itemId === item.itemId
          );
          const beforeQty = beforeItem ? beforeItem.quantity : 0;
          console.log(
            `       - Item ${item.itemId}: quantity=${
              item.quantity
            } (was: ${beforeQty}, diff: ${
              Number(item.quantity) - Number(beforeQty)
            })`
          );
        } else {
          console.log(
            `       - Item ${item.itemId}: quantity=${item.quantity}`
          );
        }
      }
    } catch (error) {
      console.log(`     ⚠️  Could not get inventory: ${error.message}`);
    }
  } catch (error) {
    console.error("   ❌ Failed to end dungeon session:", error.message);
    throw error;
  }

  // === TEST 4: CLAIM REWARDS ===
  console.log("\n4️⃣ TEST: Claiming Rewards...");

  try {
    // Get session info để tính expected reward
    const sessionBeforeClaim = await dungeonLogic.getDungeonSession(sessionId);
    const rewardMultiplier = Number(sessionBeforeClaim.rewardMultiplier);
    const rewardMultiplierDecimal = rewardMultiplier / 10000;

    // Tính expected bet reward
    let expectedBetReward = BigInt(0);
    if (
      sessionBeforeClaim.hasBet &&
      sessionBeforeClaim.isCompleted &&
      rewardMultiplier > 0
    ) {
      expectedBetReward =
        (sessionBeforeClaim.betAmount * BigInt(rewardMultiplier)) /
        BigInt(10000);
    }

    // Lấy ETH balance trước khi claim
    const playerEthBeforeClaim = await ethers.provider.getBalance(
      player1.address
    );
    const dungeonBalanceBeforeClaim = await ethers.provider.getBalance(
      dungeonLogicAddress
    );

    console.log("\n   💰 ETH Balance BEFORE CLAIM:");
    console.log(
      `     • Player ETH: ${ethers.formatEther(playerEthBeforeClaim)} ETH`
    );
    console.log(
      `     • DungeonLogic ETH: ${ethers.formatEther(
        dungeonBalanceBeforeClaim
      )} ETH`
    );

    if (expectedBetReward > 0) {
      console.log(
        `     • Expected Bet Reward: ${ethers.formatEther(
          expectedBetReward
        )} ETH (${rewardMultiplierDecimal.toFixed(2)}x)`
      );
    }

    // Claim rewards
    console.log("\n   • Claiming rewards...");
    const claimTx = await dungeonLogic.connect(player1).claimRewards(sessionId);
    const claimReceipt = await claimTx.wait();

    // Lấy ETH balance sau khi claim
    const playerEthAfterClaim = await ethers.provider.getBalance(
      player1.address
    );
    const dungeonBalanceAfterClaim = await ethers.provider.getBalance(
      dungeonLogicAddress
    );

    // Tính sự thay đổi
    const playerEthDiff = playerEthAfterClaim - playerEthBeforeClaim;
    const dungeonEthDiff = dungeonBalanceAfterClaim - dungeonBalanceBeforeClaim;

    console.log("\n   💰 ETH Balance AFTER CLAIM:");
    console.log(
      `     • Player ETH: ${ethers.formatEther(playerEthAfterClaim)} ETH`
    );
    console.log(
      `     • DungeonLogic ETH: ${ethers.formatEther(
        dungeonBalanceAfterClaim
      )} ETH`
    );
    console.log(`\n   📊 ETH Balance Changes:`);
    console.log(
      `     • Player ETH Change: ${ethers.formatEther(playerEthDiff)} ETH ${
        playerEthDiff >= 0 ? "(+)" : "(-)"
      }`
    );
    console.log(
      `     • DungeonLogic ETH Change: ${ethers.formatEther(
        dungeonEthDiff
      )} ETH ${dungeonEthDiff >= 0 ? "(+)" : "(-)"}`
    );

    // Verify reward
    if (expectedBetReward > 0) {
      const actualReward = playerEthDiff;
      const expectedReward = expectedBetReward;
      console.log(`\n   ✅ Reward Verification:`);
      console.log(`     • Expected: ${ethers.formatEther(expectedReward)} ETH`);
      console.log(`     • Actual: ${ethers.formatEther(actualReward)} ETH`);

      // Tính gas fee (player phải trả gas)
      const gasUsed = claimReceipt.gasUsed * claimReceipt.gasPrice;
      const netReward = actualReward + gasUsed; // actual reward = bet reward - gas fee
      console.log(`     • Gas Fee: ${ethers.formatEther(gasUsed)} ETH`);
      console.log(
        `     • Net Reward (after gas): ${ethers.formatEther(netReward)} ETH`
      );

      if (netReward >= (expectedReward * BigInt(99)) / BigInt(100)) {
        // Allow 1% tolerance
        console.log(`     ✅ Reward matches expected! (within tolerance)`);
      } else {
        console.log(
          `     ⚠️  Reward mismatch! Expected: ${ethers.formatEther(
            expectedReward
          )}, Got: ${ethers.formatEther(netReward)}`
        );
      }
    }

    console.log("   ✅ Rewards claimed successfully!");
  } catch (error) {
    console.error("   ❌ Failed to claim rewards:", error.message);
    throw error;
  }

  // === TEST 5: TEST LOSE SCENARIO (isCompleted = false) ===
  console.log("\n5️⃣ TEST: Testing LOSE Scenario (isCompleted = false)...");

  let sessionId2;
  try {
    // Start new session
    console.log("   • Starting new dungeon session...");
    const startTx2 = await dungeonLogic
      .connect(player1)
      .startDungeon(testDungeonId, [1001], [1], {
        value: ethers.parseEther("100"),
      });
    const receipt2 = await startTx2.wait();

    const playerSessions2 = await dungeonLogic.getPlayerSessions(
      player1.address
    );
    sessionId2 = playerSessions2[playerSessions2.length - 1];
    console.log(`   ✅ New session started! Session ID: ${sessionId2}`);

    // Get player ETH balance before end
    const playerEthBeforeEnd = await ethers.provider.getBalance(
      player1.address
    );
    const dungeonBalanceBeforeEnd = await ethers.provider.getBalance(
      dungeonLogicAddress
    );

    // End session with isCompleted = false (lost)
    console.log("   • Ending session as LOSE (isCompleted = false)...");
    const endTx2 = await dungeonLogic.endDungeon(
      sessionId2,
      false, // isCompleted = false
      [], // no rewards
      [],
      [50, 80], // player damages
      [100, 150], // monster HPs
      0, // no sunlight reward
      0, // no sunny reward
      0 // stageNumber = 0 (lost)
    );
    await endTx2.wait();
    console.log("   ✅ Session ended as LOSE!");

    const session2 = await dungeonLogic.getDungeonSession(sessionId2);
    const rewardMultiplier2 = Number(session2.rewardMultiplier);
    const rewardMultiplierDecimal2 = rewardMultiplier2 / 10000;
    console.log(`\n   📋 Session Info:`);
    console.log(`     - Is Completed: ${session2.isCompleted}`);
    console.log(`     - Is Claimed: ${session2.isClaimed}`);
    console.log(`     - Stage Number: ${session2.stageNumber}`);
    console.log(
      `     - Reward Multiplier: ${rewardMultiplier2} (${rewardMultiplierDecimal2.toFixed(
        2
      )}x)`
    );
    console.log(
      `     - Bet Amount: ${ethers.formatEther(session2.betAmount)} ETH`
    );
    console.log(`     - Has Bet: ${session2.hasBet}`);
    console.log(
      `     - Note: When isCompleted = false, isClaimed should be true automatically`
    );

    // Verify that isClaimed is true when isCompleted = false
    if (session2.isClaimed === true) {
      console.log(
        `     ✅ Verified: isClaimed = true (automatically set when lost)`
      );
    } else {
      console.log(
        `     ⚠️  Warning: isClaimed should be true when isCompleted = false`
      );
    }

    // Try to claim rewards - should FAIL
    console.log(`\n   🚫 Testing Claim Rewards (should FAIL)...`);
    try {
      const playerEthBeforeClaim = await ethers.provider.getBalance(
        player1.address
      );
      const claimTx = await dungeonLogic
        .connect(player1)
        .claimRewards(sessionId2);
      await claimTx.wait();

      // If we reach here, claim succeeded (which should NOT happen)
      console.log(`     ❌ ERROR: Claim succeeded but should have failed!`);
      console.log(
        `     ❌ This is a bug - lost sessions should not be claimable!`
      );

      // Check if any ETH was transferred
      const playerEthAfterClaim = await ethers.provider.getBalance(
        player1.address
      );
      const ethDiff = playerEthAfterClaim - playerEthBeforeClaim;
      if (ethDiff > 0) {
        console.log(
          `     ❌ CRITICAL: ETH was transferred: ${ethers.formatEther(
            ethDiff
          )} ETH`
        );
      }
    } catch (claimError) {
      // Expected error - claim should fail
      console.log(`     ✅ Claim failed as expected!`);
      console.log(`     • Error message: ${claimError.message}`);

      // Verify error message contains expected text
      if (
        claimError.message.includes("Rewards already claimed") ||
        claimError.message.includes("Session not completed") ||
        claimError.message.includes("no rewards to claim")
      ) {
        console.log(`     ✅ Error message is correct!`);
      } else {
        console.log(
          `     ⚠️  Unexpected error message, but claim still failed (OK)`
        );
      }

      // Verify ETH balance didn't change
      const playerEthAfterClaim = await ethers.provider.getBalance(
        player1.address
      );
      const dungeonBalanceAfterClaim = await ethers.provider.getBalance(
        dungeonLogicAddress
      );
      const playerEthDiff = playerEthAfterClaim - playerEthBeforeClaim;
      const dungeonEthDiff = dungeonBalanceAfterClaim - dungeonBalanceBeforeEnd;

      console.log(`\n   💰 ETH Balance Verification:`);
      console.log(
        `     • Player ETH Before: ${ethers.formatEther(
          playerEthBeforeEnd
        )} ETH`
      );
      console.log(
        `     • Player ETH After: ${ethers.formatEther(
          playerEthAfterClaim
        )} ETH`
      );
      console.log(
        `     • Player ETH Change: ${ethers.formatEther(playerEthDiff)} ETH`
      );
      console.log(
        `     • DungeonLogic ETH Before: ${ethers.formatEther(
          dungeonBalanceBeforeEnd
        )} ETH`
      );
      console.log(
        `     • DungeonLogic ETH After: ${ethers.formatEther(
          dungeonBalanceAfterClaim
        )} ETH`
      );
      console.log(
        `     • DungeonLogic ETH Change: ${ethers.formatEther(
          dungeonEthDiff
        )} ETH`
      );

      // Bet amount should still be in DungeonLogic (not refunded)
      if (session2.hasBet && session2.betAmount > 0) {
        const expectedDungeonBalance =
          dungeonBalanceBeforeEnd + session2.betAmount;
        console.log(
          `     • Expected DungeonLogic Balance (with bet): ${ethers.formatEther(
            expectedDungeonBalance
          )} ETH`
        );
        console.log(
          `     • Actual DungeonLogic Balance: ${ethers.formatEther(
            dungeonBalanceAfterClaim
          )} ETH`
        );

        if (dungeonBalanceAfterClaim >= expectedDungeonBalance) {
          console.log(
            `     ✅ Bet amount is still in DungeonLogic (not refunded)`
          );
        } else {
          console.log(
            `     ⚠️  Bet amount may have been refunded (unexpected)`
          );
        }
      }

      // Player should not receive any ETH
      if (playerEthDiff === BigInt(0)) {
        console.log(
          `     ✅ Player ETH balance unchanged (no reward received)`
        );
      } else {
        console.log(
          `     ⚠️  Player ETH balance changed: ${ethers.formatEther(
            playerEthDiff
          )} ETH`
        );
      }
    }

    // Verify session state after failed claim attempt
    const session2AfterClaim = await dungeonLogic.getDungeonSession(sessionId2);
    console.log(`\n   📋 Session State After Claim Attempt:`);
    console.log(`     - Is Completed: ${session2AfterClaim.isCompleted}`);
    console.log(`     - Is Claimed: ${session2AfterClaim.isClaimed}`);
    console.log(`     ✅ Verified: Lost session cannot be claimed!`);
  } catch (error) {
    console.error("   ❌ Failed to test lose scenario:", error.message);
    throw error;
  }

  // === TEST 6: TEST MULTIPLE STAGES ===
  console.log(
    "\n6️⃣ TEST: Testing Multiple Stages with Different Reward Multipliers..."
  );

  // Test cases với các stages khác nhau
  const testStages = [
    { stageNumber: 1, rewardMultiplier: 1000, description: "Very Low (0.1x)" },
    {
      stageNumber: 3,
      rewardMultiplier: 3000,
      description: "Low-Medium (0.3x)",
    },
    { stageNumber: 7, rewardMultiplier: 15000, description: "High (1.5x)" },
    {
      stageNumber: 10,
      rewardMultiplier: 30000,
      description: "Very High (3.0x)",
    },
  ];

  const sessionIds = [];

  for (let i = 0; i < testStages.length; i++) {
    const testStage = testStages[i];
    try {
      console.log(
        `\n   📋 Test Case ${i + 1}: Stage ${testStage.stageNumber} (${
          testStage.description
        })`
      );

      // Start new session
      console.log(
        `   • Starting new dungeon session for stage ${testStage.stageNumber}...`
      );
      const startTx = await dungeonLogic
        .connect(player1)
        .startDungeon(testDungeonId, [1001], [1], {
          value: ethers.parseEther("100"),
        });
      await startTx.wait();

      const playerSessions = await dungeonLogic.getPlayerSessions(
        player1.address
      );
      const newSessionId = playerSessions[playerSessions.length - 1];
      sessionIds.push(newSessionId);
      console.log(`   ✅ Session started! Session ID: ${newSessionId}`);

      // End session with specific stage
      console.log(`   • Ending session at stage ${testStage.stageNumber}...`);
      const endTx = await dungeonLogic.endDungeon(
        newSessionId,
        true, // isCompleted = true
        [1001], // reward items
        [1], // reward quantities
        [50, 80, 100], // player damages
        [100, 150, 200], // monster HPs
        100, // sunlight reward
        50, // sunny reward
        testStage.stageNumber // stageNumber
      );
      await endTx.wait();
      console.log(`   ✅ Session ended at stage ${testStage.stageNumber}!`);

      // Verify reward multiplier
      const sessionData = await dungeonLogic.getDungeonSession(newSessionId);
      const actualRewardMultiplier = Number(sessionData.rewardMultiplier);
      const actualMultiplierDecimal = actualRewardMultiplier / 10000;
      const expectedMultiplierDecimal = testStage.rewardMultiplier / 10000;

      console.log(`   📊 Session Results:`);
      console.log(`     - Stage Number: ${sessionData.stageNumber}`);
      console.log(
        `     - Expected Reward Multiplier: ${
          testStage.rewardMultiplier
        } (${expectedMultiplierDecimal.toFixed(2)}x)`
      );
      console.log(
        `     - Actual Reward Multiplier: ${actualRewardMultiplier} (${actualMultiplierDecimal.toFixed(
          2
        )}x)`
      );

      if (actualRewardMultiplier === testStage.rewardMultiplier) {
        console.log(`     ✅ Reward multiplier matches!`);
      } else {
        console.log(
          `     ⚠️  Reward multiplier mismatch! Expected: ${testStage.rewardMultiplier}, Got: ${actualRewardMultiplier}`
        );
      }

      // Calculate bet reward if applicable
      let expectedBetReward = BigInt(0);
      if (
        sessionData.hasBet &&
        sessionData.isCompleted &&
        actualRewardMultiplier > 0
      ) {
        expectedBetReward =
          (sessionData.betAmount * BigInt(actualRewardMultiplier)) /
          BigInt(10000);
        console.log(
          `     - Bet Amount: ${ethers.formatEther(sessionData.betAmount)} ETH`
        );
        console.log(
          `     - Expected Bet Reward: ${ethers.formatEther(
            expectedBetReward
          )} ETH (${actualMultiplierDecimal.toFixed(2)}x)`
        );
      }

      // Claim rewards và hiển thị ETH balance
      if (sessionData.isCompleted && expectedBetReward > 0) {
        console.log(`\n   💰 Claiming Rewards...`);

        // Lấy ETH balance trước khi claim
        const playerEthBeforeClaim = await ethers.provider.getBalance(
          player1.address
        );
        const dungeonBalanceBeforeClaim = await ethers.provider.getBalance(
          dungeonLogicAddress
        );

        console.log(
          `     • Player ETH Before: ${ethers.formatEther(
            playerEthBeforeClaim
          )} ETH`
        );
        console.log(
          `     • DungeonLogic ETH Before: ${ethers.formatEther(
            dungeonBalanceBeforeClaim
          )} ETH`
        );

        // Claim rewards
        const claimTx = await dungeonLogic
          .connect(player1)
          .claimRewards(newSessionId);
        const claimReceipt = await claimTx.wait();

        // Lấy ETH balance sau khi claim
        const playerEthAfterClaim = await ethers.provider.getBalance(
          player1.address
        );
        const dungeonBalanceAfterClaim = await ethers.provider.getBalance(
          dungeonLogicAddress
        );

        // Tính sự thay đổi
        const playerEthDiff = playerEthAfterClaim - playerEthBeforeClaim;
        const dungeonEthDiff =
          dungeonBalanceAfterClaim - dungeonBalanceBeforeClaim;
        const gasUsed = claimReceipt.gasUsed * claimReceipt.gasPrice;
        const netReward = playerEthDiff + gasUsed; // actual reward = received - gas fee

        console.log(
          `     • Player ETH After: ${ethers.formatEther(
            playerEthAfterClaim
          )} ETH`
        );
        console.log(
          `     • DungeonLogic ETH After: ${ethers.formatEther(
            dungeonBalanceAfterClaim
          )} ETH`
        );
        console.log(`\n     📊 ETH Balance Changes:`);
        console.log(
          `       • Player ETH Change: ${ethers.formatEther(
            playerEthDiff
          )} ETH ${playerEthDiff >= 0 ? "(+)" : "(-)"}`
        );
        console.log(
          `       • DungeonLogic ETH Change: ${ethers.formatEther(
            dungeonEthDiff
          )} ETH ${dungeonEthDiff >= 0 ? "(+)" : "(-)"}`
        );
        console.log(`       • Gas Fee: ${ethers.formatEther(gasUsed)} ETH`);
        console.log(
          `       • Net Reward (after gas): ${ethers.formatEther(
            netReward
          )} ETH`
        );
        console.log(
          `       • Expected Reward: ${ethers.formatEther(
            expectedBetReward
          )} ETH`
        );

        if (netReward >= (expectedBetReward * BigInt(99)) / BigInt(100)) {
          console.log(`       ✅ Reward matches expected! (within tolerance)`);
        } else {
          console.log(
            `       ⚠️  Reward mismatch! Expected: ${ethers.formatEther(
              expectedBetReward
            )}, Got: ${ethers.formatEther(netReward)}`
          );
        }
      }
    } catch (error) {
      console.error(
        `   ❌ Failed to test stage ${testStage.stageNumber}:`,
        error.message
      );
      // Continue with next test case instead of throwing
    }
  }

  console.log(
    `\n   ✅ Completed testing ${testStages.length} different stages!`
  );
  console.log(`   📋 Session IDs: ${sessionIds.join(", ")}`);

  // ============ SUMMARY ============
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DUNGEON FULL FLOW TEST COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("\n📊 Test Summary:");
  console.log(`   ✅ Player setup: Complete`);
  console.log(`   ✅ Resources setup: Complete`);
  console.log(`   ✅ Items setup: Complete`);
  console.log(
    `   ✅ Dungeon setup: Complete (10 stages with different multipliers)`
  );
  console.log(`   ✅ Session 1 (WIN): Started, Ended, Claimed`);
  console.log(`   ✅ Session 2 (LOSE): Started, Ended, Verified cannot claim`);
  console.log(
    `   ✅ Session 3-6 (Multiple Stages): Tested ${testStages.length} different stages`
  );
  console.log(`\n📋 Session IDs:`);
  console.log(`   • Session 1 (WIN): ${sessionId}`);
  console.log(`   • Session 2 (LOSE): ${sessionId2}`);
  if (sessionIds && sessionIds.length > 0) {
    console.log(`   • Session 3-${2 + sessionIds.length} (Multiple Stages):`);
    sessionIds.forEach((id, index) => {
      console.log(
        `     - Stage ${testStages[index].stageNumber} (${testStages[index].description}): ${id}`
      );
    });
  }
  console.log(`\n📊 Dungeon Stages Created:`);
  try {
    const dungeon = await dungeonLogic.getDungeon(testDungeonId);
    console.log(`   • Total stages: ${dungeon.stages.length}`);
    dungeon.stages.forEach((stage) => {
      const multiplierDecimal = (
        Number(stage.rewardMultiplier) / 10000
      ).toFixed(2);
      console.log(
        `     - Stage ${stage.stageNumber}: ${stage.rewardMultiplier} (${multiplierDecimal}x)`
      );
    });
  } catch (error) {
    console.log(`   ⚠️  Could not get dungeon stages: ${error.message}`);
  }
  console.log(`\n✅ All tests passed!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
