const { ethers } = require("hardhat");
const fs = require("fs");

// Helper function để delay giữa các transaction
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function để đợi transaction được confirm
async function waitForTransaction(tx, confirmations = 1) {
  const receipt = await tx.wait(confirmations);
  // Thêm delay nhỏ sau khi transaction được confirm
  await delay(1000);
  return receipt;
}

async function main() {
  console.log("🎄 Bắt đầu deploy Noel System (Full Stack)...");

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

  // Kiểm tra nonce hiện tại
  const currentNonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("🔢 Current nonce:", currentNonce);

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment info from:", deploymentPath);

  // Lấy địa chỉ các contracts cần thiết
  const worldAddress = deploymentInfo.contracts.World;
  const inventoryProxyAddress = deploymentInfo.contracts.InventoryProxy;

  console.log("\n📋 Required contract addresses:");
  console.log("   • World:", worldAddress);
  console.log("   • InventoryProxy:", inventoryProxyAddress);

  // Kiểm tra các contracts cần thiết
  if (!worldAddress) {
    throw new Error(
      "Thiếu World contract. Hãy deploy World contract trước."
    );
  }

  if (!inventoryProxyAddress) {
    throw new Error(
      "Thiếu InventoryProxy contract. NoelLogic cần InventoryProxy để lưu gifts."
    );
  }

  // === PHASE 1: DEPLOY NOEL COMPONENT ===
  console.log("\n🎄 PHASE 1: Deploying NoelComponent...");
  const NoelComponent = await ethers.getContractFactory("NoelComponent");
  const noelComponent = await NoelComponent.deploy();
  const noelComponentTx = await noelComponent.deploymentTransaction();
  if (noelComponentTx) {
    await waitForTransaction(noelComponentTx);
  }
  await noelComponent.waitForDeployment();
  const noelComponentAddress = await noelComponent.getAddress();
  console.log("✅ NoelComponent deployed to:", noelComponentAddress);
  await delay(2000); // Delay 2 giây giữa các deployment

  // === PHASE 2: DEPLOY NOEL PROXY ===
  console.log("\n🎄 PHASE 2: Deploying NoelProxy...");
  const NoelProxy = await ethers.getContractFactory("NoelProxy");
  const noelProxy = await NoelProxy.deploy(
    worldAddress,
    noelComponentAddress
  );
  const noelProxyTx = await noelProxy.deploymentTransaction();
  if (noelProxyTx) {
    await waitForTransaction(noelProxyTx);
  }
  await noelProxy.waitForDeployment();
  const noelProxyAddress = await noelProxy.getAddress();
  console.log("✅ NoelProxy deployed to:", noelProxyAddress);
  await delay(2000); // Delay 2 giây giữa các deployment

  // === PHASE 3: DEPLOY NOEL NFT ===
  console.log("\n🎄 PHASE 3: Deploying NoelNFT...");
  const NoelNFT = await ethers.getContractFactory("NoelNFT");
  const noelNFTName = "Noel NFT";
  const noelNFTSymbol = "NOELNFT";
  const noelNFTBaseURI = process.env.NOEL_NFT_BASE_URI || "https://api.sunnyside.game/nft/noel/";
  console.log("   • Name:", noelNFTName);
  console.log("   • Symbol:", noelNFTSymbol);
  console.log("   • Base URI:", noelNFTBaseURI);
  
  const noelNFT = await NoelNFT.deploy(
    worldAddress,
    noelNFTName,
    noelNFTSymbol,
    noelNFTBaseURI
  );
  const noelNFTTx = await noelNFT.deploymentTransaction();
  if (noelNFTTx) {
    await waitForTransaction(noelNFTTx);
  }
  await noelNFT.waitForDeployment();
  const noelNFTAddress = await noelNFT.getAddress();
  console.log("✅ NoelNFT deployed to:", noelNFTAddress);
  await delay(2000); // Delay 2 giây giữa các deployment

  // === PHASE 4: DEPLOY NOEL LOGIC ===
  console.log("\n🎄 PHASE 4: Deploying NoelLogic...");
  const NoelLogic = await ethers.getContractFactory("NoelLogic");
  const noelLogic = await NoelLogic.deploy(
    worldAddress,
    noelProxyAddress,
    inventoryProxyAddress,
    noelNFTAddress
  );
  const noelLogicTx = await noelLogic.deploymentTransaction();
  if (noelLogicTx) {
    await waitForTransaction(noelLogicTx);
  }
  await noelLogic.waitForDeployment();
  const noelLogicAddress = await noelLogic.getAddress();
  console.log("✅ NoelLogic deployed to:", noelLogicAddress);

  console.log("\n✅ Tất cả Noel contracts đã được deploy thành công!");

  // === PHASE 5: REGISTER NOEL LOGIC IN WORLD ===
  console.log("\n🔗 PHASE 5: Registering NoelLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Register NoelLogic
    console.log("   • Checking if NoelLogic is already registered...");
    const isNoelRegistered = await world.isLogicRegistered(noelLogicAddress);
    if (isNoelRegistered) {
      console.log("   ⚠️  NoelLogic already registered in World");
    } else {
      console.log("   • Registering NoelLogic in World contract...");
      const registerNoelTx = await world.registerLogic(noelLogicAddress);
      await waitForTransaction(registerNoelTx);
      console.log("✅ NoelLogic registered successfully in World!");
    }
  } catch (error) {
    console.error("❌ Failed to register NoelLogic:", error.message);
    throw error;
  }

  // === PHASE 6: UPDATE DEPLOYMENT INFO ===
  console.log("\n💾 PHASE 6: Updating Deployment Information...");

  try {
    // Cập nhật địa chỉ Noel contracts
    deploymentInfo.contracts.NoelComponent = noelComponentAddress;
    deploymentInfo.contracts.NoelProxy = noelProxyAddress;
    deploymentInfo.contracts.NoelNFT = noelNFTAddress;
    deploymentInfo.contracts.NoelLogic = noelLogicAddress;

    // Cập nhật timestamp
    deploymentInfo.timestamp = new Date().toISOString();

    // Cập nhật deployment order
    if (!deploymentInfo.deploymentOrder) {
      deploymentInfo.deploymentOrder = [];
    }
    const contractsToAdd = [
      "NoelComponent",
      "NoelProxy",
      "NoelNFT",
      "NoelLogic",
    ];
    contractsToAdd.forEach((contractName) => {
      if (!deploymentInfo.deploymentOrder.includes(contractName)) {
        deploymentInfo.deploymentOrder.push(contractName);
      }
    });

    // Ghi đè file deployment
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Deployment info updated in: ${deploymentPath}`);
    console.log(`   • NoelComponent: ${noelComponentAddress}`);
    console.log(`   • NoelProxy: ${noelProxyAddress}`);
    console.log(`   • NoelNFT: ${noelNFTAddress}`);
    console.log(`   • NoelLogic: ${noelLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === PHASE 7: SYNC FRONTEND DEPLOYMENT FILE ===
  console.log("\n🔄 PHASE 7: Syncing Frontend Deployment File...");

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

    // Cập nhật Noel contracts
    frontendDeploymentInfo.contracts.NoelComponent = noelComponentAddress;
    frontendDeploymentInfo.contracts.NoelProxy = noelProxyAddress;
    frontendDeploymentInfo.contracts.NoelNFT = noelNFTAddress;
    frontendDeploymentInfo.contracts.NoelLogic = noelLogicAddress;

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
  console.log("\n🎉 NOEL SYSTEM DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 Noel System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • NoelComponent: ${noelComponentAddress}`);
  console.log(`   • NoelProxy: ${noelProxyAddress}`);
  console.log(`   • NoelNFT: ${noelNFTAddress}`);
  console.log(`   • NoelLogic: ${noelLogicAddress}`);
  console.log("\n✅ All Noel contracts deployed successfully!");
  console.log("\n📝 Deployment files updated!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • NoelLogic đã được đăng ký trong World contract`);
  console.log(`   • Configure startTime và endTime cho Noel event`);
  console.log(`   • Set waitingTime và spaceTime cho claim windows`);
  console.log(`   • Set giftRedemptionMilestones (số gifts cần để đổi NFT)`);
  console.log(`   • Test Noel functions:`);
  console.log(`     - claimGift(itemId, amount, proof): Claim gifts`);
  console.log(`     - safeMint(itemId, proof): Mint NFT khi đủ gifts`);
  console.log(`     - canClaimGift(): Check nếu trong claim window`);
  console.log(`     - isClaimedGift(address): Check nếu đã claim trong cycle hiện tại`);
  console.log(`   • Update frontend configuration`);
  console.log("\n🎄 Noel System Features:");
  console.log(`   • Gift claiming với proof signature từ admin`);
  console.log(`   • Time-based claim windows (spaceTime và waitingTime)`);
  console.log(`   • Exp: spaceTime=2h, waitingTime=5min`);
  console.log(`     -> Claim window: 0h00-0h05, 2h00-2h05, 4h00-4h05, ...`);
  console.log(`   • Gift accumulation và tracking trong Inventory`);
  console.log(`   • NFT minting khi đủ giftRedemptionMilestones`);
  console.log(`   • One NFT per address (hasMinted tracking)`);
  console.log(`   • Event period với startTime và endTime`);
  console.log(`   • Cycle-based claim prevention (không claim 2 lần trong 1 cycle)`);
  console.log(`   • Nonce tracking để tránh replay attacks`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Noel System deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });

