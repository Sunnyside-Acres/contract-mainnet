const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Bắt đầu kiểm thử toàn bộ NPCMarketNative...");

  const [admin, player, treasury, otherUser] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📝 Admin:", admin.address);
  console.log("📝 Player:", player.address);
  console.log("🏦 Treasury (target):", treasury.address);
  console.log(
    "🌐 Network:",
    network.name,
    "(Chain ID:",
    Number(network.chainId),
    ")"
  );

  const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Không tìm thấy file deployment: ${deploymentPath}\nVui lòng deploy contracts trước.`
    );
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contracts = deploymentInfo.contracts;

  const npcMarketLogic = await ethers.getContractAt(
    "NPCMarketNativeLogic",
    contracts.NPCMarketNativeLogic
  );
  const npcMarketComponent = await ethers.getContractAt(
    "NPCMarketNativeComponent",
    contracts.NPCMarketNativeComponent
  );
  const itemLogic = await ethers.getContractAt(
    "ItemLogic",
    contracts.ItemLogic
  );
  const playerLogic = await ethers.getContractAt(
    "PlayerLogic",
    contracts.PlayerLogic
  );
  const inventoryLogic = await ethers.getContractAt(
    "InventoryLogic",
    contracts.InventoryLogic
  );

  console.log("\n🔗 Đã kết nối tới các contract chính.");

  const npcId = 888;
  const itemId = 5001;
  const npcName = "NPC Native Tester";
  const itemName = "NPC Native Sword";
  const initialPrice = ethers.parseEther("0.5");
  const updatedPrice = ethers.parseEther("0.8");
  const limitPerUserInitial = 5;
  const limitPerUserUpdated = 10;
  const minTransaction = ethers.parseEther("0.1");
  const maxTransaction = ethers.parseEther("100");

  // === STEP 1: Setup treasury wallet ===
  console.log("\n1️⃣  Thiết lập treasury wallet...");
  try {
    const tx = await npcMarketLogic
      .connect(admin)
      .setTreasuryWallet(treasury.address);
    await tx.wait();
    console.log("   ✅ Đã cập nhật treasury wallet:", treasury.address);
  } catch (error) {
    if (error.message.includes("Treasury wallet cannot be zero address")) {
      console.log("   ❌ Không thể set treasury wallet:", error.message);
      throw error;
    }
    if (error.message.includes("Only registered logic")) {
      console.log(
        "   ⚠️ setTreasuryWallet yêu cầu admin đã đăng ký. Kiểm tra World configuration."
      );
      throw error;
    }
    console.log(
      "   ⚠️ Không thể set treasury wallet (có thể đã được set):",
      error.message
    );
  }
  const treasuryOnChain = await npcMarketLogic.treasuryWallet();
  console.log("   📋 Treasury wallet hiện tại:", treasuryOnChain);

  // === STEP 2: Ensure player + item exist ===
  console.log("\n2️⃣  Chuẩn bị dữ liệu: tạo player & item...");

  try {
    const createPlayerTx = await playerLogic
      .connect(player)
      .createPlayer("NPCNativeHero");
    await createPlayerTx.wait();
    console.log("   ✅ Player mới đã được tạo.");
  } catch (error) {
    if (
      error.message.includes("Player already exists") ||
      error.message.includes("already created") ||
      error.message.includes("Player already initialized")
    ) {
      console.log("   ℹ️ Player đã tồn tại, bỏ qua.");
    } else {
      console.log("   ❌ Lỗi tạo player:", error.message);
      throw error;
    }
  }

  try {
    const createItemTx = await itemLogic.connect(admin).createItem(
      itemId,
      itemName,
      0, // itemType
      0, // rarity
      100, // maxStacked
      true, // isStacked
      true // isTradable
    );
    await createItemTx.wait();
    console.log(`   ✅ Item đã được tạo: ${itemName} (${itemId})`);
  } catch (error) {
    if (error.message.includes("Item already exists")) {
      console.log("   ℹ️ Item đã tồn tại, bỏ qua.");
    } else {
      console.log("   ❌ Lỗi tạo item:", error.message);
      throw error;
    }
  }

  // === STEP 3: Create NPC Market ===
  console.log("\n3️⃣  Tạo NPC Market mới...");
  try {
    const createMarketTx = await npcMarketLogic
      .connect(admin)
      .createNPCMarket(npcId, npcName, minTransaction, maxTransaction);
    await createMarketTx.wait();
    console.log(
      `   ✅ Đã tạo market ID ${npcId} tên "${npcName}" (min: ${ethers.formatEther(
        minTransaction
      )} ETH, max: ${ethers.formatEther(maxTransaction)} ETH)`
    );
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("   ℹ️ Market đã tồn tại, bỏ qua.");
    } else {
      console.log("   ❌ Lỗi tạo market:", error.message);
      throw error;
    }
  }

  // === STEP 4: Add item to market ===
  console.log("\n4️⃣  Thêm item vào market...");
  try {
    const addItemTx = await npcMarketLogic
      .connect(admin)
      .addItemToMarket(npcId, itemId, limitPerUserInitial, initialPrice, true);
    await addItemTx.wait();
    console.log(
      `   ✅ Đã thêm item ${itemId} với limit ${limitPerUserInitial}, giá ${ethers.formatEther(
        initialPrice
      )} ETH`
    );
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("   ℹ️ Item đã tồn tại trong market, bỏ qua.");
    } else {
      console.log("   ❌ Lỗi thêm item:", error.message);
      throw error;
    }
  }

  // === STEP 5: Update item ===
  console.log("\n5️⃣  Cập nhật item trong market...");
  try {
    const updateItemTx = await npcMarketLogic
      .connect(admin)
      .updateItemInMarket(npcId, itemId, limitPerUserUpdated, updatedPrice);
    await updateItemTx.wait();
    console.log(
      `   ✅ Đã cập nhật item ${itemId} => limit ${limitPerUserUpdated}, giá ${ethers.formatEther(
        updatedPrice
      )} ETH`
    );
  } catch (error) {
    console.log("   ❌ Lỗi cập nhật item:", error.message);
    throw error;
  }

  // === STEP 6: Market active toggles ===
  console.log("\n6️⃣  Kiểm tra trạng thái market...");
  await npcMarketLogic.connect(admin).setMarketActive(npcId, false);
  let isOpen = await npcMarketLogic.isMarketOpen(npcId);
  console.log("   🔒 Market đang đóng:", !isOpen);
  await npcMarketLogic.connect(admin).setMarketActive(npcId, true);
  isOpen = await npcMarketLogic.isMarketOpen(npcId);
  console.log("   🔓 Market đã mở lại:", isOpen);

  // === STEP 7: Read info before buying ===
  console.log("\n7️⃣  Lấy thông tin market & item trước khi mua...");
  const [
    marketNpcId,
    marketName,
    marketActive,
    itemCount,
    minTxAmount,
    maxTxAmount,
  ] = await npcMarketLogic.getNPCMarketInfo(npcId);
  console.log("   📋 Market Info:");
  console.log(`     • ID: ${marketNpcId} (${marketName})`);
  console.log(`     • Active: ${marketActive}`);
  console.log(`     • Item Count: ${itemCount}`);
  console.log(
    `     • Min/Max Transaction: ${ethers.formatEther(
      minTxAmount
    )} - ${ethers.formatEther(maxTxAmount)} ETH`
  );

  const marketItem = await npcMarketLogic.getMarketItem(npcId, itemId);
  console.log("   📦 Item Info:");
  console.log(`     • Item ID: ${marketItem.itemId}`);
  console.log(
    `     • Price: ${ethers.formatEther(marketItem.pricePerUnit)} ETH`
  );
  console.log(`     • Limit/User: ${marketItem.limitPerUser}`);
  console.log(`     • Active: ${marketItem.active}`);
  console.log(`     • Selling: ${marketItem.isSelling}`);

  const canBuyCheck = await npcMarketLogic.canPlayerBuyItem(
    player.address,
    npcId,
    itemId,
    2
  );
  console.log(
    `   ✅ canPlayerBuyItem (2 units): ${canBuyCheck[0]} ${
      canBuyCheck[1] ? "- " + canBuyCheck[1] : ""
    }`
  );

  const calcPrice = await npcMarketLogic.calculateBuyPrice(npcId, itemId, 2);
  console.log(
    `   💰 calculateBuyPrice (2 units): ${ethers.formatEther(calcPrice)} ETH`
  );

  // === STEP 8: Successful purchase ===
  console.log("\n8️⃣  Thực hiện giao dịch mua item...");
  const buyQuantity = 3;
  const buyPrice = await npcMarketLogic.calculateBuyPrice(
    npcId,
    itemId,
    buyQuantity
  );
  const treasuryBefore = await ethers.provider.getBalance(treasury.address);
  const playerBalanceBefore = await ethers.provider.getBalance(player.address);
  console.log(
    `   🛒 Player sẽ mua ${buyQuantity} item với giá ${ethers.formatEther(
      buyPrice
    )} ETH`
  );

  const buyTx = await npcMarketLogic
    .connect(player)
    .buyItemFromNPC(npcId, itemId, buyQuantity, { value: buyPrice });
  const buyReceipt = await buyTx.wait();
  console.log("   ✅ Giao dịch thành công! Tx:", buyReceipt.hash);

  const treasuryAfter = await ethers.provider.getBalance(treasury.address);
  console.log(
    `   💰 Treasury nhận thêm: ${ethers.formatEther(
      treasuryAfter - treasuryBefore
    )} ETH`
  );
  const playerBalanceAfter = await ethers.provider.getBalance(player.address);
  console.log(
    `   💸 Player balance thay đổi: ${ethers.formatEther(
      playerBalanceBefore - playerBalanceAfter
    )} ETH`
  );

  const inventoryItem = await inventoryLogic.getItem(player.address, itemId);
  console.log(
    `   📦 Player inventory (item ${itemId}) hiện có: ${inventoryItem.quantity}`
  );

  const purchases = await npcMarketLogic.getUserPurchases(
    npcId,
    itemId,
    player.address
  );
  console.log(`   🧾 Tổng lượt mua của player: ${purchases}`);

  const remainingLimit = await npcMarketLogic.getRemainingUserLimit(
    npcId,
    itemId,
    player.address
  );
  console.log(`   📊 Limit còn lại: ${remainingLimit}`);

  const marketStats = await npcMarketLogic.getMarketStats(npcId);
  console.log("   📈 Market stats sau giao dịch:");
  console.log(`     • Tổng giao dịch: ${marketStats.totalTransactions}`);
  console.log(
    `     • Tổng volume: ${ethers.formatEther(marketStats.totalVolume)} ETH`
  );
  console.log(
    `     • Buy volume: ${ethers.formatEther(marketStats.totalBuyVolume)} ETH`
  );

  const userStats = await npcMarketLogic.getUserMarketStats(
    npcId,
    player.address
  );
  console.log("   👤 User stats sau giao dịch:");
  console.log(`     • Transactions: ${userStats.totalTransactions}`);
  console.log(
    `     • Volume: ${ethers.formatEther(userStats.totalVolume)} ETH`
  );

  let transactionId = await npcMarketComponent.transactionCounter();
  try {
    const transactionLog = buyReceipt.logs
      .map((log) => {
        try {
          return npcMarketComponent.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "TransactionRecorded");

    if (transactionLog) {
      transactionId = transactionLog.args.transactionId;
    }
  } catch (error) {
    console.log(
      "   ⚠️ Không thể parse TransactionRecorded event:",
      error.message
    );
  }

  const txRecord = await npcMarketLogic.getTransactionRecord(transactionId);
  console.log("   🧾 Transaction record cuối cùng:");
  console.log(`     • ID: ${txRecord.transactionId}`);
  console.log(`     • NPC: ${txRecord.npcId}, Item: ${txRecord.itemId}`);
  console.log(`     • Quantity: ${txRecord.quantity}`);
  console.log(`     • Total: ${ethers.formatEther(txRecord.totalPrice)} ETH`);

  // === STEP 9: Expect limit exceeded ===
  console.log("\n9️⃣  Thử mua vượt limit (kỳ vọng thất bại)...");
  try {
    await npcMarketLogic
      .connect(player)
      .buyItemFromNPC(npcId, itemId, limitPerUserUpdated, {
        value: updatedPrice * BigInt(limitPerUserUpdated),
      });
    console.log("   ❌ LỖI: Giao dịch vượt limit nhưng vẫn thành công!");
  } catch (error) {
    console.log("   ✅ Giao dịch bị từ chối như mong đợi:", error.message);
  }

  // === STEP 10: Reset purchases & buy lại ===
  console.log("\n🔟 Reset lịch sử mua & mua lại...");
  await npcMarketLogic
    .connect(admin)
    .resetUserPurchases(npcId, itemId, player.address);
  const purchasesAfterReset = await npcMarketLogic.getUserPurchases(
    npcId,
    itemId,
    player.address
  );
  console.log("   📋 Purchases sau reset:", purchasesAfterReset);

  const buyTxAfterReset = await npcMarketLogic
    .connect(player)
    .buyItemFromNPC(npcId, itemId, 2, { value: updatedPrice * 2n });
  await buyTxAfterReset.wait();
  console.log("   ✅ Player mua lại thành công sau reset.");

  // === STEP 11: Negative scenarios ===
  console.log("\n1️⃣1️⃣  Kiểm thử các trường hợp lỗi khác...");

  console.log("   • Market đóng -> mua sẽ thất bại");
  await npcMarketLogic.connect(admin).setMarketActive(npcId, false);
  try {
    await npcMarketLogic
      .connect(player)
      .buyItemFromNPC(npcId, itemId, 1, { value: updatedPrice });
    console.log("   ❌ LỖI: Mua được khi market đóng!");
  } catch (error) {
    console.log("     ✅ Thất bại như kỳ vọng:", error.message);
  }
  await npcMarketLogic.connect(admin).setMarketActive(npcId, true);

  console.log("   • Thiếu ETH -> thất bại");
  try {
    await npcMarketLogic
      .connect(player)
      .buyItemFromNPC(npcId, itemId, 1, { value: updatedPrice / 2n });
    console.log("   ❌ LỖI: Mua thành công dù gửi thiếu ETH!");
  } catch (error) {
    console.log("     ✅ Thất bại như mong đợi:", error.message);
  }

  console.log("   • Người không phải admin thử reset purchases");
  try {
    await npcMarketLogic
      .connect(player)
      .resetUserPurchases(npcId, itemId, player.address);
    console.log("   ❌ LỖI: Non-admin reset thành công!");
  } catch (error) {
    console.log("     ✅ Bị chặn như mong đợi:", error.message);
  }

  // === STEP 12: Remove item & verify ===
  console.log("\n1️⃣2️⃣  Gỡ item khỏi market...");
  await npcMarketLogic.connect(admin).removeItemFromMarket(npcId, itemId);
  console.log("   ✅ Item đã bị gỡ.");

  try {
    await npcMarketLogic.getMarketItem(npcId, itemId);
    console.log(
      "   ⚠️ Warning: getMarketItem vẫn trả về dữ liệu sau khi remove."
    );
  } catch (error) {
    console.log(
      "   ✅ getMarketItem báo lỗi như kỳ vọng sau khi remove:",
      error.message
    );
  }

  try {
    const itemIdsAfterRemove = await npcMarketComponent.getMarketItemIds(npcId);
    console.log("   📋 Item IDs sau khi remove:", itemIdsAfterRemove);
  } catch (error) {
    console.log(
      "   ⚠️ Không thể lấy danh sách item IDs (có thể market đang tắt):",
      error.message
    );
  }

  // === STEP 13: Final summary ===
  console.log("\n✅ HOÀN THÀNH KIỂM THỬ NPCMarketNative");
  console.log("========================================");
  console.log(`• NPC Market ID: ${npcId}`);
  console.log(
    `• Tổng transaction ghi nhận: ${Number(
      await npcMarketComponent.transactionCounter()
    )}`
  );
  console.log(
    `• Treasury balance cuối: ${ethers.formatEther(
      await ethers.provider.getBalance(treasury.address)
    )} ETH`
  );
  console.log(
    `• Player inventory (item ${itemId}): ${
      (await inventoryLogic.getItem(player.address, itemId)).quantity
    }`
  );
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ NPCMarketNative full test thất bại:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
