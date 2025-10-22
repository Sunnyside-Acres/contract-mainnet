const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BettingManager", function () {
  let world, bettingManager, mockToken;
  let owner, admin, player1, player2;
  let betId;

  beforeEach(async function () {
    [owner, admin, player1, player2] = await ethers.getSigners();

    // Deploy World contract
    const World = await ethers.getContractFactory("World");
    world = await World.deploy();
    await world.deployed();

    // Set admin
    await world.setAdmin(admin.address, true);

    // Deploy BettingManager
    const BettingManager = await ethers.getContractFactory("BettingManager");
    bettingManager = await BettingManager.deploy(world.address);
    await bettingManager.deployed();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy(
      "Test Token",
      "TEST",
      ethers.utils.parseEther("1000000")
    );
    await mockToken.deployed();

    // Add token support
    await bettingManager
      .connect(admin)
      .setTokenSupport(mockToken.address, true);
  });

  describe("Deployment", function () {
    it("Should set the correct world address", async function () {
      expect(await bettingManager.world()).to.equal(world.address);
    });

    it("Should not be paused initially", async function () {
      expect(await bettingManager.paused()).to.be.false;
    });
  });

  describe("Native Token Betting", function () {
    it("Should allow betting with native token", async function () {
      const betAmount = ethers.utils.parseEther("1");

      await expect(
        bettingManager.connect(player1).betNative(1, { value: betAmount })
      )
        .to.emit(bettingManager, "BetPlaced")
        .withArgs(
          1,
          player1.address,
          1,
          betAmount,
          ethers.constants.AddressZero
        );
    });

    it("Should reject zero amount bet", async function () {
      await expect(
        bettingManager.connect(player1).betNative(1, { value: 0 })
      ).to.be.revertedWith("Bet amount must be greater than 0");
    });

    it("Should reject invalid dungeon id", async function () {
      const betAmount = ethers.utils.parseEther("1");

      await expect(
        bettingManager.connect(player1).betNative(0, { value: betAmount })
      ).to.be.revertedWith("Invalid dungeon id");
    });
  });

  describe("ERC20 Token Betting", function () {
    it("Should allow betting with ERC20 token", async function () {
      const betAmount = ethers.utils.parseEther("1");

      // Approve token
      await mockToken
        .connect(player1)
        .approve(bettingManager.address, betAmount);

      await expect(
        bettingManager
          .connect(player1)
          .betERC20(1, mockToken.address, betAmount)
      )
        .to.emit(bettingManager, "BetPlaced")
        .withArgs(1, player1.address, 1, betAmount, mockToken.address);
    });

    it("Should reject betting with unsupported token", async function () {
      const betAmount = ethers.utils.parseEther("1");
      const unsupportedToken = await MockToken.deploy(
        "Unsupported",
        "UNS",
        ethers.utils.parseEther("1000000")
      );
      await unsupportedToken.deployed();

      await unsupportedToken
        .connect(player1)
        .approve(bettingManager.address, betAmount);

      await expect(
        bettingManager
          .connect(player1)
          .betERC20(1, unsupportedToken.address, betAmount)
      ).to.be.revertedWith("Token not supported");
    });
  });

  describe("Proof and Claim System", function () {
    beforeEach(async function () {
      // Place a bet
      const betAmount = ethers.utils.parseEther("1");
      await bettingManager.connect(player1).betNative(1, { value: betAmount });
      betId = 1;
    });

    it("Should allow admin to create proof", async function () {
      const proofHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test proof")
      );

      await expect(
        bettingManager.connect(admin).createProof(betId, true, proofHash)
      )
        .to.emit(bettingManager, "ProofCreated")
        .withArgs(betId, player1.address, true, proofHash);
    });

    it("Should reject non-admin creating proof", async function () {
      const proofHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test proof")
      );

      await expect(
        bettingManager.connect(player1).createProof(betId, true, proofHash)
      ).to.be.revertedWith("Not authorized as admin");
    });

    it("Should allow player to claim reward when winning", async function () {
      const proofHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test proof")
      );

      // Create proof for win
      await bettingManager.connect(admin).createProof(betId, true, proofHash);

      // Check initial balance
      const initialBalance = await player1.getBalance();

      // Claim reward
      await expect(bettingManager.connect(player1).claimReward(betId))
        .to.emit(bettingManager, "BetClaimed")
        .withArgs(
          betId,
          player1.address,
          ethers.utils.parseEther("2"),
          ethers.constants.AddressZero
        );

      // Check balance increased
      const finalBalance = await player1.getBalance();
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should reject claiming when losing", async function () {
      const proofHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test proof")
      );

      // Create proof for loss
      await bettingManager.connect(admin).createProof(betId, false, proofHash);

      await expect(
        bettingManager.connect(player1).claimReward(betId)
      ).to.be.revertedWith("You lost");
    });

    it("Should reject double claiming", async function () {
      const proofHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test proof")
      );

      // Create proof for win
      await bettingManager.connect(admin).createProof(betId, true, proofHash);

      // Claim first time
      await bettingManager.connect(player1).claimReward(betId);

      // Try to claim again
      await expect(
        bettingManager.connect(player1).claimReward(betId)
      ).to.be.revertedWith("Already claimed");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to pause contract", async function () {
      await expect(bettingManager.connect(admin).pause())
        .to.emit(bettingManager, "ContractPaused")
        .withArgs(true);

      expect(await bettingManager.paused()).to.be.true;
    });

    it("Should allow admin to unpause contract", async function () {
      await bettingManager.connect(admin).pause();

      await expect(bettingManager.connect(admin).unpause())
        .to.emit(bettingManager, "ContractPaused")
        .withArgs(false);

      expect(await bettingManager.paused()).to.be.false;
    });

    it("Should reject betting when paused", async function () {
      await bettingManager.connect(admin).pause();

      const betAmount = ethers.utils.parseEther("1");
      await expect(
        bettingManager.connect(player1).betNative(1, { value: betAmount })
      ).to.be.revertedWith("Contract is paused");
    });

    it("Should allow admin to set token support", async function () {
      await expect(
        bettingManager.connect(admin).setTokenSupport(mockToken.address, false)
      )
        .to.emit(bettingManager, "TokenSupportUpdated")
        .withArgs(mockToken.address, false);

      expect(await bettingManager.supportedTokens(mockToken.address)).to.be
        .false;
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      // Place a bet to have some funds
      const betAmount = ethers.utils.parseEther("1");
      await bettingManager.connect(player1).betNative(1, { value: betAmount });
    });

    it("Should allow admin to emergency withdraw when paused", async function () {
      // Pause contract
      await bettingManager.connect(admin).pause();

      const withdrawAmount = ethers.utils.parseEther("0.5");
      const initialBalance = await admin.getBalance();

      await expect(
        bettingManager
          .connect(admin)
          .emergencyWithdraw(ethers.constants.AddressZero, withdrawAmount)
      )
        .to.emit(bettingManager, "EmergencyWithdraw")
        .withArgs(admin.address, withdrawAmount, ethers.constants.AddressZero);

      const finalBalance = await admin.getBalance();
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should reject emergency withdraw when not paused", async function () {
      const withdrawAmount = ethers.utils.parseEther("0.5");

      await expect(
        bettingManager
          .connect(admin)
          .emergencyWithdraw(ethers.constants.AddressZero, withdrawAmount)
      ).to.be.revertedWith("Contract is not paused");
    });

    it("Should reject non-admin emergency withdraw", async function () {
      await bettingManager.connect(admin).pause();
      const withdrawAmount = ethers.utils.parseEther("0.5");

      await expect(
        bettingManager
          .connect(player1)
          .emergencyWithdraw(ethers.constants.AddressZero, withdrawAmount)
      ).to.be.revertedWith("Not authorized as admin");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Place a bet
      const betAmount = ethers.utils.parseEther("1");
      await bettingManager.connect(player1).betNative(1, { value: betAmount });
      betId = 1;
    });

    it("Should return correct bet info", async function () {
      const betInfo = await bettingManager.getBetInfo(betId);

      expect(betInfo.player).to.equal(player1.address);
      expect(betInfo.dungeonId).to.equal(1);
      expect(betInfo.betAmount).to.equal(ethers.utils.parseEther("1"));
      expect(betInfo.tokenAddress).to.equal(ethers.constants.AddressZero);
      expect(betInfo.claimed).to.be.false;
      expect(betInfo.isWin).to.be.false;
    });

    it("Should return correct contract balance", async function () {
      const balance = await bettingManager.getContractBalance(
        ethers.constants.AddressZero
      );
      expect(balance).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should return correct pending bets", async function () {
      const pendingBets = await bettingManager.getTotalPendingBets(
        ethers.constants.AddressZero
      );
      expect(pendingBets).to.equal(ethers.utils.parseEther("1"));
    });
  });
});
