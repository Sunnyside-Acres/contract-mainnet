const fs = require("fs");
const csv = require("csv-parser");

/**
 * Script validate CSV items trước khi import
 * Kiểm tra format, dữ liệu và tính hợp lệ của file CSV
 */

// Mapping cho validation
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

const RARITY_MAP = {
  0: "Common",
  1: "Uncommon",
  2: "Rare",
  3: "Epic",
  4: "Legendary",
};

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
 * Validate CSV header
 */
function validateHeader(headers) {
  const requiredHeaders = [
    "item_id",
    "item_name",
    "item_type",
    "rarity",
    "max_stacked",
    "is_stacked",
    "is_tradable",
    "attributes",
    "drops",
  ];

  const errors = [];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push(`Missing required header: ${required}`);
    }
  }

  return errors;
}

/**
 * Validate item data
 */
function validateItemData(item, rowNumber) {
  const errors = [];
  const warnings = [];

  // Required field validations
  if (!item.item_id || isNaN(item.item_id) || item.item_id <= 0) {
    errors.push(`Row ${rowNumber}: Invalid item_id (must be positive integer)`);
  }

  if (!item.item_name || item.item_name.trim() === "") {
    errors.push(`Row ${rowNumber}: Item name cannot be empty`);
  }

  if (isNaN(item.item_type) || item.item_type < 0 || item.item_type > 9) {
    errors.push(`Row ${rowNumber}: Invalid item_type (must be 0-9)`);
  }

  if (isNaN(item.rarity) || item.rarity < 0 || item.rarity > 4) {
    errors.push(`Row ${rowNumber}: Invalid rarity (must be 0-4)`);
  }

  if (!item.max_stacked || isNaN(item.max_stacked) || item.max_stacked <= 0) {
    errors.push(`Row ${rowNumber}: max_stacked must be positive integer`);
  }

  // Boolean validations
  if (item.is_stacked !== "true" && item.is_stacked !== "false") {
    errors.push(`Row ${rowNumber}: is_stacked must be 'true' or 'false'`);
  }

  if (item.is_tradable !== "true" && item.is_tradable !== "false") {
    errors.push(`Row ${rowNumber}: is_tradable must be 'true' or 'false'`);
  }

  // Attribute validation
  if (item.attributes && item.attributes.trim() !== "") {
    const attrErrors = validateAttributes(item.attributes, rowNumber);
    errors.push(...attrErrors);
  }

  // Drops validation
  if (item.drops && item.drops.trim() !== "") {
    const dropErrors = validateDrops(item.drops, rowNumber);
    errors.push(...dropErrors);
  }

  // Warnings
  if (item.item_name && item.item_name.length > 50) {
    warnings.push(
      `Row ${rowNumber}: Item name is very long (${item.item_name.length} chars)`
    );
  }

  if (item.max_stacked > 10000) {
    warnings.push(
      `Row ${rowNumber}: max_stacked is very high (${item.max_stacked})`
    );
  }

  return { errors, warnings };
}

/**
 * Validate attributes string
 */
function validateAttributes(attributesStr, rowNumber) {
  const errors = [];

  try {
    const pairs = attributesStr.split(",");

    for (const pair of pairs) {
      const [name, value] = pair.split(":");
      if (!name || !value) {
        errors.push(`Row ${rowNumber}: Invalid attribute format: ${pair}`);
        continue;
      }

      const attrName = name.trim();
      const attrValue = value.trim();

      // Check if attribute exists
      if (!ATTRIBUTE_MAP.hasOwnProperty(attrName)) {
        errors.push(`Row ${rowNumber}: Unknown attribute: ${attrName}`);
      }

      // Check if value is valid number
      if (isNaN(attrValue) || parseInt(attrValue) <= 0) {
        errors.push(
          `Row ${rowNumber}: Invalid attribute value for ${attrName}: ${attrValue}`
        );
      }
    }
  } catch (error) {
    errors.push(`Row ${rowNumber}: Error parsing attributes: ${error.message}`);
  }

  return errors;
}

/**
 * Validate drops string
 */
function validateDrops(dropsStr, rowNumber) {
  const errors = [];

  try {
    const dropPairs = dropsStr.split(",");

    for (const dropPair of dropPairs) {
      const [itemId, probability, quantity] = dropPair.split(":");
      if (!itemId || !probability || !quantity) {
        errors.push(`Row ${rowNumber}: Invalid drop format: ${dropPair}`);
        continue;
      }

      const dropItemId = itemId.trim();
      const dropProbability = probability.trim();
      const dropQuantity = quantity.trim();

      // Validate item ID
      if (isNaN(dropItemId) || parseInt(dropItemId) <= 0) {
        errors.push(`Row ${rowNumber}: Invalid drop item ID: ${dropItemId}`);
      }

      // Validate probability
      if (
        isNaN(dropProbability) ||
        parseFloat(dropProbability) <= 0 ||
        parseFloat(dropProbability) > 100
      ) {
        errors.push(
          `Row ${rowNumber}: Invalid drop probability: ${dropProbability} (must be 0.01-100.00)`
        );
      }

      // Validate quantity
      if (isNaN(dropQuantity) || parseInt(dropQuantity) <= 0) {
        errors.push(`Row ${rowNumber}: Invalid drop quantity: ${dropQuantity}`);
      }
    }
  } catch (error) {
    errors.push(`Row ${rowNumber}: Error parsing drops: ${error.message}`);
  }

  return errors;
}

/**
 * Check for duplicate item IDs
 */
function checkDuplicates(items) {
  const seen = new Set();
  const duplicates = [];

  for (let i = 0; i < items.length; i++) {
    const itemId = items[i].item_id;
    if (seen.has(itemId)) {
      duplicates.push(`Row ${i + 2}: Duplicate item_id: ${itemId}`);
    } else {
      seen.add(itemId);
    }
  }

  return duplicates;
}

/**
 * Generate validation report
 */
function generateReport(validationResults) {
  const { totalItems, validItems, invalidItems, errors, warnings, duplicates } =
    validationResults;

  console.log("\n📊 VALIDATION REPORT");
  console.log("=".repeat(50));
  console.log(`📦 Total items: ${totalItems}`);
  console.log(`✅ Valid items: ${validItems}`);
  console.log(`❌ Invalid items: ${invalidItems}`);
  console.log(`⚠️ Warnings: ${warnings.length}`);
  console.log(`🔄 Duplicates: ${duplicates.length}`);

  if (errors.length > 0) {
    console.log("\n❌ ERRORS:");
    errors.forEach((error) => console.log(`   • ${error}`));
  }

  if (warnings.length > 0) {
    console.log("\n⚠️ WARNINGS:");
    warnings.forEach((warning) => console.log(`   • ${warning}`));
  }

  if (duplicates.length > 0) {
    console.log("\n🔄 DUPLICATES:");
    duplicates.forEach((duplicate) => console.log(`   • ${duplicate}`));
  }

  console.log("\n📋 SUMMARY:");
  if (errors.length === 0 && duplicates.length === 0) {
    console.log("✅ CSV file is valid and ready for import!");
    if (warnings.length > 0) {
      console.log("⚠️ Please review warnings before importing.");
    }
  } else {
    console.log("❌ CSV file has errors that must be fixed before import.");
    console.log("🔧 Please fix all errors and run validation again.");
  }

  return errors.length === 0 && duplicates.length === 0;
}

/**
 * Main function
 */
async function main() {
  console.log("🔍 Bắt đầu validate CSV items...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Vui lòng cung cấp đường dẫn file CSV");
    console.log("Usage: node script/validate-csv-items.js <csv-file-path>");
    process.exit(1);
  }

  const csvFilePath = args[0];

  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File không tồn tại: ${csvFilePath}`);
    process.exit(1);
  }

  console.log("📁 CSV file:", csvFilePath);

  try {
    // Read CSV file
    console.log("\n📖 Reading CSV file...");
    const items = [];
    let headers = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("headers", (headerList) => {
          headers = headerList;
        })
        .on("data", (row) => {
          items.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`📊 Found ${items.length} items in CSV`);

    // Validate header
    console.log("\n🔍 Validating CSV header...");
    const headerErrors = validateHeader(headers);
    if (headerErrors.length > 0) {
      console.error("❌ Header validation failed:");
      headerErrors.forEach((error) => console.error(`   • ${error}`));
      process.exit(1);
    }
    console.log("✅ Header validation passed");

    // Validate each item
    console.log("\n🔍 Validating items...");
    const allErrors = [];
    const allWarnings = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { errors, warnings } = validateItemData(item, i + 2); // +2 because CSV is 1-indexed and has header

      allErrors.push(...errors);
      allWarnings.push(...warnings);

      if (errors.length === 0) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    // Check for duplicates
    console.log("\n🔍 Checking for duplicates...");
    const duplicates = checkDuplicates(items);

    // Generate report
    const validationResults = {
      totalItems: items.length,
      validItems: validCount,
      invalidItems: invalidCount,
      errors: allErrors,
      warnings: allWarnings,
      duplicates: duplicates,
    };

    const isValid = generateReport(validationResults);

    // Exit with appropriate code
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error("❌ Validation failed:", error.message);
    process.exit(1);
  }
}

main();
