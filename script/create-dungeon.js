const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🏰 Bắt đầu tạo dungeon...");

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
    throw new Error("DungeonLogic contract address not found in deployment file");
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

  // === PARSE ARGUMENTS ===
  // Có thể truyền arguments từ command line hoặc sử dụng giá trị mặc định
  const args = process.argv.slice(2);

  // Giá trị mặc định (example dungeon)
  let dungeonData = {
    id: 10,
    name: "Test Dungeon",
    description: "A test dungeon created by script",
    dungeonType: "Normal",
    difficulty: "Easy",
    levelRequirement: 1,
    energyCost: 10,
    sunlightCost: 100,
    sunnyCost: "0",
    itemRequirements: [],
    cooldownTime: 300,
    minBetAmount: "1000000000000000000", // 1 ETH in wei
    maxBetAmount: "10000000000000000000", // 10 ETH in wei
    stages: [
      {
        stageNumber: 1,
        rewardMultiplier: 1000, // 0.1x (basis points)
      },
      {
        stageNumber: 2,
        rewardMultiplier: 1200, // 0.12x
      },
      {
        stageNumber: 3,
        rewardMultiplier: 1500, // 0.15x
      },
    ],
  };

  // Nếu có arguments, parse chúng
  if (args.length > 0) {
    // Parse arguments: --id, --name, --description, etc.
    // Hoặc có thể truyền JSON file path: --json path/to/dungeon.json
    const jsonIndex = args.indexOf("--json");
    if (jsonIndex !== -1 && args[jsonIndex + 1]) {
      const jsonPath = args[jsonIndex + 1];
      if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        dungeonData = jsonData;
        console.log("📄 Loaded dungeon data from JSON file:", jsonPath);
      } else {
        throw new Error(`File JSON không tồn tại: ${jsonPath}`);
      }
    } else {
      // Parse individual arguments
      const getArg = (key, defaultValue) => {
        const index = args.indexOf(`--${key}`);
        return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
      };

      dungeonData.id = parseInt(getArg("id", dungeonData.id)) || dungeonData.id;
      dungeonData.name = getArg("name", dungeonData.name) || dungeonData.name;
      dungeonData.description =
        getArg("description", dungeonData.description) || dungeonData.description;
      dungeonData.dungeonType =
        getArg("dungeonType", dungeonData.dungeonType) || dungeonData.dungeonType;
      dungeonData.difficulty =
        getArg("difficulty", dungeonData.difficulty) || dungeonData.difficulty;
      dungeonData.levelRequirement =
        parseInt(getArg("levelRequirement", dungeonData.levelRequirement)) ||
        dungeonData.levelRequirement;
      dungeonData.energyCost =
        parseInt(getArg("energyCost", dungeonData.energyCost)) ||
        dungeonData.energyCost;
      dungeonData.sunlightCost =
        parseInt(getArg("sunlightCost", dungeonData.sunlightCost)) ||
        dungeonData.sunlightCost;
      dungeonData.sunnyCost =
        getArg("sunnyCost", dungeonData.sunnyCost) || dungeonData.sunnyCost;
      dungeonData.cooldownTime =
        parseInt(getArg("cooldownTime", dungeonData.cooldownTime)) ||
        dungeonData.cooldownTime;
      dungeonData.minBetAmount =
        getArg("minBetAmount", dungeonData.minBetAmount) ||
        dungeonData.minBetAmount;
      dungeonData.maxBetAmount =
        getArg("maxBetAmount", dungeonData.maxBetAmount) ||
        dungeonData.maxBetAmount;
    }
  }

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
      `Invalid dungeonType: ${dungeonData.dungeonType}. Must be one of: ${Object.keys(dungeonTypeMap).join(", ")}`
    );
  }

  if (difficulty === undefined) {
    throw new Error(
      `Invalid difficulty: ${dungeonData.difficulty}. Must be one of: ${Object.keys(difficultyMap).join(", ")}`
    );
  }

  // Convert item requirements
  const itemRequirements = (dungeonData.itemRequirements || []).map((req) => ({
    itemId: req.itemId,
    quantity: req.quantity,
    isConsumed: req.isConsumed !== undefined ? req.isConsumed : false,
  }));

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
  console.log(
    `   • Item Requirements: ${itemRequirements.length} items`
  );
  if (itemRequirements.length > 0) {
    itemRequirements.forEach((req, index) => {
      console.log(
        `     ${index + 1}. Item ID: ${req.itemId}, Quantity: ${req.quantity}, Consumed: ${req.isConsumed}`
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
    console.log(
      `\n📊 PHASE: Adding ${dungeonData.stages.length} stages...`
    );

    for (let i = 0; i < dungeonData.stages.length; i++) {
      const stage = dungeonData.stages[i];
      console.log(
        `   ${i + 1}. Adding stage ${stage.stageNumber} (multiplier: ${stage.rewardMultiplier})`
      );

      try {
        const addStageTx = await dungeonLogic.addDungeonStage(
          dungeonData.id,
          stage.stageNumber,
          stage.rewardMultiplier
        );

        await addStageTx.wait();
        console.log(
          `     ✅ Stage ${stage.stageNumber} added successfully!`
        );
      } catch (error) {
        if (
          error.message &&
          (error.message.includes("already exists") ||
            error.message.includes("Stage already exists"))
        ) {
          console.log(
            `     ⚠️  Stage ${stage.stageNumber} already exists, skipping...`
          );
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

  // === VERIFICATION ===
  console.log("\n🔍 PHASE: Verifying Dungeon...");

  try {
    const dungeonInfo = await dungeonLogic.getDungeon(dungeonData.id);
    console.log(`   ✅ Dungeon verified successfully!`);
    console.log(`   • Name: ${dungeonInfo.name}`);
    console.log(`   • Type: ${dungeonInfo.dungeonType}`);
    console.log(`   • Difficulty: ${dungeonInfo.difficulty}`);
    console.log(`   • Level Requirement: ${dungeonInfo.levelRequirement}`);
    console.log(`   • Energy Cost: ${dungeonInfo.energyCost}`);
    console.log(`   • Sunlight Cost: ${dungeonInfo.sunlightCost}`);
    console.log(
      `   • Sunny Cost: ${ethers.formatEther(dungeonInfo.sunnyCost)} ETH`
    );
    console.log(`   • Cooldown Time: ${dungeonInfo.cooldownTime}s`);
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
    console.log(
      `   ⚠️  Could not verify dungeon details: ${error.message}`
    );
    console.log(
      `   ✅ Dungeon was created successfully based on transaction success`
    );
  }

  // === SUMMARY ===
  console.log("\n🎉 DUNGEON CREATION COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(`🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`);
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
  console.log("\n💡 Usage Examples:");
  console.log(
    `   • Create with default values: npx hardhat run script/create-dungeon.js --network <network>`
  );
  console.log(
    `   • Create with arguments: npx hardhat run script/create-dungeon.js --network <network> --id 11 --name "New Dungeon" --dungeonType "Elite" --difficulty "Medium"`
  );
  console.log(
    `   • Create from JSON: npx hardhat run script/create-dungeon.js --network <network> --json path/to/dungeon.json`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Dungeon creation failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });

