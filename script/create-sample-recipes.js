const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Creating sample crafting recipes...");

  // Load contract addresses
  const network = hre.network.name;
  const addressesPath = path.join(
    __dirname,
    "..",
    "deployed",
    `contract-addresses-${network}.json`
  );

  if (!fs.existsSync(addressesPath)) {
    console.error(`❌ Contract addresses file not found: ${addressesPath}`);
    console.log(
      "Please deploy contracts first using deploy-local.js or deploy-mainnet.js"
    );
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  console.log("📋 Loaded contract addresses:", addresses);

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Using account:", deployer.address);

  // Get CraftingLogic contract
  const CraftingLogic = await ethers.getContractFactory("CraftingLogic");
  const craftingLogic = CraftingLogic.attach(addresses.contracts.CraftingLogic);

  console.log(
    "📦 CraftingLogic contract address:",
    await craftingLogic.getAddress()
  );

  // Sample recipes data
  const sampleRecipes = [
    {
      name: "Basic Sword",
      resultItemId: 1,
      resultQuantity: 1,
      successRate: 8000, // 80%
      sunlightCost: 100,
      sunnyCost: 50,
      ingredients: [
        { itemId: 10, quantity: 2 }, // Iron Ore
        { itemId: 11, quantity: 1 }, // Wood
      ],
      minPlayerLevel: 5,
    },
    {
      name: "Health Potion",
      resultItemId: 2,
      resultQuantity: 3,
      successRate: 9500, // 95%
      sunlightCost: 50,
      sunnyCost: 25,
      ingredients: [
        { itemId: 20, quantity: 1 }, // Herb
        { itemId: 21, quantity: 1 }, // Water
      ],
      minPlayerLevel: 1,
    },
    {
      name: "Magic Staff",
      resultItemId: 3,
      resultQuantity: 1,
      successRate: 6000, // 60%
      sunlightCost: 200,
      sunnyCost: 100,
      ingredients: [
        { itemId: 12, quantity: 1 }, // Magic Crystal
        { itemId: 11, quantity: 2 }, // Wood
        { itemId: 22, quantity: 1 }, // Magic Essence
      ],
      minPlayerLevel: 15,
    },
    {
      name: "Steel Armor",
      resultItemId: 4,
      resultQuantity: 1,
      successRate: 7000, // 70%
      sunlightCost: 300,
      sunnyCost: 150,
      ingredients: [
        { itemId: 10, quantity: 5 }, // Iron Ore
        { itemId: 13, quantity: 2 }, // Steel Ingot
        { itemId: 23, quantity: 1 }, // Leather
      ],
      minPlayerLevel: 20,
    },
    {
      name: "Rare Gem",
      resultItemId: 5,
      resultQuantity: 1,
      successRate: 3000, // 30%
      sunlightCost: 500,
      sunnyCost: 250,
      ingredients: [
        { itemId: 14, quantity: 3 }, // Raw Gem
        { itemId: 24, quantity: 1 }, // Magic Powder
        { itemId: 25, quantity: 1 }, // Crystal Shard
      ],
      minPlayerLevel: 30,
    },
  ];

  console.log(`\n📝 Creating ${sampleRecipes.length} sample recipes...`);

  for (let i = 0; i < sampleRecipes.length; i++) {
    const recipe = sampleRecipes[i];
    console.log(
      `\n🔨 Creating recipe ${i + 1}/${sampleRecipes.length}: ${recipe.name}`
    );

    try {
      const tx = await craftingLogic.createRecipe(
        recipe.resultItemId,
        recipe.resultQuantity,
        recipe.successRate,
        recipe.sunlightCost,
        recipe.sunnyCost,
        recipe.ingredients,
        recipe.minPlayerLevel
      );

      const receipt = await tx.wait();
      console.log(`✅ Recipe "${recipe.name}" created successfully!`);
      console.log(`   Transaction hash: ${receipt.hash}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

      // Get the recipe ID from the event
      const event = receipt.logs.find((log) => {
        try {
          const parsed = craftingLogic.interface.parseLog(log);
          return parsed.name === "RecipeCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = craftingLogic.interface.parseLog(event);
        const recipeId = parsed.args.recipeId;
        console.log(`   Recipe ID: ${recipeId.toString()}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to create recipe "${recipe.name}":`,
        error.message
      );
    }
  }

  console.log("\n🎉 Sample recipes creation completed!");
  console.log("\n📊 Recipe Summary:");
  console.log("   - Basic Sword (ID: 1) - Level 5+");
  console.log("   - Health Potion (ID: 2) - Level 1+");
  console.log("   - Magic Staff (ID: 3) - Level 15+");
  console.log("   - Steel Armor (ID: 4) - Level 20+");
  console.log("   - Rare Gem (ID: 5) - Level 30+");

  console.log("\n💡 You can now test the crafting system in the frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
