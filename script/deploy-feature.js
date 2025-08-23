const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy feature contracts...");

  // Lấy tham số từ environment variable thay vì process.argv
  const featureName = process.env.FEATURE_NAME;
  if (!featureName) {
    console.error(
      "❌ Vui lòng cung cấp tên feature qua environment variable: FEATURE_NAME=<FeatureName> npx hardhat run script/deploy-feature.js"
    );
    console.log(
      "📋 Available features: Player, Item, Weather, Plot, Inventory, Plant, Fishing"
    );
    process.exit(1);
  }

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name || `Chain ID: ${network.chainId}`);
  console.log("🎯 Feature to deploy:", featureName);
  console.log(
    "💰 Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Define feature contracts
  const featureContracts = {
    Player: ["PlayerComponent", "PlayerProxy", "PlayerLogic"],
    Item: ["ItemComponent", "ItemProxy", "ItemLogic"],
    Weather: ["WeatherComponent", "WeatherProxy", "WeatherLogic"],
    Plot: ["PlotComponent", "PlotProxy", "PlotLogic"],
    Inventory: ["InventoryComponent", "InventoryProxy", "InventoryLogic"],
    Plant: ["PlantComponent", "PlantProxy", "PlantLogic"],
    Fishing: ["FishingLogic"],
  };

  const contractsToDeploy = featureContracts[featureName];
  if (!contractsToDeploy) {
    console.error(`❌ Feature "${featureName}" không được hỗ trợ`);
    console.log(
      "📋 Available features:",
      Object.keys(featureContracts).join(", ")
    );
    process.exit(1);
  }

  console.log(`📦 Contracts to deploy: ${contractsToDeploy.join(", ")}`);

  try {
    const deployedContracts = {};

    // Load existing deployment info to get required addresses
    const fs = require("fs");
    const fileName = `contract-addresses-${
      network.name || `chain-${network.chainId}`
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

    // Check required dependencies
    const requiredContracts = {
      World: existingAddresses.World,
      // Add other required contracts based on feature
    };

    // Check if World contract exists
    if (!requiredContracts.World) {
      console.log("⚠️ World contract not found. Deploying World first...");
      const WorldFactory = await ethers.getContractFactory("World");
      const world = await WorldFactory.deploy(deployer.address);
      await world.waitForDeployment();
      requiredContracts.World = await world.getAddress();
      console.log(`✅ World deployed to: ${requiredContracts.World}`);
    }

    // Deploy contracts in order: Component -> Proxy -> Logic
    for (const contractName of contractsToDeploy) {
      console.log(`\n📦 Deploying ${contractName}...`);
      const ContractFactory = await ethers.getContractFactory(contractName);

      let contract;

      if (contractName.includes("Component")) {
        contract = await ContractFactory.deploy();
      } else if (contractName.includes("Proxy")) {
        // For proxy contracts, we need World address and Component address
        const componentName = contractName.replace("Proxy", "Component");
        const componentAddress = deployedContracts[componentName];

        if (!componentAddress) {
          console.log(
            `❌ Component ${componentName} not found. Please deploy it first.`
          );
          process.exit(1);
        }

        contract = await ContractFactory.deploy(
          requiredContracts.World,
          deployer.address,
          componentAddress
        );
      } else if (contractName.includes("Logic")) {
        // Handle different logic contracts with their specific dependencies
        if (contractName === "FishingLogic") {
          // FishingLogic needs multiple proxy dependencies
          const inventoryProxyAddress = existingAddresses.InventoryProxy;
          const itemProxyAddress = existingAddresses.ItemProxy;
          const playerProxyAddress = existingAddresses.PlayerProxy;
          const weatherProxyAddress = existingAddresses.WeatherProxy;

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

          contract = await ContractFactory.deploy(
            requiredContracts.World,
            inventoryProxyAddress,
            itemProxyAddress,
            playerProxyAddress,
            weatherProxyAddress
          );
        } else {
          // For other logic contracts, we need World address and Proxy address
          const proxyName = contractName.replace("Logic", "Proxy");
          const proxyAddress = deployedContracts[proxyName];

          if (!proxyAddress) {
            console.log(
              `❌ Proxy ${proxyName} not found. Please deploy it first.`
            );
            process.exit(1);
          }

          if (contractName === "PlayerLogic") {
            contract = await ContractFactory.deploy(
              requiredContracts.World,
              proxyAddress
            );
          } else if (contractName === "ItemLogic") {
            contract = await ContractFactory.deploy(
              requiredContracts.World,
              proxyAddress
            );
          } else if (contractName === "WeatherLogic") {
            contract = await ContractFactory.deploy(
              requiredContracts.World,
              proxyAddress
            );
          } else if (contractName === "PlotLogic") {
            // PlotLogic needs additional dependencies
            const weatherProxyAddress = existingAddresses.WeatherProxy;
            const playerProxyAddress = existingAddresses.PlayerProxy;

            if (!weatherProxyAddress || !playerProxyAddress) {
              console.log(
                "❌ WeatherProxy and PlayerProxy required for PlotLogic"
              );
              console.log("💡 Please deploy Weather and Player features first");
              process.exit(1);
            }

            contract = await ContractFactory.deploy(
              requiredContracts.World,
              proxyAddress,
              weatherProxyAddress,
              playerProxyAddress
            );
          } else if (contractName === "InventoryLogic") {
            // InventoryLogic needs additional dependencies
            const itemProxyAddress = existingAddresses.ItemProxy;
            const playerProxyAddress = existingAddresses.PlayerProxy;

            if (!itemProxyAddress || !playerProxyAddress) {
              console.log(
                "❌ ItemProxy and PlayerProxy required for InventoryLogic"
              );
              console.log("💡 Please deploy Item and Player features first");
              process.exit(1);
            }

            contract = await ContractFactory.deploy(
              requiredContracts.World,
              proxyAddress,
              itemProxyAddress,
              playerProxyAddress
            );
          } else if (contractName === "PlantLogic") {
            // PlantLogic needs multiple dependencies
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

            contract = await ContractFactory.deploy(
              requiredContracts.World,
              proxyAddress,
              plotProxyAddress,
              inventoryProxyAddress,
              weatherProxyAddress,
              itemProxyAddress
            );
          } else {
            contract = await ContractFactory.deploy(
              requiredContracts.World,
              proxyAddress
            );
          }
        }
      }

      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();
      console.log(`✅ ${contractName} deployed to: ${contractAddress}`);

      deployedContracts[contractName] = contractAddress;
    }

    // Save deployment info
    const deploymentInfo = {
      network: network.name || `chain-${network.chainId}`,
      chainId: Number(network.chainId),
      deployer: deployer.address,
      contracts: deployedContracts,
      timestamp: new Date().toISOString(),
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Merge with new contracts
    const updatedInfo = {
      ...existingInfo,
      contracts: {
        ...existingInfo.contracts,
        ...deployedContracts,
      },
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(updatedInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    console.log(
      `\n🎉 ${featureName} feature deployment completed successfully!`
    );
    console.log(
      "💡 Note: For complete functionality, you may need to register Logic contracts with World"
    );
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
