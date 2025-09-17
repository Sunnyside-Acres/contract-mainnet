const { ethers } = require("hardhat");
const fs = require("fs");
const csv = require("csv-parser");

/**
 * Script xóa drops cho items
 *
 * Format CSV:
 * item_id
 *
 * Ví dụ:
 * 1
 * 2
 * 3
 */

/**
 * Read và parse CSV file
 */
async function readItemsCSV(filePath) {
  return new Promise((resolve, reject) => {
    const itemIds = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const itemId = parseInt(row.item_id);
        if (itemId && itemId > 0) {
          itemIds.push(itemId);
        }
      })
      .on("end", () => {
        resolve(itemIds);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Remove drops cho một item
 */
async function removeDropsFromItem(itemLogic, itemId) {
  try {
    console.log(`\n📦 Removing drops from item ID: ${itemId}`);

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

    if (currentDrops.length === 0) {
      console.log(`   ⚠️ No drops to remove`);
      return true;
    }

    // Xóa tất cả drops bằng cách set empty array
    const tx = await itemLogic.createDrops(itemId, []);
    await tx.wait();

    console.log(`   ✅ Removed ${currentDrops.length} drops`);

    return true;
  } catch (error) {
    console.error(
      `   ❌ Failed to remove drops from item ${itemId}:`,
      error.message
    );
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 Bắt đầu xóa drops cho items...");

  // Lấy đường dẫn file CSV
  const csvFilePath =
    process.env.CSV_FILE_PATH || "./script/data/remove-drops.csv";

  if (!csvFilePath) {
    console.error("❌ Vui lòng cung cấp đường dẫn file CSV");
    console.log(
      "Usage: CSV_FILE_PATH=./script/data/remove-drops.csv npx hardhat run script/remove-drops-only.js --network <network>"
    );
    console.log(
      "Hoặc: npx hardhat run script/remove-drops-only.js --network <network> (sử dụng default path)"
    );
    process.exit(1);
  }

  // Kiểm tra file tồn tại
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File không tồn tại: ${csvFilePath}`);
    console.log("📝 Tạo file CSV với format:");
    console.log("item_id");
    console.log("1");
    console.log("2");
    console.log("3");
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
    console.log("Vui lòng deploy contracts trước khi xóa drops");
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
  console.log("\n📖 Reading items CSV file...");
  const itemIds = await readItemsCSV(csvFilePath);
  console.log(`📊 Found ${itemIds.length} items to remove drops`);

  if (itemIds.length === 0) {
    console.error("❌ Không có item IDs hợp lệ trong file CSV");
    process.exit(1);
  }

  // Remove drops
  console.log("\n📦 Bắt đầu xóa drops...");
  let successCount = 0;
  let failCount = 0;

  for (const itemId of itemIds) {
    const success = await removeDropsFromItem(itemLogic, itemId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Delay để tránh rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n🎉 REMOVE DROPS COMPLETED!");
  console.log("=".repeat(50));
  console.log(`📊 Total items processed: ${itemIds.length}`);
  console.log(`✅ Successfully removed drops: ${successCount}`);
  console.log(`❌ Failed to remove drops: ${failCount}`);
  console.log(`🌐 Network: ${network.name}`);
  console.log(`👤 Operator: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  if (successCount > 0) {
    console.log("\n🔗 Next Steps:");
    console.log(`   • Verify drops removal on block explorer`);
    console.log(`   • Test drop mechanics in game`);
    console.log(`   • Update frontend with changes`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Remove drops failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
