const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy Referral contracts...");

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
  const playerComponentAddress = deploymentInfo.contracts.PlayerComponent;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • PlayerComponent:", playerComponentAddress);

  // === DEPLOY REFERRAL CONTRACTS ===
  console.log("\n🚀 PHASE: Deploying Referral Contracts...");

  // 1. Deploy ReferralComponent
  console.log("\n1️⃣ Deploying ReferralComponent...");
  const ReferralComponent = await ethers.getContractFactory(
    "ReferralComponent"
  );
  const referralComponent = await ReferralComponent.deploy();
  await referralComponent.waitForDeployment();
  const referralComponentAddress = await referralComponent.getAddress();
  console.log("✅ ReferralComponent deployed to:", referralComponentAddress);

  // 2. Deploy ReferralProxy
  console.log("\n2️⃣ Deploying ReferralProxy...");
  const ReferralProxy = await ethers.getContractFactory("ReferralProxy");
  const referralProxy = await ReferralProxy.deploy(
    worldAddress,
    deployer.address,
    referralComponentAddress
  );
  await referralProxy.waitForDeployment();
  const referralProxyAddress = await referralProxy.getAddress();
  console.log("✅ ReferralProxy deployed to:", referralProxyAddress);

  // 3. Deploy ReferralLogic
  console.log("\n3️⃣ Deploying ReferralLogic...");
  const ReferralLogic = await ethers.getContractFactory("ReferralLogic");
  const referralLogic = await ReferralLogic.deploy(
    worldAddress,
    referralComponentAddress,
    playerComponentAddress
  );
  await referralLogic.waitForDeployment();
  const referralLogicAddress = await referralLogic.getAddress();
  console.log("✅ ReferralLogic deployed to:", referralLogicAddress);

  console.log("\n✅ Tất cả Referral contracts đã được deploy thành công!");

  // === REGISTER REFERRALLOGIC IN WORLD ===
  console.log("\n🔗 PHASE: Registering ReferralLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    console.log("   • Registering ReferralLogic in World contract...");
    const registerTx = await world.registerLogic(referralLogicAddress);
    await registerTx.wait();
    console.log("✅ ReferralLogic registered successfully in World!");
  } catch (error) {
    console.error("❌ Failed to register ReferralLogic:", error.message);
    throw error;
  }

  // === UPDATE REFERRAL CONTRACTS IN JSON ===
  console.log("\n💾 PHASE: Updating Referral Contracts in JSON...");

  try {
    // Cập nhật địa chỉ Referral contracts mới
    deploymentInfo.contracts.ReferralComponent = referralComponentAddress;
    deploymentInfo.contracts.ReferralProxy = referralProxyAddress;
    deploymentInfo.contracts.ReferralLogic = referralLogicAddress;

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Referral contracts updated in: ${deploymentPath}`);
    console.log(`   • ReferralComponent: ${referralComponentAddress}`);
    console.log(`   • ReferralProxy: ${referralProxyAddress}`);
    console.log(`   • ReferralLogic: ${referralLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 REFERRAL CONTRACTS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 New Referral System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • ReferralComponent: ${referralComponentAddress}`);
  console.log(`   • ReferralProxy: ${referralProxyAddress}`);
  console.log(`   • ReferralLogic: ${referralLogicAddress}`);
  console.log("\n✅ All Referral contracts deployed successfully!");
  console.log("\n📝 Deployment file updated with new Referral contracts!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • ReferralLogic đã được register trong World contract`);
  console.log(`   • Test Referral functions`);
  console.log(`   • Update frontend configuration`);
  console.log("\n💰 Referral Reward Configuration:");
  console.log(`   • Referrer Reward: 100 POINTS`);
  console.log(`   • Referred User Reward: 50 POINTS`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Referral deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
