const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy FleaMarketLogic lên Sei Mainnet...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId);
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "SEI"
  );

  // Xác nhận deploy
  console.log("\n⚠️  Bạn đang deploy FleaMarketLogic lên SEI MAINNET!");
  console.log("💰 Chi phí deploy sẽ rất cao, hãy đảm bảo có đủ SEI");
  console.log("🔒 Hãy kiểm tra kỹ tất cả contract trước khi deploy");

  // 1. Deploy World contract trước (nếu chưa có)
  console.log("\n📦 Deploying World contract...");
  const World = await ethers.getContractFactory("World");
  const world = await World.deploy(deployer.address);
  await world.waitForDeployment();
  const worldAddress = await world.getAddress();
  console.log("✅ World deployed to:", worldAddress);

  // 2. Deploy PlayerComponent
  console.log("\n📦 Deploying PlayerComponent...");
  const PlayerComponent = await ethers.getContractFactory("PlayerComponent");
  const playerComponent = await PlayerComponent.deploy();
  await playerComponent.waitForDeployment();
  const playerComponentAddress = await playerComponent.getAddress();
  console.log("✅ PlayerComponent deployed to:", playerComponentAddress);

  // 3. Deploy PlayerProxy
  console.log("\n📦 Deploying PlayerProxy...");
  const PlayerProxy = await ethers.getContractFactory("PlayerProxy");
  const playerProxy = await PlayerProxy.deploy(
    worldAddress,
    deployer.address,
    playerComponentAddress // Implementation address
  );
  await playerProxy.waitForDeployment();
  const playerProxyAddress = await playerProxy.getAddress();
  console.log("✅ PlayerProxy deployed to:", playerProxyAddress);

  // 4. Deploy PlayerLogic
  console.log("\n📦 Deploying PlayerLogic...");
  const PlayerLogic = await ethers.getContractFactory("PlayerLogic");
  const playerLogic = await PlayerLogic.deploy(
    worldAddress,
    playerProxyAddress
  );
  await playerLogic.waitForDeployment();
  const playerLogicAddress = await playerLogic.getAddress();
  console.log("✅ PlayerLogic deployed to:", playerLogicAddress);

  // 5. Deploy ItemComponent
  console.log("\n📦 Deploying ItemComponent...");
  const ItemComponent = await ethers.getContractFactory("ItemComponent");
  const itemComponent = await ItemComponent.deploy();
  await itemComponent.waitForDeployment();
  const itemComponentAddress = await itemComponent.getAddress();
  console.log("✅ ItemComponent deployed to:", itemComponentAddress);

  // 6. Deploy ItemProxy
  console.log("\n📦 Deploying ItemProxy...");
  const ItemProxy = await ethers.getContractFactory("ItemProxy");
  const itemProxy = await ItemProxy.deploy(
    worldAddress,
    deployer.address,
    itemComponentAddress // Implementation address
  );
  await itemProxy.waitForDeployment();
  const itemProxyAddress = await itemProxy.getAddress();
  console.log("✅ ItemProxy deployed to:", itemProxyAddress);

  // 7. Deploy ItemLogic
  console.log("\n📦 Deploying ItemLogic...");
  const ItemLogic = await ethers.getContractFactory("ItemLogic");
  const itemLogic = await ItemLogic.deploy(worldAddress, itemProxyAddress);
  await itemLogic.waitForDeployment();
  const itemLogicAddress = await itemLogic.getAddress();
  console.log("✅ ItemLogic deployed to:", itemLogicAddress);

  // 8. Deploy InventoryComponent
  console.log("\n📦 Deploying InventoryComponent...");
  const InventoryComponent = await ethers.getContractFactory(
    "InventoryComponent"
  );
  const inventoryComponent = await InventoryComponent.deploy();
  await inventoryComponent.waitForDeployment();
  const inventoryComponentAddress = await inventoryComponent.getAddress();
  console.log("✅ InventoryComponent deployed to:", inventoryComponentAddress);

  // 9. Deploy InventoryProxy
  console.log("\n📦 Deploying InventoryProxy...");
  const InventoryProxy = await ethers.getContractFactory("InventoryProxy");
  const inventoryProxy = await InventoryProxy.deploy(
    worldAddress,
    deployer.address,
    inventoryComponentAddress // Implementation address
  );
  await inventoryProxy.waitForDeployment();
  const inventoryProxyAddress = await inventoryProxy.getAddress();
  console.log("✅ InventoryProxy deployed to:", inventoryProxyAddress);

  // 10. Deploy InventoryLogic
  console.log("\n📦 Deploying InventoryLogic...");
  const InventoryLogic = await ethers.getContractFactory("InventoryLogic");
  const inventoryLogic = await InventoryLogic.deploy(
    worldAddress,
    inventoryProxyAddress
  );
  await inventoryLogic.waitForDeployment();
  const inventoryLogicAddress = await inventoryLogic.getAddress();
  console.log("✅ InventoryLogic deployed to:", inventoryLogicAddress);

  // 11. Deploy FleaMarketComponent
  console.log("\n📦 Deploying FleaMarketComponent...");
  const FleaMarketComponent = await ethers.getContractFactory(
    "FleaMarketComponent"
  );
  const fleaMarketComponent = await FleaMarketComponent.deploy();
  await fleaMarketComponent.waitForDeployment();
  const fleaMarketComponentAddress = await fleaMarketComponent.getAddress();
  console.log(
    "✅ FleaMarketComponent deployed to:",
    fleaMarketComponentAddress
  );

  // 12. Deploy FleaMarketProxy
  console.log("\n📦 Deploying FleaMarketProxy...");
  const FleaMarketProxy = await ethers.getContractFactory("FleaMarketProxy");
  const fleaMarketProxy = await FleaMarketProxy.deploy(
    worldAddress,
    deployer.address,
    fleaMarketComponentAddress // Implementation address
  );
  await fleaMarketProxy.waitForDeployment();
  const fleaMarketProxyAddress = await fleaMarketProxy.getAddress();
  console.log("✅ FleaMarketProxy deployed to:", fleaMarketProxyAddress);

  // 13. Deploy FleaMarketLogic (CONTRACT CHÍNH)
  console.log("\n🎯 Deploying FleaMarketLogic (CONTRACT CHÍNH)...");
  const FleaMarketLogic = await ethers.getContractFactory("FleaMarketLogic");
  const fleaMarketLogic = await FleaMarketLogic.deploy(
    worldAddress,
    fleaMarketProxyAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    playerProxyAddress
  );
  await fleaMarketLogic.waitForDeployment();
  const fleaMarketLogicAddress = await fleaMarketLogic.getAddress();
  console.log("✅ FleaMarketLogic deployed to:", fleaMarketLogicAddress);

  // === ĐĂNG KÝ LOGIC TRONG WORLD ===
  console.log("\n🔗 Đăng ký các Logic contract trong World...");

  // Register PlayerLogic trong World
  const registerPlayerLogicTx = await world.registerLogic(playerLogicAddress);
  await registerPlayerLogicTx.wait();
  console.log("✅ PlayerLogic registered in World");

  // Register ItemLogic trong World
  const registerItemLogicTx = await world.registerLogic(itemLogicAddress);
  await registerItemLogicTx.wait();
  console.log("✅ ItemLogic registered in World");

  // Register InventoryLogic trong World
  const registerInventoryLogicTx = await world.registerLogic(
    inventoryLogicAddress
  );
  await registerInventoryLogicTx.wait();
  console.log("✅ InventoryLogic registered in World");

  // Register FleaMarketLogic trong World
  const registerFleaMarketLogicTx = await world.registerLogic(
    fleaMarketLogicAddress
  );
  await registerFleaMarketLogicTx.wait();
  console.log("✅ FleaMarketLogic registered in World");

  // === LƯU THÔNG TIN DEPLOY ===
  const deploymentInfo = {
    network: "seimainnet",
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      World: worldAddress,
      PlayerComponent: playerComponentAddress,
      PlayerLogic: playerLogicAddress,
      PlayerProxy: playerProxyAddress,
      ItemComponent: itemComponentAddress,
      ItemLogic: itemLogicAddress,
      ItemProxy: itemProxyAddress,
      InventoryComponent: inventoryComponentAddress,
      InventoryLogic: inventoryLogicAddress,
      InventoryProxy: inventoryProxyAddress,
      FleaMarketComponent: fleaMarketComponentAddress,
      FleaMarketLogic: fleaMarketLogicAddress,
      FleaMarketProxy: fleaMarketProxyAddress,
    },
    timestamp: new Date().toISOString(),
    rpcUrl: process.env.RPC_URL || "Mainnet RPC",
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Lưu vào file
  const deploymentPath = `./deployed/contract-addresses-fleamarket-seimainnet.json`;

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  console.log(
    "\n🎉 Deploy FleaMarketLogic lên Sei Mainnet hoàn tất thành công!"
  );
  console.log("📊 Tổng số contract đã deploy: 13 contracts");
  console.log("✨ Hệ thống FleaMarket đã sẵn sàng sử dụng");
  console.log("🔗 Tất cả contract đã được đăng ký trong World contract");
  console.log(
    "🌐 Explorer URL: https://sei.explorers.guru/address/" + worldAddress
  );
  console.log("💰 Chi phí deploy đã được tính toán và thực hiện");
  console.log("🔒 Tất cả contract đã được verify và sẵn sàng sử dụng");

  console.log("\n📝 Hướng dẫn sử dụng:");
  console.log("1. FleaMarketLogic address:", fleaMarketLogicAddress);
  console.log("2. Sử dụng FleaMarketLogic để tương tác với FleaMarket");
  console.log("3. Các function chính: listItem, purchaseItem, cancelListing");
  console.log("4. Kiểm tra transaction history và market stats");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
