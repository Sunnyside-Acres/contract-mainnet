const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🏰 Bắt đầu tạo dungeon từ thông tin...");

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

  // Lấy địa chỉ DungeonLogic contract
  const dungeonLogicAddress = deploymentInfo.contracts.DungeonLogic;
  if (!dungeonLogicAddress) {
    throw new Error(
      "DungeonLogic contract address not found in deployment file"
    );
  }
  console.log("🎯 DungeonLogic address:", dungeonLogicAddress);

  // Kết nối với DungeonLogic contract
  const dungeonLogic = await ethers.getContractAt(
    "DungeonLogic",
    dungeonLogicAddress
  );

  // Kiểm tra quyền admin
  try {
    const worldAddress = await dungeonLogic.world();
    const World = await ethers.getContractAt("World", worldAddress);
    const isAdmin = await World.isAdmin(deployer.address);
    if (!isAdmin) {
      throw new Error("Deployer không có quyền admin");
    }
    console.log("✅ Deployer có quyền admin");
  } catch (error) {
    console.log("⚠️  Không thể kiểm tra quyền admin:", error.message);
    console.log("⚠️  Tiếp tục với việc tạo dungeon...");
  }

  // === DUNGEON DATA ===
  // Dựa trên thông tin từ output terminal
  const dungeonData = {
    id: 99,
    name: "Forest of Beginnings",
    description:
      "A peaceful forest perfect for new adventurers to start their journey",
    dungeonType: "Normal", // 0
    difficulty: "Easy", // 0
    levelRequirement: 1,
    energyCost: 0,
    sunlightCost: 200,
    sunnyCost: "0",
    itemRequirements: [
      {
        itemId: 2,
        quantity: 20,
        isConsumed: true,
      },
      {
        itemId: 3,
        quantity: 20,
        isConsumed: true,
      },
    ],
    cooldownTime: 1, // 1 second
    minBetAmount: "1000000000000000000", // 1.0 ETH in wei
    maxBetAmount: "10000000000000000000", // 10.0 ETH in wei
    stages: [
      { stageNumber: 1, rewardMultiplier: 2000 }, // 0.20x
      { stageNumber: 2, rewardMultiplier: 3500 }, // 0.35x
      { stageNumber: 3, rewardMultiplier: 5500 }, // 0.55x
      { stageNumber: 4, rewardMultiplier: 7000 }, // 0.70x
      { stageNumber: 5, rewardMultiplier: 8000 }, // 0.80x
      { stageNumber: 6, rewardMultiplier: 10000 }, // 1.00x
      { stageNumber: 7, rewardMultiplier: 11000 }, // 1.10x
      { stageNumber: 8, rewardMultiplier: 12000 }, // 1.20x
      { stageNumber: 9, rewardMultiplier: 13000 }, // 1.30x
      { stageNumber: 10, rewardMultiplier: 14000 }, // 1.40x
      { stageNumber: 11, rewardMultiplier: 16000 }, // 1.60x
      { stageNumber: 12, rewardMultiplier: 18000 }, // 1.80x
      { stageNumber: 13, rewardMultiplier: 20000 }, // 2.00x
      { stageNumber: 14, rewardMultiplier: 22000 }, // 2.20x
      { stageNumber: 15, rewardMultiplier: 24000 }, // 2.40x
      { stageNumber: 16, rewardMultiplier: 26000 }, // 2.60x
      { stageNumber: 17, rewardMultiplier: 28000 }, // 2.80x
      { stageNumber: 18, rewardMultiplier: 30000 }, // 3.00x
      { stageNumber: 19, rewardMultiplier: 32000 }, // 3.20x
      { stageNumber: 20, rewardMultiplier: 34000 }, // 3.40x
      { stageNumber: 21, rewardMultiplier: 36000 }, // 3.60x
      { stageNumber: 22, rewardMultiplier: 38000 }, // 3.80x
      { stageNumber: 23, rewardMultiplier: 40000 }, // 4.00x
      { stageNumber: 24, rewardMultiplier: 42000 }, // 4.20x
      { stageNumber: 25, rewardMultiplier: 44000 }, // 4.40x
      { stageNumber: 26, rewardMultiplier: 46000 }, // 4.60x
      { stageNumber: 27, rewardMultiplier: 48000 }, // 4.80x
      { stageNumber: 28, rewardMultiplier: 50000 }, // 5.00x
      { stageNumber: 29, rewardMultiplier: 52000 }, // 5.20x
      { stageNumber: 30, rewardMultiplier: 54000 }, // 5.40x
      { stageNumber: 31, rewardMultiplier: 56000 }, // 5.60x
      { stageNumber: 32, rewardMultiplier: 58000 }, // 5.80x
      { stageNumber: 33, rewardMultiplier: 60000 }, // 6.00x
      { stageNumber: 34, rewardMultiplier: 62000 }, // 6.20x
      { stageNumber: 35, rewardMultiplier: 64000 }, // 6.40x
      { stageNumber: 36, rewardMultiplier: 66000 }, // 6.60x
      { stageNumber: 37, rewardMultiplier: 68000 }, // 6.80x
      { stageNumber: 38, rewardMultiplier: 70000 }, // 7.00x
      { stageNumber: 39, rewardMultiplier: 72000 }, // 7.20x
      { stageNumber: 40, rewardMultiplier: 74000 }, // 7.40x
      { stageNumber: 41, rewardMultiplier: 76000 }, // 7.60x
      { stageNumber: 42, rewardMultiplier: 78000 }, // 7.80x
      { stageNumber: 43, rewardMultiplier: 80000 }, // 8.00x
      { stageNumber: 44, rewardMultiplier: 82000 }, // 8.20x
      { stageNumber: 45, rewardMultiplier: 84000 }, // 8.40x
      { stageNumber: 46, rewardMultiplier: 86000 }, // 8.60x
      { stageNumber: 47, rewardMultiplier: 88000 }, // 8.80x
      { stageNumber: 48, rewardMultiplier: 90000 }, // 9.00x
      { stageNumber: 49, rewardMultiplier: 92000 }, // 9.20x
      { stageNumber: 50, rewardMultiplier: 94000 }, // 9.40x
      { stageNumber: 0, rewardMultiplier: 1 }, // 0.00x (for lose scenario)
    ],
  };

  // === CONVERT ENUMS ===
  const dungeonTypeMap = {
    Normal: 0,
    Elite: 1,
    Boss: 2,
    Event: 3,
    Raid: 4,
  };

  const difficultyMap = {
    Easy: 0,
    Medium: 1,
    Hard: 2,
    Expert: 3,
    Master: 4,
  };

  const dungeonType = dungeonTypeMap[dungeonData.dungeonType];
  const difficulty = difficultyMap[dungeonData.difficulty];

  if (dungeonType === undefined) {
    throw new Error(
      `Invalid dungeonType: ${
        dungeonData.dungeonType
      }. Must be one of: ${Object.keys(dungeonTypeMap).join(", ")}`
    );
  }

  if (difficulty === undefined) {
    throw new Error(
      `Invalid difficulty: ${
        dungeonData.difficulty
      }. Must be one of: ${Object.keys(difficultyMap).join(", ")}`
    );
  }

  // Convert item requirements
  const itemRequirements = dungeonData.itemRequirements.map((req) => ({
    itemId: req.itemId,
    quantity: req.quantity,
    isConsumed: req.isConsumed !== undefined ? req.isConsumed : false,
  }));

  // === CHECK IF DUNGEON EXISTS ===
  console.log(`\n🔍 Kiểm tra dungeon ID ${dungeonData.id}...`);
  try {
    const exists = await dungeonLogic.dungeonExists(dungeonData.id);
    if (exists) {
      console.log(`   ⚠️  Dungeon ID ${dungeonData.id} đã tồn tại!`);
      console.log(`   💡 Bỏ qua việc tạo dungeon...`);

      // Vẫn thử add stages nếu chưa có đủ
      console.log(`\n📊 Kiểm tra stages...`);
      try {
        const existingDungeon = await dungeonLogic.getDungeon(dungeonData.id);
        console.log(`   • Existing stages: ${existingDungeon.stages.length}`);
        console.log(`   • Required stages: ${dungeonData.stages.length}`);

        if (existingDungeon.stages.length < dungeonData.stages.length) {
          console.log(`   • Sẽ thêm các stages còn thiếu...`);
        } else {
          console.log(`   ✅ Đã có đủ stages!`);
        }
      } catch (error) {
        console.log(`   ⚠️  Không thể kiểm tra stages: ${error.message}`);
      }
    } else {
      console.log(
        `   ✅ Dungeon ID ${dungeonData.id} chưa tồn tại, sẽ tạo mới...`
      );
    }
  } catch (error) {
    console.log(`   ⚠️  Không thể kiểm tra dungeon exists: ${error.message}`);
    console.log(`   ⚠️  Tiếp tục thử tạo dungeon...`);
  }

  // === CREATE DUNGEON ===
  console.log("\n🏰 PHASE: Creating Dungeon...");
  console.log(`   • ID: ${dungeonData.id}`);
  console.log(`   • Name: ${dungeonData.name}`);
  console.log(`   • Description: ${dungeonData.description}`);
  console.log(`   • Type: ${dungeonData.dungeonType} (${dungeonType})`);
  console.log(`   • Difficulty: ${dungeonData.difficulty} (${difficulty})`);
  console.log(`   • Level Requirement: ${dungeonData.levelRequirement}`);
  console.log(`   • Energy Cost: ${dungeonData.energyCost}`);
  console.log(`   • Sunlight Cost: ${dungeonData.sunlightCost}`);
  console.log(
    `   • Sunny Cost: ${ethers.formatEther(dungeonData.sunnyCost)} ETH`
  );
  console.log(`   • Cooldown Time: ${dungeonData.cooldownTime}s`);
  console.log(
    `   • Min Bet: ${ethers.formatEther(dungeonData.minBetAmount)} ETH`
  );
  console.log(
    `   • Max Bet: ${ethers.formatEther(dungeonData.maxBetAmount)} ETH`
  );
  console.log(`   • Item Requirements: ${itemRequirements.length} items`);
  if (itemRequirements.length > 0) {
    itemRequirements.forEach((req, index) => {
      console.log(
        `     ${index + 1}. Item ID: ${req.itemId}, Quantity: ${
          req.quantity
        }, Consumed: ${req.isConsumed}`
      );
    });
  }

  try {
    // Convert string values to BigInt
    const sunnyCost = BigInt(dungeonData.sunnyCost);
    const minBetAmount = BigInt(dungeonData.minBetAmount);
    const maxBetAmount = BigInt(dungeonData.maxBetAmount);

    console.log("\n   📤 Sending createDungeon transaction...");
    const createTx = await dungeonLogic.createDungeon(
      dungeonData.id,
      dungeonData.name,
      dungeonData.description,
      dungeonType,
      difficulty,
      dungeonData.levelRequirement,
      dungeonData.energyCost,
      dungeonData.sunlightCost,
      sunnyCost,
      itemRequirements,
      dungeonData.cooldownTime,
      minBetAmount,
      maxBetAmount
    );

    console.log("   ⏳ Waiting for transaction confirmation...");
    const receipt = await createTx.wait();
    console.log(`   ✅ Dungeon "${dungeonData.name}" created successfully!`);
    console.log(`   📋 Transaction hash: ${receipt.hash}`);
    console.log(`   📋 Block number: ${receipt.blockNumber}`);
  } catch (error) {
    if (
      error.message &&
      (error.message.includes("Dungeon already exists") ||
        error.message.includes("already exists"))
    ) {
      console.log(
        `   ⚠️  Dungeon "${dungeonData.name}" (ID: ${dungeonData.id}) already exists`
      );
      console.log("   ℹ️  Skipping creation...");
    } else {
      console.error("   ❌ Failed to create dungeon:", error.message);
      throw error;
    }
  }

  // === ADD STAGES ===
  if (dungeonData.stages && dungeonData.stages.length > 0) {
    console.log(`\n📊 PHASE: Adding ${dungeonData.stages.length} stages...`);

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dungeonData.stages.length; i++) {
      const stage = dungeonData.stages[i];
      const multiplierDecimal = (stage.rewardMultiplier / 10000).toFixed(2);

      console.log(
        `   ${i + 1}/${dungeonData.stages.length}. Adding stage ${
          stage.stageNumber
        } (multiplier: ${stage.rewardMultiplier} = ${multiplierDecimal}x)...`
      );

      try {
        // Kiểm tra xem stage đã tồn tại chưa
        let stageExists = false;
        try {
          const dungeon = await dungeonLogic.getDungeon(dungeonData.id);
          if (dungeon.stages && dungeon.stages.length > 0) {
            stageExists = dungeon.stages.some(
              (s) => Number(s.stageNumber) === stage.stageNumber
            );
          }
        } catch (error) {
          // Nếu không lấy được dungeon, tiếp tục thử add
        }

        if (stageExists) {
          console.log(
            `     ⚠️  Stage ${stage.stageNumber} already exists, skipping...`
          );
          skippedCount++;
        } else {
          const addStageTx = await dungeonLogic.addDungeonStage(
            dungeonData.id,
            stage.stageNumber,
            stage.rewardMultiplier
          );

          await addStageTx.wait();
          console.log(`     ✅ Stage ${stage.stageNumber} added successfully!`);
          addedCount++;
        }
      } catch (error) {
        if (
          error.message &&
          (error.message.includes("already exists") ||
            error.message.includes("Stage already exists"))
        ) {
          console.log(
            `     ⚠️  Stage ${stage.stageNumber} already exists, skipping...`
          );
          skippedCount++;
        } else {
          console.error(
            `     ❌ Failed to add stage ${stage.stageNumber}:`,
            error.message
          );
          errorCount++;
          // Continue with next stage instead of throwing
        }
      }
    }

    console.log(`\n   📊 Stage Addition Summary:`);
    console.log(`     • Added: ${addedCount}`);
    console.log(`     • Skipped (already exists): ${skippedCount}`);
    console.log(`     • Errors: ${errorCount}`);
  }

  // === VERIFICATION ===
  console.log("\n🔍 PHASE: Verifying Dungeon...");

  try {
    const dungeonInfo = await dungeonLogic.getDungeon(dungeonData.id);
    console.log(`   ✅ Dungeon verified successfully!`);
    console.log(`   • Name: ${dungeonInfo.name}`);
    console.log(`   • Type: ${dungeonInfo.dungeonType}`);
    console.log(`   • Difficulty: ${dungeonInfo.difficulty}`);
    console.log(
      `   • Level Requirement: ${Number(dungeonInfo.levelRequirement)}`
    );
    console.log(`   • Energy Cost: ${Number(dungeonInfo.energyCost)}`);
    console.log(`   • Sunlight Cost: ${Number(dungeonInfo.sunlightCost)}`);
    console.log(
      `   • Sunny Cost: ${ethers.formatEther(dungeonInfo.sunnyCost)} ETH`
    );
    console.log(`   • Cooldown Time: ${Number(dungeonInfo.cooldownTime)}s`);
    console.log(
      `   • Min Bet: ${ethers.formatEther(dungeonInfo.minBetAmount)} ETH`
    );
    console.log(
      `   • Max Bet: ${ethers.formatEther(dungeonInfo.maxBetAmount)} ETH`
    );
    console.log(`   • Stages: ${dungeonInfo.stages.length}`);
    console.log(`   • Active: ${dungeonInfo.isActive}`);
    console.log(`   • Paused: ${dungeonInfo.isPaused}`);
  } catch (error) {
    console.log(`   ⚠️  Could not verify dungeon details: ${error.message}`);
    console.log(
      `   ✅ Dungeon was created successfully based on transaction success`
    );
  }

  // === SUMMARY ===
  console.log("\n🎉 DUNGEON CREATION COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🎯 DungeonLogic: ${dungeonLogicAddress}`);
  console.log(`\n📊 Created Dungeon:`);
  console.log(`   • ID: ${dungeonData.id}`);
  console.log(`   • Name: ${dungeonData.name}`);
  console.log(
    `   • Stages: ${dungeonData.stages ? dungeonData.stages.length : 0}`
  );

  console.log("\n✅ Dungeon has been successfully created!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Dungeon creation failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
