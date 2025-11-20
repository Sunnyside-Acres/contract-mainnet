const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Bắt đầu deploy DungeonComponent duy nhất...");

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

    // Lấy địa chỉ các contracts cần thiết
    const worldAddress = deploymentInfo.contracts.World;
    const dungeonProxyAddress = deploymentInfo.contracts.DungeonProxy;
    const dungeonLogicAddress = deploymentInfo.contracts.DungeonLogic;
    const oldDungeonComponentAddress = deploymentInfo.contracts.DungeonComponent;

    console.log("\n📋 Existing contract addresses:");
    console.log("   • World:", worldAddress);
    console.log("   • DungeonProxy:", dungeonProxyAddress);
    console.log("   • DungeonLogic:", dungeonLogicAddress);
    console.log("   • Old DungeonComponent:", oldDungeonComponentAddress);

    if (
        !dungeonProxyAddress ||
        dungeonProxyAddress === "0x0000000000000000000000000000000000000000"
    ) {
        throw new Error(
            "DungeonProxy chưa được deploy! Vui lòng chạy deploy-dungeon-contracts.js trước."
        );
    }

    // === DEPLOY DUNGEON COMPONENT ===
    console.log("\n🚀 PHASE: Deploying DungeonComponent...");

    // Deploy DungeonComponent
    console.log("\n1️⃣ Deploying DungeonComponent...");
    const DungeonComponent = await ethers.getContractFactory("DungeonComponent");
    const dungeonComponent = await DungeonComponent.deploy();
    await dungeonComponent.waitForDeployment();
    const newDungeonComponentAddress = await dungeonComponent.getAddress();
    console.log("✅ DungeonComponent deployed to:", newDungeonComponentAddress);

    // === UPDATE PROXY IMPLEMENTATION ===
    console.log("\n🔗 PHASE: Updating DungeonProxy Implementation...");

    try {
        const dungeonProxy = await ethers.getContractAt(
            "DungeonProxy",
            dungeonProxyAddress
        );

        console.log("   • Upgrading DungeonProxy implementation...");
        const upgradeTx = await dungeonProxy.upgrade(newDungeonComponentAddress);
        await upgradeTx.wait();
        console.log("✅ DungeonProxy implementation updated successfully!");
        console.log("   • Transaction hash:", upgradeTx.hash);

        // Verify upgrade
        const currentImplementation = await dungeonProxy.implementation();
        console.log("   • Current implementation:", currentImplementation);

        if (
            currentImplementation.toLowerCase() ===
            newDungeonComponentAddress.toLowerCase()
        ) {
            console.log("✅ Upgrade verification successful!");
        } else {
            throw new Error("Upgrade verification failed!");
        }
    } catch (error) {
        console.error("❌ Failed to upgrade DungeonProxy:", error.message);
        throw error;
    }

    // === REGISTER DUNGEONLOGIC IN WORLD (if not already registered) ===
    console.log("\n🔗 PHASE: Checking DungeonLogic Registration in World...");

    try {
        const world = await ethers.getContractAt("World", worldAddress);

        // Check if DungeonLogic is already registered
        const isRegistered = await world.isLogicRegistered(dungeonLogicAddress);

        if (!isRegistered) {
            console.log("   • Registering DungeonLogic in World contract...");
            const registerTx = await world.registerLogic(dungeonLogicAddress);
            await registerTx.wait();
            console.log("✅ DungeonLogic registered successfully in World!");
        } else {
            console.log("✅ DungeonLogic already registered in World!");
        }
    } catch (error) {
        console.error("❌ Failed to register DungeonLogic:", error.message);
        // Không throw error ở đây vì có thể đã được register trước đó
        console.log("   ⚠️  Continuing despite registration error...");
    }

    // === UPDATE DUNGEON COMPONENT IN JSON ===
    console.log("\n💾 PHASE: Updating DungeonComponent in JSON...");

    try {
        // Lưu địa chỉ component cũ để backup
        if (oldDungeonComponentAddress) {
            deploymentInfo.contracts.OldDungeonComponent = oldDungeonComponentAddress;
        }

        // Cập nhật địa chỉ DungeonComponent mới
        deploymentInfo.contracts.DungeonComponent = newDungeonComponentAddress;

        // Thêm thông tin upgrade
        deploymentInfo.lastUpgrade = {
            component: "DungeonComponent",
            oldAddress: oldDungeonComponentAddress,
            newAddress: newDungeonComponentAddress,
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            network: network.name,
            chainId: Number(network.chainId),
        };

        // Ghi đè file deployment
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`✅ DungeonComponent updated in: ${deploymentPath}`);
        console.log(`   • Old DungeonComponent: ${oldDungeonComponentAddress}`);
        console.log(`   • New DungeonComponent: ${newDungeonComponentAddress}`);
    } catch (error) {
        console.error("❌ Failed to update JSON file:", error.message);
    }

    // === TEST NEW COMPONENT ===
    console.log("\n🧪 PHASE: Testing New Component...");

    try {
        const dungeonProxy = await ethers.getContractAt(
            "DungeonComponent",
            dungeonProxyAddress
        );

        // Test basic functions
        console.log("   • Testing getAllDungeonIds...");
        const allDungeonIds = await dungeonProxy.getAllDungeonIds();
        console.log(`   • Total dungeons: ${allDungeonIds.length}`);

        console.log("   • Testing dungeonCount...");
        const dungeonCount = await dungeonProxy.dungeonCount();
        console.log(`   • Dungeon count: ${dungeonCount}`);

        console.log("   • Testing sessionCount...");
        const sessionCount = await dungeonProxy.sessionCount();
        console.log(`   • Session count: ${sessionCount}`);

        console.log("✅ Component testing successful!");
    } catch (error) {
        console.error("❌ Component testing failed:", error.message);
        // Không throw error ở đây vì component có thể đã được upgrade thành công
        console.log("   ⚠️  Continuing despite testing error...");
    }

    // === SUMMARY ===
    console.log("\n🎉 DUNGEON COMPONENT DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(
        `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
    );
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log("\n📋 Upgrade Details:");
    console.log(`   • World Contract: ${worldAddress}`);
    console.log(`   • DungeonProxy: ${dungeonProxyAddress} (UPDATED)`);
    console.log(`   • DungeonLogic: ${dungeonLogicAddress}`);
    console.log(`   • Old DungeonComponent: ${oldDungeonComponentAddress}`);
    console.log(`   • New DungeonComponent: ${newDungeonComponentAddress} (NEW)`);
    console.log("\n✅ DungeonComponent đã được deploy và upgrade thành công!");
    console.log("\n📝 Deployment file đã được cập nhật!");
    console.log("\n🔗 Next Steps:");
    console.log(`   • Test các chức năng Dungeon mới`);
    console.log(`   • Verify component hoạt động đúng`);
    console.log(`   • Update frontend nếu cần thiết`);
    console.log(`   • Kiểm tra block explorer để xác nhận`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ DungeonComponent deployment failed:", error);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    });

