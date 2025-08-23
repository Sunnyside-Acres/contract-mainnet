const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy single contract...");

  // Lấy tham số từ environment variable thay vì process.argv
  const contractName = process.env.CONTRACT_NAME;
  const privateKey = process.env.PRIVATE_KEY;
  const network = process.env.NETWORK || "local";

  if (!contractName) {
    console.error(
      "❌ Vui lòng cung cấp tên contract qua environment variable: CONTRACT_NAME=<ContractName> npx hardhat run script/deploy-single.js"
    );
    process.exit(1);
  }

  // Lấy signer và network info
  let deployer;
  if (network === "seimainnet" && privateKey) {
    // Sử dụng private key cho mainnet
    const provider = new ethers.JsonRpcProvider("https://evm-rpc.sei-apis.com");
    deployer = new ethers.Wallet(privateKey, provider);
    console.log("🔑 Sử dụng private key cho mainnet deployment");
  } else {
    // Sử dụng default signer cho local network
    [deployer] = await ethers.getSigners();
  }

  const networkInfo = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log(
    "🌐 Network:",
    networkInfo.name || `Chain ID: ${networkInfo.chainId}`
  );
  console.log("📦 Contract to deploy:", contractName);
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  try {
    // Deploy contract
    console.log(`\n📦 Deploying ${contractName}...`);
    const ContractFactory = await ethers.getContractFactory(contractName);

    let contract;

    // Load existing deployment info to get required addresses
    const fs = require("fs");
    const fileName = `contract-addresses-${
      networkInfo.name || `chain-${networkInfo.chainId}`
    }.json`;
    const deploymentPath = `./deployed/${fileName}`;

    let existingAddresses = {};
    let existingInfo = { contracts: {} };
    if (fs.existsSync(deploymentPath)) {
      existingInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      existingAddresses = existingInfo.contracts || {};
      console.log(
        "📋 Loaded existing contract addresses:",
        Object.keys(existingAddresses)
      );
    }

    // Handle different constructor parameters based on contract type
    if (contractName.includes("Component")) {
      contract = await ContractFactory.connect(deployer).deploy();
    } else if (contractName === "FishingLogic") {
      // FishingLogic needs multiple proxy dependencies
      const worldAddress = existingAddresses.World;
      const inventoryProxyAddress = existingAddresses.InventoryProxy;
      const itemProxyAddress = existingAddresses.ItemProxy;
      const playerProxyAddress = existingAddresses.PlayerProxy;
      const weatherProxyAddress = existingAddresses.WeatherProxy;

      if (!worldAddress) {
        console.log("❌ World contract not found. Please deploy World first.");
        process.exit(1);
      }

      if (
        !inventoryProxyAddress ||
        !itemProxyAddress ||
        !playerProxyAddress ||
        !weatherProxyAddress
      ) {
        console.log(
          "❌ InventoryProxy, ItemProxy, PlayerProxy, and WeatherProxy required for FishingLogic"
        );
        console.log(
          "💡 Please deploy Inventory, Item, Player, and Weather features first"
        );
        process.exit(1);
      }

      contract = await ContractFactory.connect(deployer).deploy(
        worldAddress,
        inventoryProxyAddress,
        itemProxyAddress,
        playerProxyAddress,
        weatherProxyAddress
      );
    } else if (contractName.includes("Logic")) {
      // For other logic contracts, we need the world address and proxy address
      const worldAddress = existingAddresses.World;
      const proxyName = contractName.replace("Logic", "Proxy");
      const proxyAddress = existingAddresses[proxyName];

      if (!worldAddress) {
        console.log("❌ World contract not found. Please deploy World first.");
        process.exit(1);
      }

      if (!proxyAddress) {
        console.log(
          `❌ ${proxyName} not found. Please deploy ${proxyName} first.`
        );
        process.exit(1);
      }

      // Handle specific logic contracts with additional dependencies
      if (contractName === "PlotLogic") {
        const weatherProxyAddress = existingAddresses.WeatherProxy;
        const playerProxyAddress = existingAddresses.PlayerProxy;

        if (!weatherProxyAddress || !playerProxyAddress) {
          console.log("❌ WeatherProxy and PlayerProxy required for PlotLogic");
          console.log("💡 Please deploy Weather and Player features first");
          process.exit(1);
        }

        contract = await ContractFactory.connect(deployer).deploy(
          worldAddress,
          proxyAddress,
          weatherProxyAddress,
          playerProxyAddress
        );
      } else if (contractName === "InventoryLogic") {
        const itemProxyAddress = existingAddresses.ItemProxy;
        const playerProxyAddress = existingAddresses.PlayerProxy;

        if (!itemProxyAddress || !playerProxyAddress) {
          console.log(
            "❌ ItemProxy and PlayerProxy required for InventoryLogic"
          );
          console.log("💡 Please deploy Item and Player features first");
          process.exit(1);
        }

        contract = await ContractFactory.connect(deployer).deploy(
          worldAddress,
          proxyAddress,
          itemProxyAddress,
          playerProxyAddress
        );
      } else if (contractName === "PlantLogic") {
        const plotProxyAddress = existingAddresses.PlotProxy;
        const inventoryProxyAddress = existingAddresses.InventoryProxy;
        const weatherProxyAddress = existingAddresses.WeatherProxy;
        const itemProxyAddress = existingAddresses.ItemProxy;

        if (
          !plotProxyAddress ||
          !inventoryProxyAddress ||
          !weatherProxyAddress ||
          !itemProxyAddress
        ) {
          console.log(
            "❌ PlotProxy, InventoryProxy, WeatherProxy, and ItemProxy required for PlantLogic"
          );
          console.log(
            "💡 Please deploy Plot, Inventory, Weather, and Item features first"
          );
          process.exit(1);
        }

        contract = await ContractFactory.connect(deployer).deploy(
          worldAddress,
          proxyAddress,
          plotProxyAddress,
          inventoryProxyAddress,
          weatherProxyAddress,
          itemProxyAddress
        );
      } else {
        contract = await ContractFactory.connect(deployer).deploy(
          worldAddress,
          proxyAddress
        );
      }
    } else if (contractName === "NPCMarketComponent") {
      contract = await ContractFactory.connect(deployer).deploy();
    } else if (contractName === "NPCMarketProxy") {
      // NPCMarketProxy needs World and Component
      const worldAddress = existingAddresses.World;
      const npcMarketComponentAddress = existingAddresses.NPCMarketComponent;

      if (!worldAddress) {
        console.log("❌ World contract not found. Please deploy World first.");
        process.exit(1);
      }

      if (!npcMarketComponentAddress) {
        console.log(
          "❌ NPCMarketComponent not found. Please deploy NPCMarketComponent first."
        );
        process.exit(1);
      }

      contract = await ContractFactory.connect(deployer).deploy(
        worldAddress,
        deployer.address,
        npcMarketComponentAddress
      );
    } else if (contractName === "NPCMarketLogic") {
      // NPCMarketLogic needs multiple dependencies
      const worldAddress = existingAddresses.World;
      const npcMarketProxyAddress = existingAddresses.NPCMarketProxy;
      const itemProxyAddress = existingAddresses.ItemProxy;
      const inventoryProxyAddress = existingAddresses.InventoryProxy;
      const playerProxyAddress = existingAddresses.PlayerProxy;

      if (!worldAddress) {
        console.log("❌ World contract not found. Please deploy World first.");
        process.exit(1);
      }

      if (
        !npcMarketProxyAddress ||
        !itemProxyAddress ||
        !inventoryProxyAddress ||
        !playerProxyAddress
      ) {
        console.log(
          "❌ NPCMarketProxy, ItemProxy, InventoryProxy, and PlayerProxy required for NPCMarketLogic"
        );
        console.log(
          "💡 Please deploy NPCMarket, Item, Inventory, and Player features first"
        );
        process.exit(1);
      }

      contract = await ContractFactory.connect(deployer).deploy(
        worldAddress,
        npcMarketProxyAddress,
        itemProxyAddress,
        inventoryProxyAddress,
        playerProxyAddress
      );
    } else {
      contract = await ContractFactory.connect(deployer).deploy();
    }

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log(`✅ ${contractName} deployed to: ${contractAddress}`);

    // Save deployment info
    const deploymentInfo = {
      network: networkInfo.name || `chain-${networkInfo.chainId}`,
      chainId: Number(networkInfo.chainId),
      deployer: deployer.address,
      contracts: {
        [contractName]: contractAddress,
      },
      timestamp: new Date().toISOString(),
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Merge with new contract
    const updatedInfo = {
      ...existingInfo,
      contracts: {
        ...existingInfo.contracts,
        [contractName]: contractAddress,
      },
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(updatedInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    console.log("\n🎉 Single contract deployment completed successfully!");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
