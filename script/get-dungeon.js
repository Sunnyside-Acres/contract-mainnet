const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🏰 Bắt đầu lấy thông tin dungeon...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", Number(network.chainId));

  // Parse arguments
  const args = process.argv.slice(2);
  const dungeonId = args.length > 0 ? parseInt(args[0]) : 99;

  console.log(`\n🎯 Lấy thông tin dungeon ID: ${dungeonId}`);

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

  // Kiểm tra dungeon có tồn tại không
  console.log(`\n🔍 Kiểm tra dungeon ID ${dungeonId}...`);
  try {
    const exists = await dungeonLogic.dungeonExists(dungeonId);
    if (!exists) {
      console.log(`   ❌ Dungeon ID ${dungeonId} không tồn tại!`);
      process.exit(1);
    }
    console.log(`   ✅ Dungeon ID ${dungeonId} tồn tại!`);
  } catch (error) {
    console.log(`   ⚠️  Không thể kiểm tra dungeon exists: ${error.message}`);
    console.log(`   ⚠️  Tiếp tục thử lấy thông tin...`);
  }

  // Lấy thông tin dungeon
  console.log(`\n📋 Lấy thông tin dungeon ID ${dungeonId}...`);
  try {
    const dungeon = await dungeonLogic.getDungeon(dungeonId);

    console.log("\n" + "=".repeat(60));
    console.log(`🏰 DUNGEON INFORMATION (ID: ${dungeonId})`);
    console.log("=".repeat(60));

    // Basic Info
    console.log("\n📝 Basic Information:");
    console.log(`   • ID: ${Number(dungeon.id)}`);
    console.log(`   • Name: ${dungeon.name}`);
    console.log(`   • Description: ${dungeon.description}`);

    // Type & Difficulty
    const dungeonTypeMap = {
      0: "Normal",
      1: "Elite",
      2: "Boss",
      3: "Event",
      4: "Raid",
    };
    const difficultyMap = {
      0: "Easy",
      1: "Medium",
      2: "Hard",
      3: "Expert",
      4: "Master",
    };
    console.log(
      `   • Type: ${
        dungeonTypeMap[dungeon.dungeonType] || dungeon.dungeonType
      } (${dungeon.dungeonType})`
    );
    console.log(
      `   • Difficulty: ${
        difficultyMap[dungeon.difficulty] || dungeon.difficulty
      } (${dungeon.difficulty})`
    );

    // Requirements
    console.log("\n📊 Requirements:");
    console.log(`   • Level Requirement: ${Number(dungeon.levelRequirement)}`);
    console.log(`   • Energy Cost: ${Number(dungeon.energyCost)}`);
    console.log(`   • Sunlight Cost: ${Number(dungeon.sunlightCost)}`);
    console.log(
      `   • Sunny Cost: ${ethers.formatEther(dungeon.sunnyCost)} ETH`
    );
    const cooldownTime = Number(dungeon.cooldownTime);
    console.log(
      `   • Cooldown Time: ${cooldownTime}s (${(cooldownTime / 60).toFixed(
        1
      )} minutes)`
    );

    // Item Requirements
    console.log(`\n📦 Item Requirements (${dungeon.itemRequirements.length}):`);
    if (dungeon.itemRequirements.length === 0) {
      console.log("   • No item requirements");
    } else {
      dungeon.itemRequirements.forEach((req, index) => {
        console.log(
          `   ${index + 1}. Item ID: ${Number(req.itemId)}, Quantity: ${Number(
            req.quantity
          )}, Consumed: ${req.isConsumed}`
        );
      });
    }

    // Betting
    console.log("\n💰 Betting:");
    console.log(
      `   • Min Bet: ${ethers.formatEther(dungeon.minBetAmount)} ETH`
    );
    console.log(
      `   • Max Bet: ${ethers.formatEther(dungeon.maxBetAmount)} ETH`
    );

    // Stages
    console.log(`\n🎮 Stages (${dungeon.stages.length}):`);
    if (dungeon.stages.length === 0) {
      console.log("   • No stages configured");
    } else {
      dungeon.stages.forEach((stage, index) => {
        const rewardMultiplier = Number(stage.rewardMultiplier);
        const stageNumber = Number(stage.stageNumber);
        const multiplierDecimal = (rewardMultiplier / 10000).toFixed(2);
        console.log(
          `   ${
            index + 1
          }. Stage ${stageNumber}: multiplier ${rewardMultiplier} (${multiplierDecimal}x), active: ${
            stage.isActive
          }`
        );
      });
    }

    // Status
    console.log("\n⚙️  Status:");
    console.log(`   • Active: ${dungeon.isActive}`);
    console.log(`   • Paused: ${dungeon.isPaused}`);
    console.log(
      `   • Created At: ${new Date(
        Number(dungeon.createdAt) * 1000
      ).toISOString()}`
    );
    console.log(
      `   • Updated At: ${new Date(
        Number(dungeon.updatedAt) * 1000
      ).toISOString()}`
    );

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`   • Total Stages: ${dungeon.stages.length}`);
    console.log(
      `   • Total Item Requirements: ${dungeon.itemRequirements.length}`
    );
    console.log(
      `   • Status: ${
        dungeon.isActive
          ? dungeon.isPaused
            ? "⏸️  Paused"
            : "✅ Active"
          : "❌ Inactive"
      }`
    );

    console.log("\n✅ Lấy thông tin dungeon thành công!");
  } catch (error) {
    if (
      error.message &&
      (error.message.includes("does not exist") ||
        error.message.includes("Dungeon does not exist"))
    ) {
      console.log(`   ❌ Dungeon ID ${dungeonId} không tồn tại!`);
      console.log(`   💡 Hãy kiểm tra lại dungeon ID hoặc tạo dungeon mới.`);
    } else {
      console.error("   ❌ Failed to get dungeon:", error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
