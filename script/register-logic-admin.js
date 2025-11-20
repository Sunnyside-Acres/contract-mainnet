const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu register Logic contract vào World...");

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

  // Lấy logic address từ command line argument
  const logicAddress = "0x953c2599233b4CAe288d8adaEd926BA77A018616"

  console.log("📋 Logic address to register:", logicAddress);

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment info from:", deploymentPath);

  // Lấy địa chỉ World contract
  const worldAddress = deploymentInfo.contracts.World;

  // Validate required contracts
  if (!worldAddress) {
    throw new Error("World contract address not found in deployment file");
  }

  console.log("\n📋 Contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • Logic to register:", logicAddress);

  // === REGISTER LOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering Logic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Kiểm tra xem logic đã được register chưa
    const isAlreadyRegistered = await world.isLogicRegistered(logicAddress);
    if (isAlreadyRegistered) {
      console.log("⚠️  Logic contract đã được register trong World!");
      console.log("   • Logic address:", logicAddress);
      console.log("   • Skip registration...");
    } else {
      console.log("   • Registering Logic contract in World...");
      const registerTx = await world.registerLogic(logicAddress);
      console.log("   • Transaction hash:", registerTx.hash);
      await registerTx.wait();
      console.log("✅ Logic contract registered successfully in World!");

      // Verify registration
      const isRegistered = await world.isLogicRegistered(logicAddress);
      if (isRegistered) {
        console.log("✅ Verification: Logic contract is now registered!");
      } else {
        throw new Error(
          "❌ Verification failed: Logic contract is not registered!"
        );
      }
    }
  } catch (error) {
    console.error("❌ Failed to register Logic contract:", error.message);
    throw error;
  }

  // === SUMMARY ===
  console.log("\n🎉 LOGIC REGISTRATION COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Registration Details:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • Logic Contract: ${logicAddress}`);
  console.log("\n✅ Logic contract đã được register trong World contract!");
  console.log("\n🔗 Next Steps:");
  console.log(
    `   • Logic contract có thể được sử dụng bởi các Proxy contracts`
  );
  console.log(`   • Verify logic functions work correctly`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Logic registration failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
