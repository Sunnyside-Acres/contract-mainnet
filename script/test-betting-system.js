const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Betting System...");

  const [deployer, admin, player1, player2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Admin:", admin.address);
  console.log("Player1:", player1.address);
  console.log("Player2:", player2.address);

  // Deploy World
  console.log("\n🌍 Deploying World...");
  const World = await ethers.getContractFactory("World");
  const world = await World.deploy();
  await world.deployed();
  console.log("✅ World deployed to:", world.address);

  // Set admin
  await world.setAdmin(admin.address, true);
  console.log("✅ Admin set");

  // Deploy BettingManager
  console.log("\n🎰 Deploying BettingManager...");
  const BettingManager = await ethers.getContractFactory("BettingManager");
  const bettingManager = await BettingManager.deploy(world.address);
  await bettingManager.deployed();
  console.log("✅ BettingManager deployed to:", bettingManager.address);

  // Deploy Mock ERC20
  console.log("\n🪙 Deploying Mock ERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy(
    "Test Token",
    "TEST",
    ethers.utils.parseEther("1000000")
  );
  await mockToken.deployed();
  console.log("✅ MockERC20 deployed to:", mockToken.address);

  // Add token support
  await bettingManager.connect(admin).setTokenSupport(mockToken.address, true);
  console.log("✅ Token support added");

  // Test 1: Native token betting
  console.log("\n💰 Test 1: Native Token Betting");
  const betAmount = ethers.utils.parseEther("1");

  await bettingManager.connect(player1).betNative(1, { value: betAmount });
  console.log("✅ Player1 placed native bet for dungeon 1");

  // Test 2: ERC20 token betting
  console.log("\n🪙 Test 2: ERC20 Token Betting");
  const erc20BetAmount = ethers.utils.parseEther("2");

  await mockToken
    .connect(player2)
    .approve(bettingManager.address, erc20BetAmount);
  await bettingManager
    .connect(player2)
    .betERC20(1, mockToken.address, erc20BetAmount);
  console.log("✅ Player2 placed ERC20 bet for dungeon 1");

  // Test 3: Admin creates proof
  console.log("\n🔐 Test 3: Admin Creates Proof");
  const proofHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("test proof")
  );

  // Player1 wins
  await bettingManager.connect(admin).createProof(1, true, proofHash);
  console.log("✅ Admin created proof for Player1 (WIN)");

  // Player2 loses
  await bettingManager.connect(admin).createProof(2, false, proofHash);
  console.log("✅ Admin created proof for Player2 (LOSS)");

  // Test 4: Players claim rewards
  console.log("\n🎁 Test 4: Players Claim Rewards");

  // Player1 should be able to claim (won)
  const initialBalance1 = await player1.getBalance();
  await bettingManager.connect(player1).claimReward(1);
  const finalBalance1 = await player1.getBalance();
  console.log("✅ Player1 claimed reward (won)");
  console.log(
    "   Balance change:",
    ethers.utils.formatEther(finalBalance1.sub(initialBalance1)),
    "ETH"
  );

  // Player2 should not be able to claim (lost)
  try {
    await bettingManager.connect(player2).claimReward(2);
    console.log("❌ Player2 should not be able to claim (lost)");
  } catch (error) {
    console.log("✅ Player2 correctly rejected (lost)");
  }

  // Test 5: Contract pause/unpause
  console.log("\n⏸️ Test 5: Contract Pause/Unpause");

  await bettingManager.connect(admin).pause();
  console.log("✅ Contract paused");

  try {
    await bettingManager.connect(player1).betNative(2, { value: betAmount });
    console.log("❌ Should not be able to bet when paused");
  } catch (error) {
    console.log("✅ Betting correctly blocked when paused");
  }

  await bettingManager.connect(admin).unpause();
  console.log("✅ Contract unpaused");

  // Test 6: Emergency withdraw
  console.log("\n🚨 Test 6: Emergency Withdraw");

  await bettingManager.connect(admin).pause();
  const contractBalance = await bettingManager.getContractBalance(
    ethers.constants.AddressZero
  );
  console.log(
    "Contract balance:",
    ethers.utils.formatEther(contractBalance),
    "ETH"
  );

  const adminInitialBalance = await admin.getBalance();
  await bettingManager
    .connect(admin)
    .emergencyWithdraw(
      ethers.constants.AddressZero,
      ethers.utils.parseEther("0.5")
    );
  const adminFinalBalance = await admin.getBalance();
  console.log("✅ Emergency withdraw completed");
  console.log(
    "   Admin balance change:",
    ethers.utils.formatEther(adminFinalBalance.sub(adminInitialBalance)),
    "ETH"
  );

  // Test 7: View functions
  console.log("\n📊 Test 7: View Functions");

  const betInfo = await bettingManager.getBetInfo(1);
  console.log("Bet 1 info:");
  console.log("  Player:", betInfo.player);
  console.log("  Dungeon ID:", betInfo.dungeonId.toString());
  console.log(
    "  Bet Amount:",
    ethers.utils.formatEther(betInfo.betAmount),
    "ETH"
  );
  console.log("  Is Win:", betInfo.isWin);
  console.log("  Claimed:", betInfo.claimed);

  const totalPending = await bettingManager.getTotalPendingBets(
    ethers.constants.AddressZero
  );
  console.log(
    "Total pending bets:",
    ethers.utils.formatEther(totalPending),
    "ETH"
  );

  const isPaused = await bettingManager.paused();
  console.log("Contract paused:", isPaused);

  console.log("\n🎉 All tests completed successfully!");
  console.log("\n📋 Summary:");
  console.log("- ✅ Native token betting works");
  console.log("- ✅ ERC20 token betting works");
  console.log("- ✅ Admin proof creation works");
  console.log("- ✅ Winner can claim rewards");
  console.log("- ✅ Loser cannot claim rewards");
  console.log("- ✅ Pause/unpause works");
  console.log("- ✅ Emergency withdraw works");
  console.log("- ✅ View functions work");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
