const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy hệ thống Gacha...");

  // Lấy signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);

  // Lấy balance
  const balance = await deployer.getBalance();
  console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");

  // Deploy GachaComponent
  console.log("\n📦 Deploying GachaComponent...");
  const GachaComponent = await ethers.getContractFactory("GachaComponent");
  const gachaComponent = await GachaComponent.deploy();
  await gachaComponent.deployed();
  console.log("✅ GachaComponent deployed to:", gachaComponent.address);

  // Deploy GachaLogic
  console.log("\n🧠 Deploying GachaLogic...");
  const GachaLogic = await ethers.getContractFactory("GachaLogic");
  const gachaLogic = await GachaLogic.deploy(
    "0x...", // World contract address - cần thay thế
    gachaComponent.address,
    "0x...", // PlayerProxy address - cần thay thế
    "0x...", // InventoryProxy address - cần thay thế
    "0x...", // ItemProxy address - cần thay thế
    deployer.address // Deployer wallet address
  );
  await gachaLogic.deployed();
  console.log("✅ GachaLogic deployed to:", gachaLogic.address);

  // Deploy GachaProxy
  console.log("\n🔗 Deploying GachaProxy...");
  const GachaProxy = await ethers.getContractFactory("GachaProxy");
  const gachaProxy = await GachaProxy.deploy(
    "0x...", // World contract address - cần thay thế
    gachaLogic.address
  );
  await gachaProxy.deployed();
  console.log("✅ GachaProxy deployed to:", gachaProxy.address);

  // Verify contracts
  console.log("\n🔍 Verifying contracts...");

  try {
    await hre.run("verify:verify", {
      address: gachaComponent.address,
      constructorArguments: ["0x..."], // World contract address
    });
    console.log("✅ GachaComponent verified");
  } catch (error) {
    console.log("❌ GachaComponent verification failed:", error.message);
  }

     try {
     await hre.run("verify:verify", {
       address: gachaLogic.address,
       constructorArguments: [
         "0x...", // World contract address
         gachaComponent.address,
         "0x...", // PlayerProxy address
         "0x...", // InventoryProxy address
         "0x...", // ItemProxy address
         deployer.address, // Deployer wallet address
       ],
     });
     console.log("✅ GachaLogic verified");
   } catch (error) {
     console.log("❌ GachaLogic verification failed:", error.message);
   }

  try {
    await hre.run("verify:verify", {
      address: gachaProxy.address,
      constructorArguments: [
        "0x...", // World contract address
        gachaLogic.address,
      ],
    });
    console.log("✅ GachaProxy verified");
  } catch (error) {
    console.log("❌ GachaProxy verification failed:", error.message);
  }

  // Lưu địa chỉ contracts
  const contractAddresses = {
    GachaComponent: gachaComponent.address,
    GachaLogic: gachaLogic.address,
    GachaProxy: gachaProxy.address,
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Contract Addresses:");
  console.log(JSON.stringify(contractAddresses, null, 2));

  // Lưu vào file
  const fs = require("fs");
  const path = require("path");

  const addressesPath = path.join(
    __dirname,
    "../deployed/gacha-addresses.json"
  );
  fs.writeFileSync(addressesPath, JSON.stringify(contractAddresses, null, 2));
  console.log("\n💾 Contract addresses saved to:", addressesPath);

  console.log("\n🎉 Deploy hoàn tất!");
  console.log("📝 Để sử dụng:");
  console.log(
    "1. Cập nhật địa chỉ World, PlayerProxy, InventoryProxy, ItemProxy trong script"
  );
  console.log("2. Chạy lại script để deploy với địa chỉ chính xác");
  console.log("3. Register GachaLogic trong World contract");
  console.log("4. Tạo gacha pools và thêm items");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
