const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🏪 Bắt đầu setup sample NPC markets (Native)...");

    // Lấy signer và network info
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("📝 Admin address:", deployer.address);
    console.log("🌐 Network:", network.name);

    // Lấy contract addresses từ file deployment
    const deploymentPath = `./deployed/npcmarketnative-deployment-${network.name}.json`;
    if (!fs.existsSync(deploymentPath)) {
        throw new Error(
            `File deployment không tồn tại: ${deploymentPath}\nVui lòng chạy deploy-npcmarketnative-contracts.js trước`
        );
    }

    const deploymentData = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
    );
    const contracts = deploymentData.contracts;

    // Lấy World address từ main deployment file
    const mainDeploymentPath = `./deployed/contract-addresses-${network.name}.json`;
    if (!fs.existsSync(mainDeploymentPath)) {
        throw new Error(
            `File main deployment không tồn tại: ${mainDeploymentPath}\nVui lòng chạy deploy-all-contracts.js trước`
        );
    }

    const mainDeploymentData = JSON.parse(
        fs.readFileSync(mainDeploymentPath, "utf8")
    );
    const mainContracts = mainDeploymentData.contracts;
    const worldAddress = mainContracts.World;

    // Lấy NPCMarketNativeLogic contract
    const NPCMarketNativeLogic = await ethers.getContractFactory(
        "NPCMarketNativeLogic"
    );
    const npcMarketNativeLogic = NPCMarketNativeLogic.attach(
        contracts.NPCMarketNativeLogic
    );

    console.log(
        "🔗 Connected to NPCMarketNativeLogic:",
        contracts.NPCMarketNativeLogic
    );

    // Kiểm tra quyền admin
    const World = await ethers.getContractFactory("World");
    const world = World.attach(worldAddress);

    const isAdmin = await world.isAdmin(deployer.address);
    if (!isAdmin) {
        throw new Error("Deployer không có quyền admin");
    }

    console.log("✅ Admin có quyền admin");

    // Kiểm tra Logic đã được register trong World chưa (cần để gọi Component)
    console.log("\n🔍 Checking if NPCMarketNativeLogic is registered in World...");
    const isLogicRegistered = await world.isLogicRegistered(contracts.NPCMarketNativeLogic);
    if (!isLogicRegistered) {
        console.log("⚠️ NPCMarketNativeLogic chưa được register trong World");
        console.log("   Đang register NPCMarketNativeLogic trong World...");
        const registerTx = await world.registerLogic(contracts.NPCMarketNativeLogic);
        await registerTx.wait();
        console.log("✅ NPCMarketNativeLogic đã được register trong World");
    } else {
        console.log("✅ NPCMarketNativeLogic đã được register trong World");
    }

    // Sample NPC markets data
    const sampleMarkets = [
        {
            npcId: 1,
            name: "General Store",
            minTransactionAmount: ethers.parseEther("0.001"), // 0.001 ETH
            maxTransactionAmount: ethers.parseEther("10"), // 10 ETH
            items: [
                {
                    itemId: 1,
                    limitPerUser: 100, // 100 per user
                    pricePerUnit: ethers.parseEther("0.01"), // 0.01 ETH per item
                },
                {
                    itemId: 2,
                    limitPerUser: 50,
                    pricePerUnit: ethers.parseEther("0.02"),
                },
                {
                    itemId: 3,
                    limitPerUser: 0, // unlimited
                    pricePerUnit: ethers.parseEther("0.005"),
                },
            ],
        },
        {
            npcId: 2,
            name: "Blacksmith",
            minTransactionAmount: ethers.parseEther("0.01"),
            maxTransactionAmount: ethers.parseEther("50"),
            items: [
                {
                    itemId: 4,
                    limitPerUser: 20,
                    pricePerUnit: ethers.parseEther("0.1"),
                },
                {
                    itemId: 5,
                    limitPerUser: 10,
                    pricePerUnit: ethers.parseEther("0.2"),
                },
            ],
        },
        {
            npcId: 3,
            name: "Alchemist Shop",
            minTransactionAmount: ethers.parseEther("0.005"),
            maxTransactionAmount: ethers.parseEther("20"),
            items: [
                {
                    itemId: 6,
                    limitPerUser: 200,
                    pricePerUnit: ethers.parseEther("0.001"),
                },
                {
                    itemId: 7,
                    limitPerUser: 100,
                    pricePerUnit: ethers.parseEther("0.002"),
                },
            ],
        },
    ];

    // Setup từng market
    for (let i = 0; i < sampleMarkets.length; i++) {
        const market = sampleMarkets[i];
        console.log(
            `\n🏪 Setting up market ${i + 1}/${sampleMarkets.length}: ${market.name}`
        );

        try {
            // Tạo NPC market
            console.log(`   📝 Creating NPC market: ${market.name}`);
            console.log(`      NPC ID: ${market.npcId}`);
            console.log(`      Min Amount: ${ethers.formatEther(market.minTransactionAmount)} ETH`);
            console.log(`      Max Amount: ${ethers.formatEther(market.maxTransactionAmount)} ETH`);

            const createTx = await npcMarketNativeLogic.createNPCMarket(
                market.npcId,
                market.name,
                market.minTransactionAmount,
                market.maxTransactionAmount
            );
            const receipt = await createTx.wait();
            console.log(`   ✅ NPC market created: ${market.name}`);
            console.log(`      Transaction hash: ${receipt.hash}`);

            // Thêm items vào market
            console.log(`   📝 Adding ${market.items.length} items...`);
            for (const item of market.items) {
                const addItemTx = await npcMarketNativeLogic.addItemToMarket(
                    market.npcId,
                    item.itemId,
                    item.limitPerUser,
                    item.pricePerUnit,
                    true // isSelling = true (NPC is selling to player)
                );
                await addItemTx.wait();
                console.log(
                    `     ✅ Item ${item.itemId} added (price: ${ethers.formatEther(item.pricePerUnit)} ETH, limit: ${item.limitPerUser === 0 ? "unlimited" : item.limitPerUser})`
                );
            }

            console.log(`   🎉 Market ${market.name} setup completed!`);
        } catch (error) {
            console.error(
                `   ❌ Error setting up market ${market.name}:`,
                error.message
            );
            // Continue with next market
        }
    }

    // Verify setup
    console.log("\n🔍 Verifying market setup...");
    for (const market of sampleMarkets) {
        try {
            const marketInfo = await npcMarketNativeLogic.getNPCMarketInfo(
                market.npcId
            );
            console.log(
                `   🏪 Market ${market.npcId}: ${marketInfo.name} (Active: ${marketInfo.isActive}, Items: ${marketInfo.itemCount})`
            );
        } catch (error) {
            console.error(`   ❌ Error getting market ${market.npcId}:`, error.message);
        }
    }

    // Lưu setup info (convert BigInt to string để JSON.stringify)
    const setupInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        marketsSetup: sampleMarkets.length,
        markets: sampleMarkets.map(market => ({
            npcId: market.npcId,
            name: market.name,
            minTransactionAmount: market.minTransactionAmount.toString(),
            maxTransactionAmount: market.maxTransactionAmount.toString(),
            items: market.items.map(item => ({
                itemId: item.itemId,
                limitPerUser: item.limitPerUser,
                pricePerUnit: item.pricePerUnit.toString(),
            })),
        })),
    };

    const setupPath = `./deployed/npcmarketnative-setup-${network.name}.json`;
    fs.writeFileSync(setupPath, JSON.stringify(setupInfo, null, 2));
    console.log(`\n💾 Setup info saved to: ${setupPath}`);

    console.log("\n🎉 NPC MARKET NATIVE SETUP COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(`📊 Total markets setup: ${sampleMarkets.length}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`);
    console.log(`👤 Admin: ${deployer.address}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log("\n🏪 Markets created:");
    for (const market of sampleMarkets) {
        console.log(
            `   • ${market.name} (ID: ${market.npcId}, Items: ${market.items.length})`
        );
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Setup failed:", error);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    });

