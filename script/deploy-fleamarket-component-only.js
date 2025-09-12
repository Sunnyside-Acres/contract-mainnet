const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy lại FleaMarketComponent...");

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
  const fleaMarketProxyAddress = deploymentInfo.contracts.FleaMarketProxy;
  const oldFleaMarketComponentAddress =
    deploymentInfo.contracts.FleaMarketComponent;

  console.log("\n📋 Existing contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • FleaMarketProxy:", fleaMarketProxyAddress);
  console.log("   • Old FleaMarketComponent:", oldFleaMarketComponentAddress);

  if (
    !fleaMarketProxyAddress ||
    fleaMarketProxyAddress === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "FleaMarketProxy chưa được deploy! Vui lòng chạy deploy-fleamarket-contracts.js trước."
    );
  }

  // === DEPLOY NEW FLEAMARKET COMPONENT ===
  console.log("\n🚀 PHASE: Deploying New FleaMarketComponent...");

  // 1. Deploy FleaMarketComponent mới
  console.log("\n1️⃣ Deploying new FleaMarketComponent...");
  const FleaMarketComponent = await ethers.getContractFactory(
    "FleaMarketComponent"
  );
  const newFleaMarketComponent = await FleaMarketComponent.deploy();
  await newFleaMarketComponent.waitForDeployment();
  const newFleaMarketComponentAddress =
    await newFleaMarketComponent.getAddress();
  console.log(
    "✅ New FleaMarketComponent deployed to:",
    newFleaMarketComponentAddress
  );

  // === UPGRADE PROXY WITH NEW COMPONENT ===
  console.log("\n🔗 PHASE: Upgrading FleaMarketProxy with new Component...");

  try {
    const fleaMarketProxy = await ethers.getContractAt(
      "FleaMarketProxy",
      fleaMarketProxyAddress
    );

    console.log("   • Upgrading FleaMarketProxy to new component...");
    const upgradeTx = await fleaMarketProxy.upgrade(
      newFleaMarketComponentAddress
    );
    await upgradeTx.wait();
    console.log("✅ FleaMarketProxy upgraded successfully!");
    console.log("   • Transaction hash:", upgradeTx.hash);

    // Verify upgrade
    const currentImplementation = await fleaMarketProxy.implementation();
    console.log("   • Current implementation:", currentImplementation);

    if (
      currentImplementation.toLowerCase() ===
      newFleaMarketComponentAddress.toLowerCase()
    ) {
      console.log("✅ Upgrade verification successful!");
    } else {
      throw new Error("Upgrade verification failed!");
    }
  } catch (error) {
    console.error("❌ Failed to upgrade FleaMarketProxy:", error.message);
    throw error;
  }

  // === UPDATE COMPONENT ADDRESS IN JSON ===
  console.log("\n💾 PHASE: Updating FleaMarketComponent Address in JSON...");

  try {
    // Lưu địa chỉ component cũ để backup
    deploymentInfo.contracts.OldFleaMarketComponent =
      oldFleaMarketComponentAddress;

    // Cập nhật địa chỉ component mới
    deploymentInfo.contracts.FleaMarketComponent =
      newFleaMarketComponentAddress;

    // Thêm thông tin upgrade
    deploymentInfo.lastUpgrade = {
      component: "FleaMarketComponent",
      oldAddress: oldFleaMarketComponentAddress,
      newAddress: newFleaMarketComponentAddress,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      network: network.name,
      chainId: Number(network.chainId),
    };

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ FleaMarketComponent address updated in: ${deploymentPath}`);
    console.log(
      `   • Old FleaMarketComponent: ${oldFleaMarketComponentAddress}`
    );
    console.log(
      `   • New FleaMarketComponent: ${newFleaMarketComponentAddress}`
    );
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === TEST NEW COMPONENT ===
  console.log("\n🧪 PHASE: Testing New Component...");

  try {
    const fleaMarketProxy = await ethers.getContractAt(
      "FleaMarketComponent",
      fleaMarketProxyAddress
    );

    // Test basic functions
    console.log("   • Testing getListingCount...");
    const listingCount = await fleaMarketProxy.getListingCount();
    console.log(`   • Current listing count: ${listingCount}`);

    console.log("   • Testing getMarketStats...");
    const marketStats = await fleaMarketProxy.getMarketStats();
    console.log(`   • Total listings: ${marketStats.totalListings}`);
    console.log(`   • Active listings: ${marketStats.activeListings}`);
    console.log(`   • Total transactions: ${marketStats.totalTransactions}`);
    console.log(`   • Total volume: ${marketStats.totalVolume}`);

    console.log("✅ Component testing successful!");
  } catch (error) {
    console.error("❌ Component testing failed:", error.message);
    // Không throw error ở đây vì component có thể đã được upgrade thành công
  }

  // === SUMMARY ===
  console.log("\n🎉 FLEAMARKET COMPONENT UPGRADE COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Upgrade Details:");
  console.log(`   • FleaMarketProxy: ${fleaMarketProxyAddress}`);
  console.log(`   • Old FleaMarketComponent: ${oldFleaMarketComponentAddress}`);
  console.log(`   • New FleaMarketComponent: ${newFleaMarketComponentAddress}`);
  console.log("\n✅ FleaMarketComponent đã được upgrade thành công!");
  console.log("\n📝 Deployment file đã được cập nhật!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test các chức năng FleaMarket mới`);
  console.log(`   • Verify component hoạt động đúng`);
  console.log(`   • Update frontend nếu cần thiết`);
  console.log(`   • Kiểm tra block explorer để xác nhận`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ FleaMarketComponent upgrade failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
