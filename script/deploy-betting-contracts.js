const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy hệ thống betting...");

  // Lấy thông tin deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.utils.formatEther(await deployer.getBalance())
  );

  // Địa chỉ các contract đã deploy (cần cập nhật theo môi trường)
  const WORLD_ADDRESS = process.env.WORLD_ADDRESS || "0x...";
  const INVENTORY_PROXY_ADDRESS =
    process.env.INVENTORY_PROXY_ADDRESS || "0x...";
  const ITEM_PROXY_ADDRESS = process.env.ITEM_PROXY_ADDRESS || "0x...";
  const PLAYER_PROXY_ADDRESS = process.env.PLAYER_PROXY_ADDRESS || "0x...";
  const DUNGEON_LOGIC_ADDRESS = process.env.DUNGEON_LOGIC_ADDRESS || "0x...";

  console.log("\n📋 Thông tin contract hiện tại:");
  console.log("World:", WORLD_ADDRESS);
  console.log("Inventory Proxy:", INVENTORY_PROXY_ADDRESS);
  console.log("Item Proxy:", ITEM_PROXY_ADDRESS);
  console.log("Player Proxy:", PLAYER_PROXY_ADDRESS);
  console.log("Dungeon Logic:", DUNGEON_LOGIC_ADDRESS);

  // Deploy BettingManager
  console.log("\n🎰 Deploying BettingManager...");
  const BettingManager = await ethers.getContractFactory("BettingManager");
  const bettingManager = await BettingManager.deploy(WORLD_ADDRESS);
  await bettingManager.deployed();
  console.log("✅ BettingManager deployed to:", bettingManager.address);

  // Deploy DungeonBettingIntegration
  console.log("\n🔗 Deploying DungeonBettingIntegration...");
  const DungeonBettingIntegration = await ethers.getContractFactory(
    "DungeonBettingIntegration"
  );
  const integration = await DungeonBettingIntegration.deploy(
    WORLD_ADDRESS,
    bettingManager.address,
    DUNGEON_LOGIC_ADDRESS
  );
  await integration.deployed();
  console.log("✅ DungeonBettingIntegration deployed to:", integration.address);

  // Cấu hình token hỗ trợ (ví dụ: USDT, USDC)
  console.log("\n💰 Cấu hình token hỗ trợ...");

  // Thêm native token (ETH/BNB) - mặc định đã hỗ trợ
  console.log("✅ Native token (ETH/BNB) đã được hỗ trợ mặc định");

  // Có thể thêm các token ERC20 khác nếu cần
  // await bettingManager.setTokenSupport(USDT_ADDRESS, true);
  // await bettingManager.setTokenSupport(USDC_ADDRESS, true);

  // Lưu địa chỉ contract
  const contractAddresses = {
    BettingManager: bettingManager.address,
    DungeonBettingIntegration: integration.address,
    World: WORLD_ADDRESS,
    InventoryProxy: INVENTORY_PROXY_ADDRESS,
    ItemProxy: ITEM_PROXY_ADDRESS,
    PlayerProxy: PLAYER_PROXY_ADDRESS,
    DungeonLogic: DUNGEON_LOGIC_ADDRESS,
  };

  console.log("\n📄 Địa chỉ contract đã deploy:");
  console.log(JSON.stringify(contractAddresses, null, 2));

  // Lưu vào file
  const fs = require("fs");
  const path = require("path");

  const outputPath = path.join(
    __dirname,
    "../deployed/contract-addresses-betting.json"
  );
  fs.writeFileSync(outputPath, JSON.stringify(contractAddresses, null, 2));
  console.log("\n💾 Đã lưu địa chỉ contract vào:", outputPath);

  // Verify contract (nếu cần)
  if (process.env.VERIFY === "true") {
    console.log("\n🔍 Verifying contracts...");
    try {
      await hre.run("verify:verify", {
        address: bettingManager.address,
        constructorArguments: [WORLD_ADDRESS],
      });
      console.log("✅ BettingManager verified");
    } catch (error) {
      console.log("❌ BettingManager verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: integration.address,
        constructorArguments: [
          WORLD_ADDRESS,
          bettingManager.address,
          DUNGEON_LOGIC_ADDRESS,
        ],
      });
      console.log("✅ DungeonBettingIntegration verified");
    } catch (error) {
      console.log(
        "❌ DungeonBettingIntegration verification failed:",
        error.message
      );
    }
  }

  console.log("\n🎉 Deploy hoàn thành!");
  console.log("\n📖 Hướng dẫn sử dụng:");
  console.log("1. Admin cần gọi setTokenSupport() để thêm token ERC20 hỗ trợ");
  console.log("2. Người chơi có thể đặt cược bằng betNative() hoặc betERC20()");
  console.log("3. Admin tạo proof bằng createProofFromDungeonResult()");
  console.log("4. Người chơi claim thưởng bằng claimReward()");
  console.log("5. Admin có thể pause/unpause contract khi cần");
  console.log("6. Admin có thể emergencyWithdraw() khi contract bị pause");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
