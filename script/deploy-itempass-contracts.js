const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Bắt đầu deploy ItemPass contracts...");

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

  // Load địa chỉ contracts đã deploy (nếu có)
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;
  let deploymentInfo = null;
  let worldAddress = null;
  let inventoryProxyAddress = null;
  let itemProxyAddress = null;

  if (fs.existsSync(deploymentPath)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("📋 Loaded deployment info from:", deploymentPath);

    // Lấy địa chỉ các contracts cần thiết
    worldAddress = deploymentInfo.contracts?.World;
    inventoryProxyAddress = deploymentInfo.contracts?.InventoryProxy;
    itemProxyAddress = deploymentInfo.contracts?.ItemProxy;

    console.log("\n📋 Existing contract addresses:");
    console.log("   • World:", worldAddress || "Not found");
    console.log("   • InventoryProxy:", inventoryProxyAddress || "Not found");
    console.log("   • ItemProxy:", itemProxyAddress || "Not found");
  } else {
    console.log(
      "⚠️  Deployment file not found, will use addresses from environment or require manual input"
    );
  }

  // Nếu không có trong file, yêu cầu nhập từ environment hoặc throw error
  if (!worldAddress) {
    worldAddress = process.env.WORLD_ADDRESS;
    if (!worldAddress) {
      throw new Error(
        "World contract address not found. Please set WORLD_ADDRESS env var or deploy all contracts first."
      );
    }
  }

  if (!inventoryProxyAddress) {
    inventoryProxyAddress = process.env.INVENTORY_PROXY_ADDRESS;
    if (!inventoryProxyAddress) {
      throw new Error(
        "InventoryProxy address not found. Please set INVENTORY_PROXY_ADDRESS env var or deploy all contracts first."
      );
    }
  }

  if (!itemProxyAddress) {
    itemProxyAddress = process.env.ITEM_PROXY_ADDRESS;
    if (!itemProxyAddress) {
      throw new Error(
        "ItemProxy address not found. Please set ITEM_PROXY_ADDRESS env var or deploy all contracts first."
      );
    }
  }

  // === PHASE 1: DEPLOY ITEM PASS COMPONENT ===
  console.log("\n📦 PHASE 1: Deploying ItemPassComponent...");

  console.log("\n1️⃣ Deploying ItemPassComponent...");
  const ItemPassComponent = await ethers.getContractFactory(
    "ItemPassComponent"
  );
  const itemPassComponent = await ItemPassComponent.deploy();
  await itemPassComponent.waitForDeployment();
  const itemPassComponentAddress = await itemPassComponent.getAddress();
  console.log("✅ ItemPassComponent deployed to:", itemPassComponentAddress);

  // === PHASE 2: DEPLOY ITEM PASS PROXY ===
  console.log("\n📦 PHASE 2: Deploying ItemPassProxy...");

  console.log("\n2️⃣ Deploying ItemPassProxy...");
  const ItemPassProxy = await ethers.getContractFactory("ItemPassProxy");
  const itemPassProxy = await ItemPassProxy.deploy(
    worldAddress,
    deployer.address,
    itemPassComponentAddress
  );
  await itemPassProxy.waitForDeployment();
  const itemPassProxyAddress = await itemPassProxy.getAddress();
  console.log("✅ ItemPassProxy deployed to:", itemPassProxyAddress);

  // === PHASE 3: DEPLOY ITEM PASS LOGIC ===
  console.log("\n📦 PHASE 3: Deploying ItemPassLogic...");

  console.log("\n3️⃣ Deploying ItemPassLogic...");
  const ItemPassLogic = await ethers.getContractFactory("ItemPassLogic");
  const itemPassLogic = await ItemPassLogic.deploy(
    worldAddress,
    inventoryProxyAddress,
    itemProxyAddress,
    itemPassProxyAddress
  );
  await itemPassLogic.waitForDeployment();
  const itemPassLogicAddress = await itemPassLogic.getAddress();
  console.log("✅ ItemPassLogic deployed to:", itemPassLogicAddress);

  // === PHASE 4: REGISTER ITEM PASS LOGIC IN WORLD ===
  console.log("\n⚙️ PHASE 4: Registering ItemPassLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Check if already registered
    const isRegistered = await world.isLogicRegistered(itemPassLogicAddress);
    if (isRegistered) {
      console.log("   ⚠️  ItemPassLogic already registered in World");
    } else {
      console.log("   • Registering ItemPassLogic in World contract...");
      const registerTx = await world.registerLogic(itemPassLogicAddress);
      await registerTx.wait();
      console.log("✅ ItemPassLogic registered successfully in World!");
    }
  } catch (error) {
    console.error("❌ Failed to register ItemPassLogic:", error.message);
    throw error;
  }

  // === PHASE 5: SAVE DEPLOYMENT INFO ===
  console.log("\n💾 PHASE 5: Saving Deployment Information...");

  // Initialize deploymentInfo if it doesn't exist
  if (!deploymentInfo) {
    deploymentInfo = {
      network: network.name,
      chainId: Number(network.chainId),
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {},
      deploymentOrder: [],
    };
  }

  // Update deployment info
  deploymentInfo.contracts.ItemPassComponent = itemPassComponentAddress;
  deploymentInfo.contracts.ItemPassProxy = itemPassProxyAddress;
  deploymentInfo.contracts.ItemPassLogic = itemPassLogicAddress;
  deploymentInfo.timestamp = new Date().toISOString();

  // Update deployment order
  if (!deploymentInfo.deploymentOrder) {
    deploymentInfo.deploymentOrder = [];
  }
  if (!deploymentInfo.deploymentOrder.includes("ItemPassComponent")) {
    deploymentInfo.deploymentOrder.push("ItemPassComponent");
  }
  if (!deploymentInfo.deploymentOrder.includes("ItemPassProxy")) {
    deploymentInfo.deploymentOrder.push("ItemPassProxy");
  }
  if (!deploymentInfo.deploymentOrder.includes("ItemPassLogic")) {
    deploymentInfo.deploymentOrder.push("ItemPassLogic");
  }

  // Tạo thư mục nếu chưa tồn tại
  const dir = "./deployed";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Lưu vào file
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ Deployment info saved to: ${deploymentPath}`);

  // === SYNC FRONTEND DEPLOYMENT FILE ===
  console.log("\n🔄 PHASE 6: Syncing Frontend Deployment File...");

  try {
    const frontendDeploymentPath = `./frontend/deployed/contract-addresses-${network.name}.json`;
    let frontendDeploymentInfo = {};

    if (fs.existsSync(frontendDeploymentPath)) {
      frontendDeploymentInfo = JSON.parse(
        fs.readFileSync(frontendDeploymentPath, "utf8")
      );
    } else {
      frontendDeploymentInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        contracts: {},
      };
    }

    frontendDeploymentInfo.contracts.ItemPassComponent =
      itemPassComponentAddress;
    frontendDeploymentInfo.contracts.ItemPassProxy = itemPassProxyAddress;
    frontendDeploymentInfo.contracts.ItemPassLogic = itemPassLogicAddress;
    frontendDeploymentInfo.timestamp = new Date().toISOString();

    // Tạo thư mục frontend/deployed nếu chưa tồn tại
    const frontendDir = "./frontend/deployed";
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    fs.writeFileSync(
      frontendDeploymentPath,
      JSON.stringify(frontendDeploymentInfo, null, 2)
    );
    console.log(
      `✅ Frontend deployment file updated: ${frontendDeploymentPath}`
    );
  } catch (error) {
    console.error(
      "⚠️  Failed to sync frontend deployment file:",
      error.message
    );
    // Không throw error vì đây chỉ là sync, không ảnh hưởng deployment
  }

  // === SUMMARY ===
  console.log("\n🎉 ITEM PASS DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 ItemPass System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • ItemProxy: ${itemProxyAddress}`);
  console.log(`   • ItemPassComponent: ${itemPassComponentAddress}`);
  console.log(`   • ItemPassProxy: ${itemPassProxyAddress}`);
  console.log(`   • ItemPassLogic: ${itemPassLogicAddress}`);
  console.log("\n✅ ItemPass contracts deployed successfully!");
  console.log("\n📝 Deployment files updated!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • Test ItemPass activation functionality`);
  console.log(`   • Verify pass duration calculations`);
  console.log(`   • Test cumulative pass time when extending`);
  console.log(`   • Update frontend configuration if needed`);
  console.log("\n🎁 ItemPass System Features:");
  console.log(`   • Activate ItemPass using items from inventory`);
  console.log(`   • Duration based on item's GrowthRate attribute`);
  console.log(`   • Cumulative time extension for active passes`);
  console.log(`   • Check pass status and expiration`);
  console.log(`   • Automatic item deduction from inventory`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ItemPass deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
