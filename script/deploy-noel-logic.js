const { ethers } = require("hardhat");
const fs = require("fs");

// Helper: delay to reduce nonce issues
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🎄 Deploy NoelLogic (logic only)...");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer:", deployer.address);
  console.log("🌐 Network:", network.name, "ChainID:", Number(network.chainId));
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment:", deploymentPath);

  const worldAddress = deploymentInfo.contracts?.World;
  const noelProxyAddress = deploymentInfo.contracts?.NoelProxy;
  const inventoryProxyAddress = deploymentInfo.contracts?.InventoryProxy;
  const noelNFTAddress = deploymentInfo.contracts?.NoelNFT;

  console.log("\n📌 Required addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • NoelProxy:", noelProxyAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);
  console.log("   • NoelNFT:", noelNFTAddress);

  if (!worldAddress || !noelProxyAddress || !inventoryProxyAddress || !noelNFTAddress) {
    throw new Error("Thiếu địa chỉ: cần World, NoelProxy, InventoryProxy, NoelNFT.");
  }

  // Deploy NoelLogic
  console.log("\n🚀 Deploying NoelLogic...");
  const NoelLogic = await ethers.getContractFactory("NoelLogic");
  const noelLogic = await NoelLogic.deploy(
    worldAddress,
    noelProxyAddress,
    inventoryProxyAddress,
    noelNFTAddress
  );
  const noelLogicTx = await noelLogic.deploymentTransaction();
  if (noelLogicTx) {
    await noelLogicTx.wait(1);
    await delay(1000);
  }
  await noelLogic.waitForDeployment();
  const noelLogicAddress = await noelLogic.getAddress();
  console.log("✅ NoelLogic deployed to:", noelLogicAddress);

  // Register in World
  console.log("\n🔗 Register NoelLogic in World...");
  const world = await ethers.getContractAt("World", worldAddress);
  const already = await world.isLogicRegistered(noelLogicAddress);
  if (already) {
    console.log("⚠️  NoelLogic đã đăng ký trước đó.");
  } else {
    const regTx = await world.registerLogic(noelLogicAddress);
    await regTx.wait(1);
    await delay(1000);
    console.log("✅ NoelLogic registered in World.");
  }

  // Update deployment file
  console.log("\n💾 Updating deployment JSON...");
  deploymentInfo.contracts.NoelLogic = noelLogicAddress;
  deploymentInfo.timestamp = new Date().toISOString();
  if (!deploymentInfo.deploymentOrder) deploymentInfo.deploymentOrder = [];
  if (!deploymentInfo.deploymentOrder.includes("NoelLogic")) {
    deploymentInfo.deploymentOrder.push("NoelLogic");
  }
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Saved:", deploymentPath);

  // Sync frontend file
  try {
    const fePath = `./frontend/deployed/contract-addresses-${network.name}.json`;
    let feInfo = {};
    if (fs.existsSync(fePath)) {
      feInfo = JSON.parse(fs.readFileSync(fePath, "utf8"));
    } else {
      feInfo = { network: network.name, chainId: Number(network.chainId), contracts: {} };
    }
    feInfo.contracts = feInfo.contracts || {};
    feInfo.contracts.NoelLogic = noelLogicAddress;
    feInfo.timestamp = new Date().toISOString();
    const dir = "./frontend/deployed";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fePath, JSON.stringify(feInfo, null, 2));
    console.log("✅ Frontend deployment synced:", fePath);
  } catch (err) {
    console.warn("⚠️  Sync frontend failed:", err.message);
  }

  console.log("\n🎉 NoelLogic deployment hoàn tất!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deploy NoelLogic failed:", err);
    process.exit(1);
  });

