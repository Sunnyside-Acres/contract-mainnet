const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🛠️  Bắt đầu setup NPCMarketNative với dữ liệu mẫu...");

  // Lấy signer và network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);

  // Load địa chỉ contracts đã deploy
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const npcMarketNativeLogicAddress =
    deploymentInfo.contracts.NPCMarketNativeLogic;

  if (!npcMarketNativeLogicAddress) {
    throw new Error("NPCMarketNativeLogic not found in deployment file");
  }

  console.log("📋 NPCMarketNativeLogic address:", npcMarketNativeLogicAddress);

  // Get contract instance
  const npcMarketNativeLogic = await ethers.getContractAt(
    "NPCMarketNativeLogic",
    npcMarketNativeLogicAddress
  );

  // === SETUP NPC MARKETS ===
  console.log("\n🏪 SETUP: Creating NPC Markets...");

  const markets = [
    {
      npcId: 1,
      name: "Blacksmith",
      minAmount: "0.001",
      maxAmount: "10",
    },
    {
      npcId: 2,
      name: "Potion Shop",
      minAmount: "0.0005",
      maxAmount: "5",
    },
    {
      npcId: 3,
      name: "Weapon Dealer",
      minAmount: "0.01",
      maxAmount: "50",
    },
    {
      npcId: 4,
      name: "General Store",
      minAmount: "0.0001",
      maxAmount: "2",
    },
  ];

  for (const market of markets) {
    try {
      console.log(`   • Creating ${market.name} (NPC ${market.npcId})...`);
      const createTx = await npcMarketNativeLogic.createNPCMarket(
        market.npcId,
        market.name,
        ethers.parseEther(market.minAmount),
        ethers.parseEther(market.maxAmount)
      );
      await createTx.wait();
      console.log(`   ✅ ${market.name} created successfully!`);
    } catch (error) {
      console.error(`   ❌ Failed to create ${market.name}:`, error.message);
    }
  }

  // === SETUP ITEMS FOR BLACKSMITH ===
  console.log("\n⚔️  SETUP: Adding Weapons to Blacksmith...");

  const blacksmithItems = [
    {
      itemId: 201,
      name: "Iron Sword",
      price: "0.1",
      limit: 3,
      isSelling: true,
    },
    {
      itemId: 202,
      name: "Steel Sword",
      price: "0.3",
      limit: 2,
      isSelling: true,
    },
    {
      itemId: 203,
      name: "Diamond Sword",
      price: "1.0",
      limit: 1,
      isSelling: true,
    },
    { itemId: 204, name: "Iron Axe", price: "0.15", limit: 5, isSelling: true },
    { itemId: 205, name: "Steel Axe", price: "0.4", limit: 3, isSelling: true },
    {
      itemId: 206,
      name: "Broken Sword",
      price: "0.02",
      limit: 0,
      isSelling: false,
    }, // NPC buys broken weapons
  ];

  for (const item of blacksmithItems) {
    try {
      console.log(`   • Adding ${item.name} (ID: ${item.itemId})...`);

      // Create item first
      const itemProxy = await ethers.getContractAt(
        "ItemComponent",
        deploymentInfo.contracts.ItemProxy
      );
      const createItemTx = await itemProxy.createItem(
        item.itemId,
        item.name,
        `A ${item.name.toLowerCase()} for testing`,
        1, // itemType (weapon)
        100, // maxStack
        false, // isConsumable
        true, // isTradeable
        false, // isBanned
        item.itemId > 203 ? 3 : item.itemId > 202 ? 2 : 1 // rarity
      );
      await createItemTx.wait();

      // Add to market
      const addTx = await npcMarketNativeLogic.addItemToMarket(
        1, // npcId (Blacksmith)
        item.itemId,
        item.limit,
        ethers.parseEther(item.price),
        item.isSelling
      );
      await addTx.wait();
      console.log(`   ✅ ${item.name} added to Blacksmith!`);
    } catch (error) {
      console.error(`   ❌ Failed to add ${item.name}:`, error.message);
    }
  }

  // === SETUP ITEMS FOR POTION SHOP ===
  console.log("\n🧪 SETUP: Adding Potions to Potion Shop...");

  const potionItems = [
    {
      itemId: 301,
      name: "Health Potion",
      price: "0.05",
      limit: 10,
      isSelling: true,
    },
    {
      itemId: 302,
      name: "Mana Potion",
      price: "0.05",
      limit: 10,
      isSelling: true,
    },
    {
      itemId: 303,
      name: "Stamina Potion",
      price: "0.03",
      limit: 15,
      isSelling: true,
    },
    {
      itemId: 304,
      name: "Strength Potion",
      price: "0.2",
      limit: 3,
      isSelling: true,
    },
    {
      itemId: 305,
      name: "Empty Bottle",
      price: "0.01",
      limit: 0,
      isSelling: false,
    }, // NPC buys empty bottles
  ];

  for (const item of potionItems) {
    try {
      console.log(`   • Adding ${item.name} (ID: ${item.itemId})...`);

      // Create item first
      const itemProxy = await ethers.getContractAt(
        "ItemComponent",
        deploymentInfo.contracts.ItemProxy
      );
      const createItemTx = await itemProxy.createItem(
        item.itemId,
        item.name,
        `A ${item.name.toLowerCase()} for testing`,
        2, // itemType (consumable)
        100, // maxStack
        true, // isConsumable
        true, // isTradeable
        false, // isBanned
        1 // rarity
      );
      await createItemTx.wait();

      // Add to market
      const addTx = await npcMarketNativeLogic.addItemToMarket(
        2, // npcId (Potion Shop)
        item.itemId,
        item.limit,
        ethers.parseEther(item.price),
        item.isSelling
      );
      await addTx.wait();
      console.log(`   ✅ ${item.name} added to Potion Shop!`);
    } catch (error) {
      console.error(`   ❌ Failed to add ${item.name}:`, error.message);
    }
  }

  // === SETUP ITEMS FOR WEAPON DEALER ===
  console.log("\n🗡️  SETUP: Adding Premium Weapons to Weapon Dealer...");

  const weaponDealerItems = [
    {
      itemId: 401,
      name: "Legendary Sword",
      price: "5.0",
      limit: 1,
      isSelling: true,
    },
    {
      itemId: 402,
      name: "Mystic Blade",
      price: "3.0",
      limit: 2,
      isSelling: true,
    },
    {
      itemId: 403,
      name: "Ancient Axe",
      price: "4.0",
      limit: 1,
      isSelling: true,
    },
    {
      itemId: 404,
      name: "Magic Staff",
      price: "2.5",
      limit: 3,
      isSelling: true,
    },
    {
      itemId: 405,
      name: "Rare Weapon Parts",
      price: "0.5",
      limit: 0,
      isSelling: false,
    }, // NPC buys rare parts
  ];

  for (const item of weaponDealerItems) {
    try {
      console.log(`   • Adding ${item.name} (ID: ${item.itemId})...`);

      // Create item first
      const itemProxy = await ethers.getContractAt(
        "ItemComponent",
        deploymentInfo.contracts.ItemProxy
      );
      const createItemTx = await itemProxy.createItem(
        item.itemId,
        item.name,
        `A ${item.name.toLowerCase()} for testing`,
        1, // itemType (weapon)
        1, // maxStack (unique items)
        false, // isConsumable
        true, // isTradeable
        false, // isBanned
        5 // rarity (legendary)
      );
      await createItemTx.wait();

      // Add to market
      const addTx = await npcMarketNativeLogic.addItemToMarket(
        3, // npcId (Weapon Dealer)
        item.itemId,
        item.limit,
        ethers.parseEther(item.price),
        item.isSelling
      );
      await addTx.wait();
      console.log(`   ✅ ${item.name} added to Weapon Dealer!`);
    } catch (error) {
      console.error(`   ❌ Failed to add ${item.itemId}:`, error.message);
    }
  }

  // === SETUP ITEMS FOR GENERAL STORE ===
  console.log("\n🏪 SETUP: Adding General Items to General Store...");

  const generalStoreItems = [
    { itemId: 501, name: "Rope", price: "0.01", limit: 20, isSelling: true },
    { itemId: 502, name: "Torch", price: "0.02", limit: 15, isSelling: true },
    { itemId: 503, name: "Bandage", price: "0.01", limit: 25, isSelling: true },
    {
      itemId: 504,
      name: "Water Bottle",
      price: "0.005",
      limit: 30,
      isSelling: true,
    },
    {
      itemId: 505,
      name: "Old Cloth",
      price: "0.005",
      limit: 0,
      isSelling: false,
    }, // NPC buys old materials
  ];

  for (const item of generalStoreItems) {
    try {
      console.log(`   • Adding ${item.name} (ID: ${item.itemId})...`);

      // Create item first
      const itemProxy = await ethers.getContractAt(
        "ItemComponent",
        deploymentInfo.contracts.ItemProxy
      );
      const createItemTx = await itemProxy.createItem(
        item.itemId,
        item.name,
        `A ${item.name.toLowerCase()} for testing`,
        3, // itemType (misc)
        100, // maxStack
        item.itemId === 503, // isConsumable (bandage)
        true, // isTradeable
        false, // isBanned
        1 // rarity
      );
      await createItemTx.wait();

      // Add to market
      const addTx = await npcMarketNativeLogic.addItemToMarket(
        4, // npcId (General Store)
        item.itemId,
        item.limit,
        ethers.parseEther(item.price),
        item.isSelling
      );
      await addTx.wait();
      console.log(`   ✅ ${item.name} added to General Store!`);
    } catch (error) {
      console.error(`   ❌ Failed to add ${item.name}:`, error.message);
    }
  }

  // === FUND CONTRACT ===
  console.log("\n💰 SETUP: Funding Contract with ETH...");

  try {
    const fundAmount = ethers.parseEther("10.0"); // 10 ETH
    const fundTx = await deployer.sendTransaction({
      to: npcMarketNativeLogicAddress,
      value: fundAmount,
    });
    await fundTx.wait();

    const contractBalance = await ethers.provider.getBalance(
      npcMarketNativeLogicAddress
    );
    console.log(
      `✅ Contract funded with ${ethers.formatEther(fundAmount)} ETH`
    );
    console.log(
      `   • Contract balance: ${ethers.formatEther(contractBalance)} ETH`
    );
  } catch (error) {
    console.error("❌ Failed to fund contract:", error.message);
  }

  // === SUMMARY ===
  console.log("\n🎉 NPCMARKETNATIVE SETUP COMPLETED!");
  console.log("=".repeat(60));
  console.log("✅ All NPC markets and items setup successfully!");

  console.log("\n📋 Setup Summary:");
  console.log("   • 🏪 4 NPC Markets created");
  console.log("   • ⚔️  Blacksmith: 6 weapons (5 selling, 1 buying)");
  console.log("   • 🧪 Potion Shop: 5 potions (4 selling, 1 buying)");
  console.log(
    "   • 🗡️  Weapon Dealer: 5 premium weapons (4 selling, 1 buying)"
  );
  console.log("   • 🏪 General Store: 5 general items (4 selling, 1 buying)");
  console.log("   • 💰 Contract funded with 10 ETH");

  console.log("\n🔗 NPCMarketNative is ready for players!");
  console.log("\n📝 Usage Examples:");
  console.log("   // Buy Iron Sword from Blacksmith");
  console.log(
    "   await npcMarketNativeLogic.buyItemFromNPC{value: ethers.parseEther('0.1')}(1, 201, 1);"
  );
  console.log("   ");
  console.log("   // Sell Broken Sword to Blacksmith");
  console.log("   await npcMarketNativeLogic.sellItemToNPC(1, 206, 1);");
  console.log("   ");
  console.log("   // Buy Health Potion from Potion Shop");
  console.log(
    "   await npcMarketNativeLogic.buyItemFromNPC{value: ethers.parseEther('0.05')}(2, 301, 1);"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NPCMarketNative setup failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
