const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("💰 Bắt đầu nạp tiền vào DungeonLogic contract...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", Number(network.chainId));
  
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(
    "💰 Deployer balance:",
    ethers.formatEther(deployerBalance),
    "ETH"
  );

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment info from:", deploymentPath);

  // Lấy địa chỉ DungeonLogic
  const dungeonLogicAddress = deploymentInfo.contracts.DungeonLogic;

  if (!dungeonLogicAddress) {
    throw new Error(
      "DungeonLogic contract address not found in deployment file"
    );
  }

  console.log("\n📋 Contract addresses:");
  console.log("   • DungeonLogic:", dungeonLogicAddress);

  // Kiểm tra balance hiện tại của contract
  const currentBalance = await ethers.provider.getBalance(dungeonLogicAddress);
  console.log(
    "\n💵 Current contract balance:",
    ethers.formatEther(currentBalance),
    "ETH"
  );

  // Lấy số tiền cần nạp từ command line argument hoặc sử dụng giá trị mặc định
  const fundAmountArg = process.argv[2];
  const fundAmount = fundAmountArg
    ? ethers.parseEther(fundAmountArg)
    : ethers.parseEther("10.0"); // Mặc định 10 ETH

  console.log(
    "\n💸 Amount to fund:",
    ethers.formatEther(fundAmount),
    "ETH"
  );

  // Kiểm tra deployer có đủ tiền không
  if (deployerBalance < fundAmount) {
    throw new Error(
      `Insufficient balance. Deployer has ${ethers.formatEther(deployerBalance)} ETH but needs ${ethers.formatEther(fundAmount)} ETH`
    );
  }

  // === FUND CONTRACT ===
  console.log("\n💰 PHASE: Funding DungeonLogic Contract...");

  try {
    console.log("   • Sending transaction to fund contract...");
    const fundTx = await deployer.sendTransaction({
      to: dungeonLogicAddress,
      value: fundAmount,
    });
    console.log("   • Transaction hash:", fundTx.hash);
    console.log("   • Waiting for confirmation...");
    await fundTx.wait();

    // Kiểm tra balance sau khi nạp
    const newBalance = await ethers.provider.getBalance(dungeonLogicAddress);
    console.log(
      `✅ Contract funded successfully with ${ethers.formatEther(fundAmount)} ETH`
    );
    console.log(
      `   • New contract balance: ${ethers.formatEther(newBalance)} ETH`
    );
    console.log(
      `   • Balance increased by: ${ethers.formatEther(newBalance - currentBalance)} ETH`
    );
  } catch (error) {
    console.error("❌ Failed to fund contract:", error.message);
    throw error;
  }

  // === VERIFY CONTRACT ===
  console.log("\n🔍 PHASE: Verifying Contract...");

  try {
    // Kiểm tra contract có tồn tại không
    const code = await ethers.provider.getCode(dungeonLogicAddress);
    if (code === "0x") {
      throw new Error("Contract does not exist at this address");
    }
    console.log("✅ Contract verified at address:", dungeonLogicAddress);

    // Lấy thông tin contract nếu có thể
    try {
      const dungeonLogic = await ethers.getContractAt(
        "DungeonLogic",
        dungeonLogicAddress
      );
      const worldAddress = await dungeonLogic.world();
      const dungeonProxyAddress = await dungeonLogic.dungeonProxy();
      console.log("   • World address:", worldAddress);
      console.log("   • DungeonProxy address:", dungeonProxyAddress);
    } catch (error) {
      console.log("   ⚠️  Could not read contract info:", error.message);
    }
  } catch (error) {
    console.error("❌ Failed to verify contract:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 FUNDING COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Funding Summary:");
  console.log(`   • DungeonLogic Address: ${dungeonLogicAddress}`);
  console.log(
    `   • Amount Funded: ${ethers.formatEther(fundAmount)} ETH`
  );
  console.log(
    `   • Contract Balance: ${ethers.formatEther(await ethers.provider.getBalance(dungeonLogicAddress))} ETH`
  );
  console.log("\n✅ Contract is now ready to handle bet rewards!");
  console.log("\n📝 Note:");
  console.log(
    "   • The contract can now pay out bet rewards to players"
  );
  console.log(
    "   • Players can claim rewards after completing dungeon sessions"
  );
  console.log(
    "   • Admin can use emergencyWithdraw() to withdraw funds if needed"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Funding failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });

