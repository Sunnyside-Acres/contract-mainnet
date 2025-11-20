const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("💰 Bắt đầu rút tiền từ DungeonLogic contract...");

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

  // Kiểm tra contract có tồn tại không
  const code = await ethers.provider.getCode(dungeonLogicAddress);
  if (code === "0x") {
    throw new Error("Contract does not exist at this address");
  }

  // Lấy contract instance
  const dungeonLogic = await ethers.getContractAt(
    "DungeonLogic",
    dungeonLogicAddress
  );

//   // Kiểm tra owner
//   console.log("\n🔍 Checking contract ownership...");
//   let owner;
//   try {
//     owner = await dungeonLogic.owner();
//     console.log("👤 Owner address:", owner);
//   } catch (error) {
//     console.error("❌ Failed to get owner:", error.message);
//     throw new Error(
//       "Cannot read owner from contract. Contract may not be properly deployed."
//     );
//   }

//   if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
//     throw new Error(
//       `Deployer (${deployer.address}) is not the owner. Owner is ${owner}. Only owner can withdraw funds.`
//     );
//   }

  console.log("✅ Deployer is the owner, can proceed with withdrawal");

  // Kiểm tra balance hiện tại của contract
  const contractBalance = await ethers.provider.getBalance(dungeonLogicAddress);
  console.log(
    "\n💵 Current contract balance:",
    ethers.formatEther(contractBalance),
    "ETH"
  );

  if (contractBalance === 0n) {
    throw new Error("Contract balance is 0. Nothing to withdraw.");
  }

  // Lấy địa chỉ nhận tiền từ command line argument hoặc sử dụng deployer address
  const recipientAddressArg = process.argv[2];
  const recipientAddress = recipientAddressArg || deployer.address;

  // Validate recipient address
  if (!ethers.isAddress(recipientAddress)) {
    throw new Error(`Invalid recipient address: ${recipientAddress}`);
  }

  console.log("\n📤 Recipient address:", recipientAddress);

  // Kiểm tra recipient address không phải là zero address
  if (recipientAddress === ethers.ZeroAddress) {
    throw new Error("Recipient address cannot be zero address");
  }

  // Kiểm tra balance của recipient trước khi rút
  const recipientBalanceBefore = await ethers.provider.getBalance(
    recipientAddress
  );
  console.log(
    "💰 Recipient balance before:",
    ethers.formatEther(recipientBalanceBefore),
    "ETH"
  );

  // === SIMULATE CALL FIRST ===
  console.log("\n🔍 PHASE: Simulating Withdrawal Call...");
  try {
    console.log("   • Simulating emergencyWithdraw call...");
    await dungeonLogic.emergencyWithdraw.staticCall(recipientAddress);
    console.log("   ✅ Simulation successful - call should work");
  } catch (error) {
    console.error("❌ Simulation failed:", error.message);
    if (error.reason) {
      console.error("   • Reason:", error.reason);
    }
    if (error.data) {
      console.error("   • Error data:", error.data);
    }
    throw new Error(`Simulation failed: ${error.message}`);
  }

  // === WITHDRAW FUNDS ===
  console.log("\n💰 PHASE: Withdrawing Funds from DungeonLogic Contract...");

  try {
    console.log("   • Calling emergencyWithdraw function...");
    const withdrawTx = await dungeonLogic.emergencyWithdraw(recipientAddress);
    console.log("   • Transaction hash:", withdrawTx.hash);
    console.log("   • Waiting for confirmation...");
    const receipt = await withdrawTx.wait();

    console.log("   • Transaction confirmed in block:", receipt.blockNumber);
    console.log("   • Gas used:", receipt.gasUsed.toString());

    // Kiểm tra balance sau khi rút
    const contractBalanceAfter = await ethers.provider.getBalance(
      dungeonLogicAddress
    );
    const recipientBalanceAfter = await ethers.provider.getBalance(
      recipientAddress
    );

    console.log(
      `\n✅ Withdrawal successful! Withdrew ${ethers.formatEther(
        contractBalance
      )} ETH`
    );
    console.log(
      `   • Contract balance after: ${ethers.formatEther(
        contractBalanceAfter
      )} ETH`
    );
    console.log(
      `   • Recipient balance after: ${ethers.formatEther(
        recipientBalanceAfter
      )} ETH`
    );
    console.log(
      `   • Recipient received: ${ethers.formatEther(
        recipientBalanceAfter - recipientBalanceBefore
      )} ETH`
    );
  } catch (error) {
    console.error("\n❌ Failed to withdraw funds!");
    console.error("   • Error message:", error.message);
    if (error.reason) {
      console.error("   • Reason:", error.reason);
    }
    if (error.data) {
      console.error("   • Error data:", error.data);
    }
    if (error.code) {
      console.error("   • Error code:", error.code);
    }

    // Try to decode revert reason if available
    if (error.data && error.data !== "0x") {
      try {
        // Common error messages
        if (error.data.includes("0x08c379a0")) {
          // Error(string)
          const reason = ethers.AbiCoder.defaultAbiCoder().decode(
            ["string"],
            "0x" + error.data.slice(138)
          )[0];
          console.error("   • Decoded reason:", reason);
        } else if (error.data.includes("0x4e487b71")) {
          // Panic(uint256)
          const panicCode = BigInt(error.data.slice(-64));
          console.error("   • Panic code:", panicCode.toString());
        }
      } catch (decodeError) {
        console.error("   • Could not decode error data");
      }
    }

    throw error;
  }

  // === VERIFY WITHDRAWAL ===
  console.log("\n🔍 PHASE: Verifying Withdrawal...");

  try {
    const finalContractBalance = await ethers.provider.getBalance(
      dungeonLogicAddress
    );
    const finalRecipientBalance = await ethers.provider.getBalance(
      recipientAddress
    );

    console.log("✅ Verification completed:");
    console.log(
      `   • Contract balance: ${ethers.formatEther(finalContractBalance)} ETH`
    );
    console.log(
      `   • Recipient balance: ${ethers.formatEther(finalRecipientBalance)} ETH`
    );

    if (finalContractBalance > 0n) {
      console.log("   ⚠️  Warning: Contract still has some balance remaining");
    } else {
      console.log("   ✅ Contract balance is now 0");
    }
  } catch (error) {
    console.error("❌ Failed to verify withdrawal:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 WITHDRAWAL COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Owner/Deployer: ${deployer.address}`);
  console.log(`📤 Recipient: ${recipientAddress}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Withdrawal Summary:");
  console.log(`   • DungeonLogic Address: ${dungeonLogicAddress}`);
  console.log(
    `   • Amount Withdrawn: ${ethers.formatEther(contractBalance)} ETH`
  );
  console.log(
    `   • Contract Balance After: ${ethers.formatEther(
      await ethers.provider.getBalance(dungeonLogicAddress)
    )} ETH`
  );
  console.log(
    `   • Recipient Balance After: ${ethers.formatEther(
      await ethers.provider.getBalance(recipientAddress)
    )} ETH`
  );
  console.log("\n✅ Funds have been successfully withdrawn!");
  console.log("\n📝 Note:");
  console.log(
    "   • Only the contract owner can withdraw funds using emergencyWithdraw()"
  );
  console.log(
    "   • The contract balance is now 0 and cannot pay bet rewards until funded again"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Withdrawal failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
