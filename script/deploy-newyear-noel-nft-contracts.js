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
  console.log("🚀 Bắt đầu deploy NewYear, Noel và NFT contracts...");

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
  console.log("   • InventoryProxy:", inventoryProxyAddress || "Not required for NewYear");

  // Kiểm tra các contracts cần thiết
  if (!worldAddress) {
    throw new Error(
      "Thiếu World contract. Hãy deploy World contract trước."
    );
  }

  if (!inventoryProxyAddress) {
    console.log("⚠️  InventoryProxy không tìm thấy, NoelLogic sẽ cần nó.");
  }

  // === PHASE 1: DEPLOY NEWYEAR CONTRACTS ===
  console.log("\n🎊 PHASE 1: Deploying NewYear Contracts...");

  // 1. Deploy NewYearComponent
  console.log("\n1️⃣ Deploying NewYearComponent...");
  const NewYearComponent = await ethers.getContractFactory("NewYearComponent");
  const newYearComponent = await NewYearComponent.deploy();
  const newYearComponentTx = await newYearComponent.deploymentTransaction();
  if (newYearComponentTx) {
    await waitForTransaction(newYearComponentTx);
  }
  await newYearComponent.waitForDeployment();
  const newYearComponentAddress = await newYearComponent.getAddress();
  console.log("✅ NewYearComponent deployed to:", newYearComponentAddress);
  await delay(2000); // Delay 2 giây giữa các deployment

  // 2. Deploy NewYearProxy
  console.log("\n2️⃣ Deploying NewYearProxy...");
  const NewYearProxy = await ethers.getContractFactory("NewYearProxy");
  const newYearProxy = await NewYearProxy.deploy(
    worldAddress,
    newYearComponentAddress
  );
  const newYearProxyTx = await newYearProxy.deploymentTransaction();
  if (newYearProxyTx) {
    await waitForTransaction(newYearProxyTx);
  }
  await newYearProxy.waitForDeployment();
  const newYearProxyAddress = await newYearProxy.getAddress();
  console.log("✅ NewYearProxy deployed to:", newYearProxyAddress);
  await delay(2000); // Delay 2 giây giữa các deployment

  // 3. Deploy NewYearNFT
  console.log("\n3️⃣ Deploying NewYearNFT...");
  const NewYearNFT = await ethers.getContractFactory("NewYearNFT");
  const newYearNFTName = "NewYear NFT";
  const newYearNFTSymbol = "NYNFT";
  const newYearNFTBaseURI = process.env.NEWYEAR_NFT_BASE_URI || "https://api.sunnyside.game/nft/newyear/";
  const newYearNFT = await NewYearNFT.deploy(
    worldAddress,
    newYearNFTName,
    newYearNFTSymbol,
    newYearNFTBaseURI
  );
  const newYearNFTTx = await newYearNFT.deploymentTransaction();
  if (newYearNFTTx) {
    await waitForTransaction(newYearNFTTx);
  }
  await newYearNFT.waitForDeployment();
  const newYearNFTAddress = await newYearNFT.getAddress();
  console.log("✅ NewYearNFT deployed to:", newYearNFTAddress);
  console.log("   • Name:", newYearNFTName);
  console.log("   • Symbol:", newYearNFTSymbol);
  console.log("   • Base URI:", newYearNFTBaseURI);
  await delay(2000); // Delay 2 giây giữa các deployment

  // 4. Deploy NewYearLogic
  console.log("\n4️⃣ Deploying NewYearLogic...");
  const NewYearLogic = await ethers.getContractFactory("NewYearLogic");
  const newYearLogic = await NewYearLogic.deploy(
    worldAddress,
    newYearProxyAddress,
    newYearNFTAddress
  );
  const newYearLogicTx = await newYearLogic.deploymentTransaction();
  if (newYearLogicTx) {
    await waitForTransaction(newYearLogicTx);
  }
  await newYearLogic.waitForDeployment();
  const newYearLogicAddress = await newYearLogic.getAddress();
  console.log("✅ NewYearLogic deployed to:", newYearLogicAddress);

  console.log("\n✅ Tất cả NewYear contracts đã được deploy thành công!");

  // === PHASE 2: DEPLOY NOEL CONTRACTS ===
  console.log("\n🎄 PHASE 2: Deploying Noel Contracts...");

  // 1. Deploy NoelComponent
  console.log("\n1️⃣ Deploying NoelComponent...");
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

  // 2. Deploy NoelProxy
  console.log("\n2️⃣ Deploying NoelProxy...");
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

  // 3. Deploy NoelNFT
  console.log("\n3️⃣ Deploying NoelNFT...");
  const NoelNFT = await ethers.getContractFactory("NoelNFT");
  const noelNFTName = "Noel NFT";
  const noelNFTSymbol = "NOELNFT";
  const noelNFTBaseURI = process.env.NOEL_NFT_BASE_URI || "https://api.sunnyside.game/nft/noel/";
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
  console.log("   • Name:", noelNFTName);
  console.log("   • Symbol:", noelNFTSymbol);
  console.log("   • Base URI:", noelNFTBaseURI);
  await delay(2000); // Delay 2 giây giữa các deployment

  // 4. Deploy NoelLogic
  console.log("\n4️⃣ Deploying NoelLogic...");
  if (!inventoryProxyAddress) {
    throw new Error(
      "InventoryProxy address is required for NoelLogic. Please deploy Inventory contracts first."
    );
  }
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

  // === PHASE 3: REGISTER LOGIC CONTRACTS IN WORLD ===
  console.log("\n🔗 PHASE 3: Registering Logic Contracts in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Register NewYearLogic
    console.log("   • Registering NewYearLogic in World contract...");
    const isNewYearRegistered = await world.isLogicRegistered(newYearLogicAddress);
    if (isNewYearRegistered) {
      console.log("   ⚠️  NewYearLogic already registered in World");
    } else {
      const registerNewYearTx = await world.registerLogic(newYearLogicAddress);
      await waitForTransaction(registerNewYearTx);
      console.log("✅ NewYearLogic registered successfully in World!");
    }
    await delay(2000); // Delay giữa các registration

    // Register NoelLogic
    console.log("   • Registering NoelLogic in World contract...");
    const isNoelRegistered = await world.isLogicRegistered(noelLogicAddress);
    if (isNoelRegistered) {
      console.log("   ⚠️  NoelLogic already registered in World");
    } else {
      const registerNoelTx = await world.registerLogic(noelLogicAddress);
      await waitForTransaction(registerNoelTx);
      console.log("✅ NoelLogic registered successfully in World!");
    }
  } catch (error) {
    console.error("❌ Failed to register Logic contracts:", error.message);
    throw error;
  }

  // === PHASE 4: UPDATE DEPLOYMENT INFO ===
  console.log("\n💾 PHASE 4: Updating Deployment Information...");

  try {
    // Cập nhật địa chỉ NewYear contracts
    deploymentInfo.contracts.NewYearComponent = newYearComponentAddress;
    deploymentInfo.contracts.NewYearProxy = newYearProxyAddress;
    deploymentInfo.contracts.NewYearNFT = newYearNFTAddress;
    deploymentInfo.contracts.NewYearLogic = newYearLogicAddress;

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
      "NewYearComponent",
      "NewYearProxy",
      "NewYearNFT",
      "NewYearLogic",
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
    console.log(`   • NewYearComponent: ${newYearComponentAddress}`);
    console.log(`   • NewYearProxy: ${newYearProxyAddress}`);
    console.log(`   • NewYearNFT: ${newYearNFTAddress}`);
    console.log(`   • NewYearLogic: ${newYearLogicAddress}`);
    console.log(`   • NoelComponent: ${noelComponentAddress}`);
    console.log(`   • NoelProxy: ${noelProxyAddress}`);
    console.log(`   • NoelNFT: ${noelNFTAddress}`);
    console.log(`   • NoelLogic: ${noelLogicAddress}`);
  } catch (error) {
    console.error("❌ Failed to update JSON file:", error.message);
  }

  // === PHASE 5: SYNC FRONTEND DEPLOYMENT FILE ===
  console.log("\n🔄 PHASE 5: Syncing Frontend Deployment File...");

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

    // Cập nhật NewYear contracts
    frontendDeploymentInfo.contracts.NewYearComponent = newYearComponentAddress;
    frontendDeploymentInfo.contracts.NewYearProxy = newYearProxyAddress;
    frontendDeploymentInfo.contracts.NewYearNFT = newYearNFTAddress;
    frontendDeploymentInfo.contracts.NewYearLogic = newYearLogicAddress;

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
  console.log("\n🎉 NEWYEAR, NOEL & NFT DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
  );
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📋 NewYear System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • NewYearComponent: ${newYearComponentAddress}`);
  console.log(`   • NewYearProxy: ${newYearProxyAddress}`);
  console.log(`   • NewYearNFT: ${newYearNFTAddress}`);
  console.log(`   • NewYearLogic: ${newYearLogicAddress}`);
  console.log("\n📋 Noel System Components:");
  console.log(`   • World Contract: ${worldAddress}`);
  console.log(`   • InventoryProxy: ${inventoryProxyAddress}`);
  console.log(`   • NoelComponent: ${noelComponentAddress}`);
  console.log(`   • NoelProxy: ${noelProxyAddress}`);
  console.log(`   • NoelNFT: ${noelNFTAddress}`);
  console.log(`   • NoelLogic: ${noelLogicAddress}`);
  console.log("\n✅ All contracts deployed successfully!");
  console.log("\n📝 Deployment files updated!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • NewYearLogic và NoelLogic đã được đăng ký trong World contract`);
  console.log(`   • Configure startTime và endTime cho NewYear và Noel events`);
  console.log(`   • Test NewYear functions (safeMint, canClaimNFT)`);
  console.log(`   • Test Noel functions (claimGift, safeMint, canClaimGift)`);
  console.log(`   • Update frontend configuration`);
  console.log("\n🎊 NewYear System Features:");
  console.log(`   • NFT minting với proof signature từ admin`);
  console.log(`   • Time-based claim period (startTime - endTime)`);
  console.log(`   • Nonce tracking để tránh replay attacks`);
  console.log(`   • One NFT per address`);
  console.log("\n🎄 Noel System Features:");
  console.log(`   • Gift claiming với proof signature từ admin`);
  console.log(`   • Time-based claim windows (spaceTime và waitingTime)`);
  console.log(`   • Gift accumulation và redemption milestones`);
  console.log(`   • NFT minting khi đủ gifts (giftRedemptionMilestones)`);
  console.log(`   • Inventory integration để lưu gifts`);
  console.log(`   • One NFT per address`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });

