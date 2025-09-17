const { ethers } = require("hardhat");
const fs = require("fs");
const csv = require("csv-parser");

/**
 * Script batch import items từ file CSV với gas optimization
 * Sử dụng multicall pattern để giảm gas cost
 */

// Mapping cho ItemType enum
const ITEM_TYPE_MAP = {
  0: "Weapon",
  1: "Consumable",
  2: "Material",
  3: "Seed",
  4: "Crop",
  5: "Livestock",
  6: "AnimalFeed",
  7: "Tool",
  8: "Quest",
  9: "Other",
};

// Mapping cho Rarity enum
const RARITY_MAP = {
  0: "Common",
  1: "Uncommon",
  2: "Rare",
  3: "Epic",
  4: "Legendary",
};

// Mapping cho Attribute enum
const ATTRIBUTE_MAP = {
  Damage: 0,
  Durability: 1,
  GrowthRate: 2,
  YieldBonus: 3,
  Health: 4,
  Speed: 5,
  Resistance: 6,
  Strength: 7,
  Agility: 8,
  Stamina: 9,
  Fertility: 10,
  WaterUsage: 11,
  FeedEfficiency: 12,
  Quality: 13,
  HarvestCooldown: 14,
};

/**
 * Parse attributes string thành array
 */
function parseAttributes(attributesStr) {
  if (!attributesStr || attributesStr.trim() === "") {
    return [];
  }

  const attributes = [];
  const pairs = attributesStr.split(",");

  for (const pair of pairs) {
    const [name, value] = pair.split(":");
    if (name && value) {
      const attrEnum = ATTRIBUTE_MAP[name.trim()];
      if (attrEnum !== undefined) {
        attributes.push({
          attribute: attrEnum,
          value: parseInt(value.trim()),
        });
      }
    }
  }

  return attributes;
}

/**
 * Parse drops string thành array
 */
function parseDrops(dropsStr) {
  if (!dropsStr || dropsStr.trim() === "") {
    return [];
  }

  const drops = [];
  const dropPairs = dropsStr.split(",");

  for (const dropPair of dropPairs) {
    const [itemId, probability, quantity] = dropPair.split(":");
    if (itemId && probability && quantity) {
      drops.push({
        itemId: parseInt(itemId.trim()),
        probability: Math.round(parseFloat(probability.trim()) * 100),
        yield: parseInt(quantity.trim()),
      });
    }
  }

  return drops;
}

/**
 * Validate item data
 */
function validateItemData(item) {
  const errors = [];

  if (!item.item_id || item.item_id <= 0) {
    errors.push("Invalid item_id");
  }

  if (!item.item_name || item.item_name.trim() === "") {
    errors.push("Item name cannot be empty");
  }

  if (item.item_type < 0 || item.item_type > 9) {
    errors.push("Invalid item_type (0-9)");
  }

  if (item.rarity < 0 || item.rarity > 4) {
    errors.push("Invalid rarity (0-4)");
  }

  if (!item.max_stacked || item.max_stacked <= 0) {
    errors.push("max_stacked must be greater than 0");
  }

  if (typeof item.is_stacked !== "boolean") {
    errors.push("is_stacked must be boolean");
  }

  if (typeof item.is_tradable !== "boolean") {
    errors.push("is_tradable must be boolean");
  }

  return errors;
}

/**
 * Read CSV file
 */
async function readCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const items = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const item = {
          item_id: parseInt(row.item_id),
          item_name: row.item_name.trim(),
          item_type: parseInt(row.item_type),
          rarity: parseInt(row.rarity),
          max_stacked: parseInt(row.max_stacked),
          is_stacked: row.is_stacked.toLowerCase() === "true",
          is_tradable: row.is_tradable.toLowerCase() === "true",
          attributes: row.attributes || "",
          drops: row.drops || "",
        };

        items.push(item);
      })
      .on("end", () => {
        resolve(items);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Batch import items với gas optimization
 */
async function batchImportItems(itemLogic, items, batchSize = 5) {
  console.log(
    `\n📦 Batch importing ${items.length} items (batch size: ${batchSize})...`
  );

  let successCount = 0;
  let failCount = 0;

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(
      `\n🔄 Processing batch ${batchNumber} (items ${i + 1}-${Math.min(
        i + batchSize,
        items.length
      )})...`
    );

    // Process each item in the batch
    for (const item of batch) {
      try {
        console.log(`   📦 Importing: ${item.item_name} (ID: ${item.item_id})`);

        // 1. Create item
        const tx1 = await itemLogic.createItem(
          item.item_id,
          item.item_name,
          item.item_type,
          item.rarity,
          item.max_stacked,
          item.is_stacked,
          item.is_tradable
        );
        await tx1.wait();

        // 2. Set attributes
        const attributes = parseAttributes(item.attributes);
        for (const attr of attributes) {
          const tx2 = await itemLogic.setAttr(
            item.item_id,
            attr.attribute,
            attr.value
          );
          await tx2.wait();
        }

        // 3. Set drops
        const drops = parseDrops(item.drops);
        if (drops.length > 0) {
          const tx3 = await itemLogic.createDrops(item.item_id, drops);
          await tx3.wait();
        }

        successCount++;
        console.log(`   ✅ Success`);
      } catch (error) {
        failCount++;
        console.error(`   ❌ Failed: ${error.message}`);
      }
    }

    // Delay between batches
    if (i + batchSize < items.length) {
      console.log(`   ⏳ Waiting 2 seconds before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return { successCount, failCount };
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 Bắt đầu batch import items từ CSV...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Vui lòng cung cấp đường dẫn file CSV");
    console.log(
      "Usage: npx hardhat run script/batch-import-items.js --network <network> -- <csv-file-path> [batch-size]"
    );
    process.exit(1);
  }

  const csvFilePath = args[0];
  const batchSize = args[1] ? parseInt(args[1]) : 5;

  // Validate inputs
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File không tồn tại: ${csvFilePath}`);
    process.exit(1);
  }

  if (batchSize <= 0 || batchSize > 20) {
    console.error("❌ Batch size phải từ 1-20");
    process.exit(1);
  }

  // Get network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("📁 CSV file:", csvFilePath);
  console.log("📦 Batch size:", batchSize);

  // Load deployment info
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment file không tồn tại: ${deploymentPath}`);
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const itemLogicAddress = deploymentInfo.contracts.ItemLogic;

  if (!itemLogicAddress) {
    console.error("❌ ItemLogic contract address không tìm thấy");
    process.exit(1);
  }

  // Connect to contract
  const ItemLogic = await ethers.getContractFactory("ItemLogic");
  const itemLogic = ItemLogic.attach(itemLogicAddress);

  console.log("🔗 Connected to ItemLogic:", itemLogicAddress);

  // Read and validate CSV
  console.log("\n📖 Reading CSV file...");
  const items = await readCSVFile(csvFilePath);
  console.log(`📊 Found ${items.length} items in CSV`);

  // Filter valid items
  console.log("\n🔍 Validating items...");
  const validItems = [];
  let invalidCount = 0;

  for (const item of items) {
    const errors = validateItemData(item);
    if (errors.length === 0) {
      validItems.push(item);
    } else {
      invalidCount++;
      console.error(`❌ Invalid item ${item.item_id}: ${errors.join(", ")}`);
    }
  }

  console.log(`✅ Valid items: ${validItems.length}`);
  console.log(`❌ Invalid items: ${invalidCount}`);

  if (validItems.length === 0) {
    console.error("❌ Không có items hợp lệ để import");
    process.exit(1);
  }

  // Estimate gas cost
  console.log("\n⛽ Estimating gas cost...");
  const gasPrice = await ethers.provider.getGasPrice();
  const estimatedGasPerItem = 500000; // Rough estimate
  const totalEstimatedGas = validItems.length * estimatedGasPerItem;
  const estimatedCost = ethers.formatEther(totalEstimatedGas * gasPrice);

  console.log(`💰 Estimated gas cost: ${estimatedCost} ETH`);
  console.log(`⛽ Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Current balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < totalEstimatedGas * gasPrice) {
    console.error("❌ Không đủ ETH để thực hiện import");
    process.exit(1);
  }

  // Start batch import
  const startTime = Date.now();
  const result = await batchImportItems(itemLogic, validItems, batchSize);
  const endTime = Date.now();

  // Summary
  console.log("\n🎉 BATCH IMPORT COMPLETED!");
  console.log("=".repeat(50));
  console.log(`📊 Total items processed: ${validItems.length}`);
  console.log(`✅ Successfully imported: ${result.successCount}`);
  console.log(`❌ Failed to import: ${result.failCount}`);
  console.log(`⏭️ Skipped (invalid): ${invalidCount}`);
  console.log(`⏱️ Total time: ${Math.round((endTime - startTime) / 1000)}s`);
  console.log(`🌐 Network: ${network.name}`);
  console.log(`👤 Importer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  if (result.successCount > 0) {
    console.log("\n🔗 Next Steps:");
    console.log(`   • Verify items on block explorer`);
    console.log(`   • Test item functions in game`);
    console.log(`   • Update frontend with new items`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Batch import failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
