const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Bắt đầu verify contracts...");

  // Đọc thông tin deploy
  const deploymentPath = "./deployed/contract-addresses-seimainnet.json";

  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Không tìm thấy file deployment info. Hãy deploy trước!");
    return;
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Deployment info loaded:", deploymentInfo.network);

  // Verify World contract
  console.log("\n🔍 Verifying World contract...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.World,
      constructorArguments: [deploymentInfo.deployer],
    });
    console.log("✅ World contract verified");
  } catch (error) {
    console.log("⚠️ World contract verification failed:", error.message);
  }

  // Verify PlayerComponent
  console.log("\n🔍 Verifying PlayerComponent...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.PlayerComponent,
      constructorArguments: [
        deploymentInfo.contracts.World,
        deploymentInfo.deployer,
        ethers.ZeroAddress,
      ],
    });
    console.log("✅ PlayerComponent verified");
  } catch (error) {
    console.log("⚠️ PlayerComponent verification failed:", error.message);
  }

  // Verify PlayerLogic
  console.log("\n🔍 Verifying PlayerLogic...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.PlayerLogic,
      constructorArguments: [
        deploymentInfo.contracts.World,
        deploymentInfo.contracts.PlayerComponent,
      ],
    });
    console.log("✅ PlayerLogic verified");
  } catch (error) {
    console.log("⚠️ PlayerLogic verification failed:", error.message);
  }

  // Verify PlayerProxy
  console.log("\n🔍 Verifying PlayerProxy...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.PlayerProxy,
      constructorArguments: [
        deploymentInfo.contracts.World,
        deploymentInfo.deployer,
        deploymentInfo.contracts.PlayerComponent,
      ],
    });
    console.log("✅ PlayerProxy verified");
  } catch (error) {
    console.log("⚠️ PlayerProxy verification failed:", error.message);
  }

  console.log("\n🎉 Verify hoàn tất!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verify failed:", error);
    process.exit(1);
  });
