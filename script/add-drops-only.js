const { ethers } = require("hardhat");
const fs = require("fs");
const csv = require("csv-parser");

/**
 * Script chỉ thêm drops cho items đã tồn tại
 *
 * Format CSV:
 * item_id,drops
 *
 * Ví dụ:
 * 1,"2:25:2,3:15:1"        (probability là số nguyên: 25% = 25)
 * 2,"4:50.5:1,5:10.0:3"    (probability là số thập phân: 50.5% = 50.5)
 * 3,"6:100:2"              (single drop với 100% chance)
 */

/**
 * Parse drops string thành array
 * Format: "2:25:2,3:15:1" hoặc "2:25.5:2,3:15.2:1"
 * Probability có thể là số nguyên (25) hoặc thập phân (25.5)
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
      const probValue = parseFloat(probability.trim());

      // Nếu probability <= 1, coi như đã là phần trăm thập phân (0.25 = 25%)
      // Nếu probability > 1, coi như đã là phần trăm nguyên (25 = 25%)
      let finalProbability;
      if (probValue <= 1) {
        finalProbability = Math.round(probValue * 10000); // 0.25 -> 2500 basis points
      } else {
        finalProbability = Math.round(probValue * 100); // 25 -> 2500 basis points
      }

      drops.push({
        itemId: parseInt(itemId.trim()),
        probability: finalProbability,
        yield: parseInt(quantity.trim()),
      });
    }
  }

  return drops;
}

/**
 * Validate drops data
 */
function validateDropsData(itemId, drops) {
  const errors = [];

  // Validate item ID
  if (!itemId || itemId <= 0) {
    errors.push("Invalid item_id");
  }

  // Validate drops
  if (drops.length === 0) {
    errors.push("No drops provided");
  }

  let totalProbability = 0;
  for (const drop of drops) {
    if (!drop.itemId || drop.itemId <= 0) {
      errors.push("Invalid drop item ID");
    }
    if (!drop.probability || drop.probability <= 0) {
      errors.push("Drop probability must be greater than 0");
    }
    if (drop.probability > 10000) {
      errors.push("Drop probability cannot exceed 100%");
    }
    if (!drop.yield || drop.yield <= 0) {
      errors.push("Drop yield must be greater than 0");
    }

    totalProbability += drop.probability;
  }

  // Validate total probability equals 100%
  if (totalProbability !== 10000) {
    errors.push(
      `Total probability must be 100% (currently ${(
        totalProbability / 100
      ).toFixed(1)}%)`
    );
  }

  return errors;
}

/**
 * Read và parse CSV file
 */
async function readDropsCSV(filePath) {
  return new Promise((resolve, reject) => {
    const dropsData = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const itemId = parseInt(row.item_id);
        const drops = parseDrops(row.drops);

        dropsData.push({
          item_id: itemId,
          drops: drops,
        });
      })
      .on("end", () => {
        resolve(dropsData);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Add drops cho một item
 */
async function addDropsToItem(itemLogic, itemId, drops) {
  try {
    console.log(`\n📦 Adding drops to item ID: ${itemId}`);

    // Kiểm tra item có tồn tại không
    const itemExists = await itemLogic.itemExists(itemId);
    if (!itemExists) {
      console.error(`   ❌ Item ID ${itemId} does not exist`);
      return false;
    }

    // Lấy thông tin item hiện tại
    const item = await itemLogic.getItem(itemId);
    console.log(`   📋 Item: ${item.name} (${item.itemType})`);

    // Lấy drops hiện tại
    const currentDrops = await itemLogic.getItemDrops(itemId);
    console.log(`   📊 Current drops: ${currentDrops.length}`);

    // Thêm drops mới
    const tx = await itemLogic.createDrops(itemId, drops);
    await tx.wait();

    console.log(`   ✅ Added ${drops.length} new drops`);

    // Hiển thị thông tin drops đã thêm
    for (const drop of drops) {
      console.log(
        `      • Item ${drop.itemId}: ${(drop.probability / 100).toFixed(
          1
        )}% chance for ${drop.yield} items`
      );
    }

    return true;
  } catch (error) {
    console.error(
      `   ❌ Failed to add drops to item ${itemId}:`,
      error.message
    );
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 Bắt đầu thêm drops cho items...");

  // Lấy đường dẫn file CSV
  const csvFilePath =
    process.env.CSV_FILE_PATH || "./script/data/items_drop.csv";

  if (!csvFilePath) {
    console.error("❌ Vui lòng cung cấp đường dẫn file CSV");
    console.log(
      "Usage: CSV_FILE_PATH=./script/data/drops.csv npx hardhat run script/add-drops-only.js --network <network>"
    );
    console.log(
      "Hoặc: npx hardhat run script/add-drops-only.js --network <network> (sử dụng default path)"
    );
    process.exit(1);
  }

  // Kiểm tra file tồn tại
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File không tồn tại: ${csvFilePath}`);
    console.log("📝 Tạo file CSV với format:");
    console.log("item_id,drops");
    console.log('1,"2:25:2,3:15:1"');
    console.log('2,"4:50:1,5:10:3"');
    console.log('3,"6:100:2"');
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
    console.log("Vui lòng deploy contracts trước khi thêm drops");
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
  console.log("\n📖 Reading drops CSV file...");
  const dropsData = await readDropsCSV(csvFilePath);
  console.log(`📊 Found ${dropsData.length} items to add drops`);

  // Validate all drops data first
  console.log("\n🔍 Validating drops data...");
  let validItems = 0;
  let invalidItems = 0;

  for (const data of dropsData) {
    const errors = validateDropsData(data.item_id, data.drops);
    if (errors.length === 0) {
      validItems++;
    } else {
      invalidItems++;
      console.error(`❌ Item ${data.item_id} validation failed:`, errors);
    }
  }

  console.log(`✅ Valid items: ${validItems}`);
  console.log(`❌ Invalid items: ${invalidItems}`);

  if (invalidItems > 0) {
    console.log(
      "\n⚠️ Có items không hợp lệ. Bạn có muốn tiếp tục với items hợp lệ? (y/N)"
    );
    console.log("🔄 Tiếp tục với items hợp lệ...");
  }

  // Add drops
  console.log("\n📦 Bắt đầu thêm drops...");
  let successCount = 0;
  let failCount = 0;

  for (const data of dropsData) {
    const errors = validateDropsData(data.item_id, data.drops);
    if (errors.length === 0) {
      const success = await addDropsToItem(itemLogic, data.item_id, data.drops);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Delay để tránh rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      failCount++;
      console.log(`⏭️ Skipping invalid item: ${data.item_id}`);
    }
  }

  // Summary
  console.log("\n🎉 ADD DROPS COMPLETED!");
  console.log("=".repeat(50));
  console.log(`📊 Total items processed: ${dropsData.length}`);
  console.log(`✅ Successfully added drops: ${successCount}`);
  console.log(`❌ Failed to add drops: ${failCount}`);
  console.log(`⏭️ Skipped (invalid): ${invalidItems}`);
  console.log(`🌐 Network: ${network.name}`);
  console.log(`👤 Operator: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  if (successCount > 0) {
    console.log("\n🔗 Next Steps:");
    console.log(`   • Verify drops on block explorer`);
    console.log(`   • Test drop mechanics in game`);
    console.log(`   • Update frontend with new drops`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Add drops failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
