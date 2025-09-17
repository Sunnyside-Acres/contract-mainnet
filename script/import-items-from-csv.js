const { ethers } = require("hardhat");
const fs = require("fs");
const csv = require("csv-parser");

/**
 * Script import items từ file CSV
 *
 * Format CSV:
 * item_id,item_name,item_type,rarity,max_stacked,is_stacked,is_tradable,attributes,drops
 *
 * Ví dụ:
 * 1,Iron Sword,0,0,1,false,true,"Damage:15,Durability:100","2:25.5:2,3:15.2:1"
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
 * Format: "Damage:15,Durability:100"
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
      } else {
        console.warn(`⚠️ Unknown attribute: ${name.trim()}`);
      }
    }
  }

  return attributes;
}

/**
 * Parse drops string thành array
 * Format: "2:25.5:2,3:15.2:1"
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
        probability: Math.round(parseFloat(probability.trim()) * 100), // Convert to basis points
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

  // Validate required fields
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

  // Validate boolean fields
  if (typeof item.is_stacked !== "boolean") {
    errors.push("is_stacked must be boolean");
  }

  if (typeof item.is_tradable !== "boolean") {
    errors.push("is_tradable must be boolean");
  }

  return errors;
}

/**
 * Read và parse CSV file
 */
async function readCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const items = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        // Convert string values to appropriate types
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
 * Import single item
 */
async function importItem(itemLogic, item) {
  try {
    console.log(`\n📦 Importing item: ${item.item_name} (ID: ${item.item_id})`);

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
    console.log(`   ✅ Item created`);

    // 2. Set attributes
    const attributes = parseAttributes(item.attributes);
    for (const attr of attributes) {
      const tx2 = await itemLogic.setAttr(
        item.item_id,
        attr.attribute,
        attr.value
      );
      await tx2.wait();
      console.log(
        `   ✅ Attribute set: ${Object.keys(ATTRIBUTE_MAP)[attr.attribute]} = ${
          attr.value
        }`
      );
    }

    // 3. Set drops
    const drops = parseDrops(item.drops);
    if (drops.length > 0) {
      const tx3 = await itemLogic.createDrops(item.item_id, drops);
      await tx3.wait();
      console.log(`   ✅ Drops set: ${drops.length} drop(s)`);
    }

    return true;
  } catch (error) {
    console.error(
      `   ❌ Failed to import item ${item.item_name}:`,
      error.message
    );
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 Bắt đầu import items từ CSV...");

  // Lấy command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Vui lòng cung cấp đường dẫn file CSV");
    console.log(
      "Usage: npx hardhat run script/import-items-from-csv.js --network <network> -- <csv-file-path>"
    );
    process.exit(1);
  }

  const csvFilePath = args[0];

  // Kiểm tra file tồn tại
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File không tồn tại: ${csvFilePath}`);
    process.exit(1);
  }

  // Lấy network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("📁 CSV file:", csvFilePath);

  // Load deployment info
  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment file không tồn tại: ${deploymentPath}`);
    console.log("Vui lòng deploy contracts trước khi import data");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const itemLogicAddress = deploymentInfo.contracts.ItemLogic;

  if (!itemLogicAddress) {
    console.error(
      "❌ ItemLogic contract address không tìm thấy trong deployment info"
    );
    process.exit(1);
  }

  // Connect to ItemLogic contract
  const ItemLogic = await ethers.getContractFactory("ItemLogic");
  const itemLogic = ItemLogic.attach(itemLogicAddress);

  console.log("🔗 Connected to ItemLogic:", itemLogicAddress);

  // Read CSV file
  console.log("\n📖 Reading CSV file...");
  const items = await readCSVFile(csvFilePath);
  console.log(`📊 Found ${items.length} items in CSV`);

  // Validate all items first
  console.log("\n🔍 Validating items...");
  let validItems = 0;
  let invalidItems = 0;

  for (const item of items) {
    const errors = validateItemData(item);
    if (errors.length === 0) {
      validItems++;
    } else {
      invalidItems++;
      console.error(
        `❌ Item ${item.item_id} (${item.item_name}) validation failed:`,
        errors
      );
    }
  }

  console.log(`✅ Valid items: ${validItems}`);
  console.log(`❌ Invalid items: ${invalidItems}`);

  if (invalidItems > 0) {
    console.log(
      "\n⚠️ Có items không hợp lệ. Bạn có muốn tiếp tục với items hợp lệ? (y/N)"
    );
    // Trong script này, chúng ta sẽ bỏ qua items không hợp lệ
    console.log("🔄 Tiếp tục với items hợp lệ...");
  }

  // Import items
  console.log("\n📦 Bắt đầu import items...");
  let successCount = 0;
  let failCount = 0;

  for (const item of items) {
    const errors = validateItemData(item);
    if (errors.length === 0) {
      const success = await importItem(itemLogic, item);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Delay để tránh rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      failCount++;
      console.log(`⏭️ Skipping invalid item: ${item.item_name}`);
    }
  }

  // Summary
  console.log("\n🎉 IMPORT COMPLETED!");
  console.log("=".repeat(50));
  console.log(`📊 Total items processed: ${items.length}`);
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`❌ Failed to import: ${failCount}`);
  console.log(`⏭️ Skipped (invalid): ${invalidItems}`);
  console.log(`🌐 Network: ${network.name}`);
  console.log(`👤 Importer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  if (successCount > 0) {
    console.log("\n🔗 Next Steps:");
    console.log(`   • Verify items on block explorer`);
    console.log(`   • Test item functions in game`);
    console.log(`   • Update frontend with new items`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Import failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
