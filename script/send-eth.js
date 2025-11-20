const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Bắt đầu gửi ETH...");

    // Lấy signer và network info
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("📝 Deployer address:", deployer.address);
    console.log("🌐 Network:", network.name);
    console.log("🔗 Chain ID:", Number(network.chainId));

    const deployerBalance = await ethers.provider.getBalance(deployer.address);
    console.log(
        "💰 Deployer balance:",
        ethers.formatEther(deployerBalance),
        "ETH"
    );

    // Địa chỉ nhận
    const recipientAddress = "0xf449977f501752e65026a4ca0acc7eaddd2c0248";

    // Lấy số tiền cần gửi từ command line argument hoặc sử dụng giá trị mặc định
    const amountArg = process.argv[2];
    const sendAmount = amountArg
        ? ethers.parseEther(amountArg)
        : ethers.parseEther("10.0"); // Mặc định 10 ETH

    console.log("\n📋 Transaction Details:");
    console.log("   • Recipient:", recipientAddress);
    console.log("   • Amount:", ethers.formatEther(sendAmount), "ETH");

    // Kiểm tra deployer có đủ tiền không (bao gồm gas fee)
    const estimatedGas = await ethers.provider.estimateGas({
        to: recipientAddress,
        value: sendAmount,
        from: deployer.address,
    });
    const gasPrice = await ethers.provider.getFeeData();
    const estimatedGasCost = estimatedGas * gasPrice.gasPrice;

    const totalCost = sendAmount + estimatedGasCost;

    if (deployerBalance < totalCost) {
        throw new Error(
            `Insufficient balance. Deployer has ${ethers.formatEther(deployerBalance)} ETH but needs at least ${ethers.formatEther(totalCost)} ETH (including gas)`
        );
    }

    // Kiểm tra balance hiện tại của recipient
    const recipientBalanceBefore = await ethers.provider.getBalance(
        recipientAddress
    );
    console.log(
        "\n💵 Recipient balance before:",
        ethers.formatEther(recipientBalanceBefore),
        "ETH"
    );

    // === SEND ETH ===
    console.log("\n💰 PHASE: Sending ETH...");

    try {
        console.log("   • Sending transaction...");
        const sendTx = await deployer.sendTransaction({
            to: recipientAddress,
            value: sendAmount,
        });
        console.log("   • Transaction hash:", sendTx.hash);
        console.log("   • Waiting for confirmation...");
        const receipt = await sendTx.wait();

        console.log("   ✅ Transaction confirmed!");
        console.log("   • Block number:", receipt.blockNumber);
        console.log("   • Gas used:", receipt.gasUsed.toString());

        // Kiểm tra balance sau khi gửi
        const recipientBalanceAfter = await ethers.provider.getBalance(
            recipientAddress
        );
        console.log(
            "\n💵 Recipient balance after:",
            ethers.formatEther(recipientBalanceAfter),
            "ETH"
        );
        console.log(
            "   • Balance increased by:",
            ethers.formatEther(recipientBalanceAfter - recipientBalanceBefore),
            "ETH"
        );
    } catch (error) {
        console.error("❌ Failed to send ETH:", error.message);
        throw error;
    }

    // === SUMMARY ===
    console.log("\n🎉 TRANSACTION COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(
        `🌐 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`
    );
    console.log(`👤 From: ${deployer.address}`);
    console.log(`📬 To: ${recipientAddress}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log("\n📋 Summary:");
    console.log(
        `   • Amount Sent: ${ethers.formatEther(sendAmount)} ETH`
    );
    console.log(
        `   • Recipient Balance: ${ethers.formatEther(await ethers.provider.getBalance(recipientAddress))} ETH`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Transaction failed:", error);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    });

