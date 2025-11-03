const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🏰 Bắt đầu setup dungeons từ JSON...");

    // Lấy signer và network info
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("📝 Deployer address:", deployer.address);
    console.log("🌐 Network:", network.name);
    console.log("🔗 Chain ID:", Number(network.chainId));

    // Đọc file JSON
    const jsonPath = path.join(__dirname, "data", "dungeons.json");
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`File JSON không tồn tại: ${jsonPath}`);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const dungeons = jsonData.dungeons;

    console.log(`📊 Tìm thấy ${dungeons.length} dungeons trong file JSON`);

    // Lấy contract addresses từ file deployment
    const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;
    if (!fs.existsSync(deploymentPath)) {
        throw new Error(`File deployment không tồn tại: ${deploymentPath}`);
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const contracts = deploymentData.contracts;

    console.log("📋 Contract addresses loaded from deployment file");

    // Lấy DungeonLogic contract
    const DungeonLogic = await ethers.getContractFactory("DungeonLogic");
    const dungeonLogic = DungeonLogic.attach(contracts.DungeonLogic);

    console.log("🔗 Connected to DungeonLogic:", contracts.DungeonLogic);

    // Kiểm tra quyền admin
    const isAdmin = await dungeonLogic.world().then(worldAddress => {
        const World = new ethers.Contract(worldAddress, [
            "function isAdmin(address) view returns (bool)"
        ], deployer);
        return World.isAdmin(deployer.address);
    });

    if (!isAdmin) {
        throw new Error("Deployer không có quyền admin");
    }

    console.log("✅ Deployer có quyền admin");

    // Setup từng dungeon
    for (let i = 0; i < dungeons.length; i++) {
        const dungeon = dungeons[i];
        console.log(`\n🏰 Setting up dungeon ${i + 1}/${dungeons.length}: ${dungeon.name}`);

        try {
            // Chuyển đổi enum values
            const dungeonType = _convertDungeonType(dungeon.dungeonType);
            const difficulty = _convertDifficulty(dungeon.difficulty);

            // Chuyển đổi item requirements
            const itemRequirements = dungeon.itemRequirements.map(req => ({
                itemId: req.itemId,
                quantity: req.quantity,
                isConsumed: req.isConsumed
            }));

            // Tạo dungeon
            console.log(`   📝 Creating dungeon: ${dungeon.name}`);
            const createTx = await dungeonLogic.createDungeon(
                dungeon.dungeonId,
                dungeon.name,
                dungeon.description,
                dungeonType,
                difficulty,
                dungeon.levelRequirement,
                dungeon.energyCost,
                dungeon.sunlightCost,
                dungeon.sunnyCost,
                itemRequirements,
                dungeon.cooldownTime,
                dungeon.minBetAmount,
                dungeon.maxBetAmount
            );
            await createTx.wait();
            console.log(`   ✅ Dungeon created: ${dungeon.name}`);

            // Thêm các stages
            console.log(`   📝 Adding ${dungeon.stages.length} stages...`);
            for (const stage of dungeon.stages) {
                const stageTx = await dungeonLogic.addDungeonStage(
                    dungeon.dungeonId,
                    stage.stageNumber,
                    stage.rewardMultiplier
                );
                await stageTx.wait();
                console.log(`     ✅ Stage ${stage.stageNumber} added (multiplier: ${stage.rewardMultiplier})`);
            }

            // Set active status
            if (dungeon.isActive !== undefined) {
                const activeTx = await dungeonLogic.setDungeonActive(dungeon.dungeonId, dungeon.isActive);
                await activeTx.wait();
                console.log(`   ✅ Dungeon active status set to: ${dungeon.isActive}`);
            }

            // Set paused status
            if (dungeon.isPaused !== undefined) {
                const pausedTx = await dungeonLogic.setDungeonPaused(dungeon.dungeonId, dungeon.isPaused);
                await pausedTx.wait();
                console.log(`   ✅ Dungeon paused status set to: ${dungeon.isPaused}`);
            }

            console.log(`   🎉 Dungeon ${dungeon.name} setup completed!`);

        } catch (error) {
            console.error(`   ❌ Error setting up dungeon ${dungeon.name}:`, error.message);
            throw error;
        }
    }

    // Verify setup
    console.log("\n🔍 Verifying dungeon setup...");
    const allDungeonIds = await dungeonLogic.getAllDungeonIds();
    console.log(`📊 Total dungeons created: ${allDungeonIds.length}`);

    for (const dungeonId of allDungeonIds) {
        const dungeon = await dungeonLogic.getDungeon(dungeonId);
        console.log(`   🏰 Dungeon ${dungeonId}: ${dungeon.name} (${dungeon.difficulty})`);
    }

    // Lưu setup info
    const setupInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        dungeonsSetup: dungeons.length,
        dungeonIds: allDungeonIds,
        setupData: dungeons
    };

    const setupPath = `./deployed/dungeon-setup-${network.name}.json`;
    fs.writeFileSync(setupPath, JSON.stringify(setupInfo, null, 2));
    console.log(`\n💾 Setup info saved to: ${setupPath}`);

    console.log("\n🎉 DUNGEON SETUP COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(`📊 Total dungeons setup: ${dungeons.length}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log("\n🏰 Dungeons created:");
    for (const dungeon of dungeons) {
        console.log(`   • ${dungeon.name} (ID: ${dungeon.dungeonId}, Difficulty: ${dungeon.difficulty})`);
    }
}

/**
 * Chuyển đổi dungeon type từ string sang enum
 */
function _convertDungeonType(type) {
    const types = {
        "NORMAL": 0,
        "BOSS": 1,
        "SPECIAL": 2,
        "EVENT": 3
    };
    return types[type] !== undefined ? types[type] : 0;
}

/**
 * Chuyển đổi difficulty từ string sang enum
 */
function _convertDifficulty(difficulty) {
    const difficulties = {
        "EASY": 0,
        "MEDIUM": 1,
        "HARD": 2,
        "EXTREME": 3
    };
    return difficulties[difficulty] !== undefined ? difficulties[difficulty] : 0;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Setup failed:", error);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    });
