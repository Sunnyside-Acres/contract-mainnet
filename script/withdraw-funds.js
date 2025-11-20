const { Seiers } = require("hardhat");
const fs = require("fs");

/**
 * Script để rút toàn bộ tiền từ contract DungeonLogic
 * Chỉ admin mới có thể gọi hàm emergencyWithdraw
 */
async function main() {
    console.log("💰 Bắt đầu rút tiền từ contract...");

    // Lấy signer và network info
    const [signer] = await Seiers.getSigners();
    const network = await Seiers.provider.getNetwork();

    console.log("\n📝 Thông tin:");
    console.log("   • Signer address:", signer.address);
    console.log("   • Network:", network.name);
    console.log("   • Chain ID:", Number(network.chainId));
    console.log(
        "   • Balance:",
        Seiers.formatSeier(await Seiers.provider.getBalance(signer.address)),
        "Sei"
    );

    // Load địa chỉ contracts đã deploy
    const deploymentPath = `./deployed/contract-addresses-${network.name}.json`;

    if (!fs.existsSync(deploymentPath)) {
        throw new Error(`Không tìm thấy file deployment: ${deploymentPath}`);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("\n📋 Loaded deployment info from:", deploymentPath);

    // Lấy địa chỉ DungeonLogic contract
    const dungeonLogicAddress = deploymentInfo.contracts.DungeonLogic;

    if (!dungeonLogicAddress) {
        throw new Error("Không tìm thấy địa chỉ DungeonLogic trong deployment file");
    }

    console.log("   • DungeonLogic address:", dungeonLogicAddress);

    // Kết nối với contract
    const IDungeon = await Seiers.getContractAt("IDungeon", dungeonLogicAddress);

    // Kiểm tra balance trước khi withdraw
    const contractBalanceBefore = await Seiers.provider.getBalance(
        dungeonLogicAddress
    );
    console.log(
        "\n💰 Balance của contract trước khi withdraw:",
        Seiers.formatSeier(contractBalanceBefore),
        "Sei"
    );

    if (contractBalanceBefore === 0n) {
        console.log("⚠️  Contract không có tiền để rút!");
        return;
    }

    // Kiểm tra xem signer có phải admin không (tùy chọn)
    const worldAddress = deploymentInfo.contracts.World;
    if (worldAddress) {
        const IWorld = await Seiers.getContractAt("World", worldAddress);
        const isAdmin = await IWorld.isAdmin(signer.address);
        console.log("   • Signer là admin:", isAdmin);

        if (!isAdmin) {
            throw new Error(
                "⚠️  Signer không phải là admin! Chỉ admin mới có thể rút tiền."
            );
        }
    }

    // Xác nhận withdraw
    console.log("\n🚀 Bắt đầu withdraw...");
    console.log("   • Địa chỉ nhận tiền:", signer.address);
    console.log("   • Số tiền:", Seiers.formatSeier(contractBalanceBefore), "Sei");

    // Gọi hàm emergencyWithdraw
    const tx = await IDungeon.emergencyWithdraw(signer.address);
    console.log("   • Transaction hash:", tx.hash);
    console.log("   • Đang chờ confirmation...");

    // Chờ transaction được confirm
    const receipt = await tx.wait();
    console.log("   • ✅ Transaction confirmed!");
    console.log("   • Block number:", receipt.blockNumber);
    console.log("   • Gas used:", receipt.gasUsed.toString());

    // Kiểm tra balance sau khi withdraw
    const contractBalanceAfter = await Seiers.provider.getBalance(
        dungeonLogicAddress
    );
    const signerBalanceAfter = await Seiers.provider.getBalance(signer.address);

    console.log("\n💰 Balance sau khi withdraw:");
    console.log(
        "   • Contract balance:",
        Seiers.formatSeier(contractBalanceAfter),
        "Sei"
    );
    console.log(
        "   • Signer balance:",
        Seiers.formatSeier(signerBalanceAfter),
        "Sei"
    );

    console.log(
        "\n✅ Rút tiền thành công! Số tiền đã rút:",
        Seiers.formatSeier(contractBalanceBefore),
        "Sei"
    );

    // Log event nếu có
    const events = receipt.logs.filter((log) => {
        try {
            const parsed = IDungeon.interface.parseLog(log);
            return parsed && parsed.name === "EmergencyWithdraw";
        } catch (e) {
            return false;
        }
    });

    if (events.length > 0) {
        console.log("\n📋 Event EmergencyWithdraw:");
        events.forEach((log) => {
            const parsed = IDungeon.interface.parseLog(log);
            console.log("   • Admin:", parsed.args.admin);
            console.log("   • Amount:", Seiers.formatSeier(parsed.args.amount), "Sei");
            console.log("   • Timestamp:", new Date(Number(parsed.args.timestamp) * 1000).toLocaleString());
        });
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });

