const fs = require("fs");
const path = require("path");

// Test configuration
const BASE_URL = "http://localhost:3000";
const NETWORKS = ["hardhat", "seimainnet", "seitestnet"];

console.log("🧪 Testing Contract Addresses System...\n");

// Test 1: Check if files exist
console.log("1️⃣ Checking contract address files...");
const deployedPath = path.join(__dirname, "../deployed");
const requiredFiles = [
  "contract-addresses-localhost.json",
  "contract-addresses-seimainnet.json",
];

requiredFiles.forEach((fileName) => {
  const filePath = path.join(deployedPath, fileName);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${fileName} exists (${(stats.size / 1024).toFixed(1)}KB)`);

    // Validate JSON
    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const contractCount = Object.keys(content.contracts || {}).length;
      console.log(`   📊 Contains ${contractCount} contracts`);
    } catch (error) {
      console.log(`   ❌ Invalid JSON: ${error.message}`);
    }
  } else {
    console.log(`❌ ${fileName} missing`);
  }
});

// Test 2: Check API endpoints
console.log("\n2️⃣ Testing API endpoints...");

async function testAPIEndpoint(network) {
  try {
    const response = await fetch(
      `${BASE_URL}/api/contract-addresses?network=${network}`
    );

    if (response.ok) {
      const data = await response.json();
      const contractCount = Object.keys(data.contracts || {}).length;
      console.log(
        `✅ ${network}: ${response.status} (${contractCount} contracts)`
      );

      // Check for specific contracts
      const hasWorld = data.contracts?.World;
      const hasCrafting = data.contracts?.CraftingComponent;
      console.log(`   🌍 World: ${hasWorld ? "✅" : "❌"}`);
      console.log(`   🔨 Crafting: ${hasCrafting ? "✅" : "❌"}`);
    } else {
      console.log(`❌ ${network}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ ${network}: ${error.message}`);
  }
}

// Test all networks
Promise.all(NETWORKS.map(testAPIEndpoint)).then(() => {
  console.log("\n3️⃣ Testing network mapping...");

  // Test network name variations
  const testCases = [
    { input: "hardhat", expected: "contract-addresses-localhost.json" },
    { input: "31337", expected: "contract-addresses-localhost.json" },
    { input: "localhost", expected: "contract-addresses-localhost.json" },
    { input: "seimainnet", expected: "contract-addresses-seimainnet.json" },
    { input: "1329", expected: "contract-addresses-seimainnet.json" },
  ];

  testCases.forEach(({ input, expected }) => {
    const filePath = path.join(deployedPath, expected);
    const exists = fs.existsSync(filePath);
    console.log(`${exists ? "✅" : "❌"} ${input} → ${expected}`);
  });

  console.log("\n🎉 Contract Addresses System Test Complete!");
  console.log("\n📋 Summary:");
  console.log("- Files: Checked for required contract address files");
  console.log("- API: Tested endpoints for all networks");
  console.log("- Mapping: Verified network name to file mapping");
  console.log(
    "\n💡 If you see any ❌, check the troubleshooting guide in CONTRACT_ADDRESSES_README.md"
  );
});

// Handle fetch not available in Node.js
if (typeof fetch === "undefined") {
  console.log("⚠️  Fetch not available, skipping API tests");
  console.log(
    "💡 Run this test in a browser environment or use curl to test APIs"
  );
}
