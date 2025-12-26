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
  console.log("🎊 Bắt đầu deploy NewYear System (Full Stack)...");

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

  console.log("\n📋 Required contract addresses:");
  console.log("   • World:", worldAddress);

  // Kiểm tra các contracts cần thiết
  if (!worldAddress) {
    throw new Error(
      "Thiếu World contract. Hãy deploy World contract trước."
    );
  }

  // === PHASE 1: DEPLOY NEWYEAR COMPONENT ===
  console.log("\n🎊 PHASE 1: Deploying NewYearComponent...");
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

  // === PHASE 2: DEPLOY NEWYEAR PROXY ===
  console.log("\n🎊 PHASE 2: Deploying NewYearProxy...");
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

  // === PHASE 3: DEPLOY NEWYEAR NFT ===
  console.log("\n🎊 PHASE 3: Deploying NewYearNFT...");
  const NewYearNFT = await ethers.getContractFactory("NewYearNFT");
  const newYearNFTName = "NewYear NFT";
  const newYearNFTSymbol = "NYNFT";
  const newYearNFTBaseURI = process.env.NEWYEAR_NFT_BASE_URI || "https://api.sunnyside.game/nft/newyear/";
  console.log("   • Name:", newYearNFTName);
  console.log("   • Symbol:", newYearNFTSymbol);
  console.log("   • Base URI:", newYearNFTBaseURI);
  
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
  await delay(2000); // Delay 2 giây giữa các deployment

  // === PHASE 4: DEPLOY NEWYEAR LOGIC ===
  console.log("\n🎊 PHASE 4: Deploying NewYearLogic...");
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

  // === PHASE 5: REGISTER NEWYEAR LOGIC IN WORLD ===
  console.log("\n🔗 PHASE 5: Registering NewYearLogic in World...");

  try {
    const world = await ethers.getContractAt("World", worldAddress);

    // Register NewYearLogic
    console.log("   • Checking if NewYearLogic is already registered...");
    const isNewYearRegistered = await world.isLogicRegistered(newYearLogicAddress);
    if (isNewYearRegistered) {
      console.log("   ⚠️  NewYearLogic already registered in World");
    } else {
      console.log("   • Registering NewYearLogic in World contract...");
      const registerNewYearTx = await world.registerLogic(newYearLogicAddress);
      await waitForTransaction(registerNewYearTx);
      console.log("✅ NewYearLogic registered successfully in World!");
    }
  } catch (error) {
    console.error("❌ Failed to register NewYearLogic:", error.message);
    throw error;
  }

  // === PHASE 6: UPDATE DEPLOYMENT INFO ===
  console.log("\n💾 PHASE 6: Updating Deployment Information...");

  try {
    // Cập nhật địa chỉ NewYear contracts
    deploymentInfo.contracts.NewYearComponent = newYearComponentAddress;
    deploymentInfo.contracts.NewYearProxy = newYearProxyAddress;
    deploymentInfo.contracts.NewYearNFT = newYearNFTAddress;
    deploymentInfo.contracts.NewYearLogic = newYearLogicAddress;

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

    // Cập nhật NewYear contracts
    frontendDeploymentInfo.contracts.NewYearComponent = newYearComponentAddress;
    frontendDeploymentInfo.contracts.NewYearProxy = newYearProxyAddress;
    frontendDeploymentInfo.contracts.NewYearNFT = newYearNFTAddress;
    frontendDeploymentInfo.contracts.NewYearLogic = newYearLogicAddress;

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
  console.log("\n🎉 NEWYEAR SYSTEM DEPLOYMENT COMPLETED SUCCESSFULLY!");
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
  console.log("\n✅ All NewYear contracts deployed successfully!");
  console.log("\n📝 Deployment files updated!");
  console.log("\n🔗 Next Steps:");
  console.log(`   • NewYearLogic đã được đăng ký trong World contract`);
  console.log(`   • Configure startTime và endTime cho NewYear event`);
  console.log(`   • Test NewYear functions:`);
  console.log(`     - safeMint(proof): Mint NFT với proof signature từ admin`);
  console.log(`     - canClaimNFT(): Check nếu trong claim period`);
  console.log(`     - isMinted(address): Check nếu address đã mint NFT`);
  console.log(`     - getStartTime() / getEndTime(): Get event time range`);
  console.log(`   • Update frontend configuration`);
  console.log("\n🎊 NewYear System Features:");
  console.log(`   • NFT minting với proof signature từ admin`);
  console.log(`   • Time-based claim period (startTime - endTime)`);
  console.log(`   • One NFT per address (hasMinted tracking)`);
  console.log(`   • Nonce tracking để tránh replay attacks`);
  console.log(`   • Simple event system (không cần Inventory như Noel)`);
  console.log(`   • ERC721 NFT với baseURI support`);
  console.log(`   • Token ID bắt đầu từ 1 và tự động tăng`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NewYear System deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });

