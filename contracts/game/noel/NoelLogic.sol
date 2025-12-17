// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INoel.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/INoelNFT.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NoelLogic {
    IWorld public world;
    INoelComponent public noelProxy;
    INoelNFT public noelNFT;
    IInventoryComponent public inventoryProxy;

    mapping(address => uint256) public nonces;

    event ClaimGift(
        address indexed player,
        uint256 indexed itemId,
        uint256 amount,
        uint256 totalAmount
    );
    event ClaimNFT(address indexed player, uint256 indexed tokenId);
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(
        address _world,
        address _noelProxy,
        address _inventoryProxy,
        address _noelNFT
    ) {
        world = IWorld(_world);
        noelProxy = INoelComponent(_noelProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        noelNFT = INoelNFT(_noelNFT);
    }

    function safeMint(uint256 itemId, bytes calldata proof) external {
        address player = msg.sender;
        bytes32 message = keccak256(
            abi.encodePacked(player, itemId, address(this), nonces[player])
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            message
        );
        address signer = ECDSA.recover(ethSignedMessageHash, proof);
        require(
            IWorld(world).isAdmin(signer),
            "Invalid proof: not signed by admin"
        );
        nonces[player]++;

        uint64 startTime = noelProxy.getStartTime();
        uint64 endTime = noelProxy.getEndTime();
        require(uint64(block.timestamp) >= startTime, "Event not started");
        require(uint64(block.timestamp) <= endTime, "Event has ended");

        InventoryItem memory item = inventoryProxy.getItem(player, itemId);

        uint256 giftRedemptionMilestones = noelProxy
            .getGiftRedemptionMilestones();

        require(
            item.quantity >= giftRedemptionMilestones,
            "Not enough gifts to redeem"
        );

        uint256 tokenId = noelNFT.mint(player);
        inventoryProxy.setItem(
            player,
            itemId,
            item.quantity - giftRedemptionMilestones,
            item.durability,
            item.expiration
        );
        noelProxy.setGift(player, item.quantity - giftRedemptionMilestones);
        emit ClaimNFT(player, tokenId);
    }

    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
    }

    function claimGift(
        uint256 itemId,
        uint256 amount,
        bytes calldata proof
    ) external {
        address player = msg.sender;
        bytes32 message = keccak256(
            abi.encodePacked(
                player,
                address(this),
                itemId,
                amount,
                nonces[player]
            )
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            message
        );
        address signer = ECDSA.recover(ethSignedMessageHash, proof);
        require(
            IWorld(world).isAdmin(signer),
            "Invalid proof: not signed by admin"
        );
        nonces[player]++;

        uint64 currentTime = uint64(block.timestamp);
        uint64 spaceTime = noelProxy.getSpaceTime();
        uint64 endTime = noelProxy.getEndTime();
        require(currentTime <= endTime, "Event has ended");
        require(canClaimGift(), "Not within claim window");

        uint64 currentCycleId = currentTime / spaceTime;
        uint64 lastClaim = noelProxy.getLastClaimTime(player);

        if (lastClaim > 0) {
            uint64 lastCycleId = lastClaim / spaceTime;
            require(
                currentCycleId > lastCycleId,
                "Already claimed in this window"
            );
        }

        InventoryItem memory item = inventoryProxy.getItem(player, itemId);

        inventoryProxy.setItem(
            player,
            itemId,
            item.quantity + amount,
            item.durability,
            item.expiration
        );
        noelProxy.setGift(player, item.quantity + amount);

        noelProxy.setLastClaimTime(player, currentTime);

        emit ClaimGift(player, itemId, amount, item.quantity + amount);
    }

    function isClaimedGift(address to) external view returns (bool) {
        uint64 currentTime = uint64(block.timestamp);
        uint64 spaceTime = noelProxy.getSpaceTime();
        uint64 endTime = noelProxy.getEndTime();
        if (currentTime > endTime) {
            return true;
        }
        uint64 currentCycleId = currentTime / spaceTime;
        uint64 lastClaim = noelProxy.getLastClaimTime(to);

        if (lastClaim > 0) {
            uint64 lastCycleId = lastClaim / spaceTime;
            return currentCycleId <= lastCycleId;
        }
        return false;
    }

    function canClaimGift() public view returns (bool) {
        uint64 currentTime = uint64(block.timestamp);
        uint64 spaceTime = noelProxy.getSpaceTime();
        uint64 waitingTime = noelProxy.getWaitingTime();
        uint64 endTime = noelProxy.getEndTime();
        if (currentTime > endTime) {
            return false;
        }
        // Exp: spaceTime = 7200 (2h). waitingTime = 300 (5p).
        // 0h00 -> 0h05: Dư 0 -> 300 (OK)
        // 0h05 -> 1h59: Dư 301 -> 7199 (FAIL)
        // 2h00 -> 2h05: Dư 0 -> 300 (OK)
        uint64 timeInCycle = currentTime % spaceTime;
        return timeInCycle < waitingTime;
    }

    function setGiftRedemptionMilestones(
        uint256 milestones
    ) external onlyAdmin {
        noelProxy.setGiftRedemptionMilestones(milestones);
    }

    function getGiftRedemptionMilestones() external view returns (uint256) {
        return noelProxy.getGiftRedemptionMilestones();
    }

    function setWaitingTime(uint64 _waitingTime) external onlyAdmin {
        noelProxy.setWaitingTime(_waitingTime);
    }

    function getWaitingTime() external view returns (uint64) {
        return noelProxy.getWaitingTime();
    }

    function setSpaceTime(uint64 _spaceTime) external onlyAdmin {
        noelProxy.setSpaceTime(_spaceTime);
    }

    function getSpaceTime() external view returns (uint64) {
        return noelProxy.getSpaceTime();
    }

    function getGifts(address to) external view returns (uint256) {
        return noelProxy.getGifts(to);
    }

    function getLastClaimTime(address _player) external view returns (uint64) {
        return noelProxy.getLastClaimTime(_player);
    }

    function isMinted(address to) external view returns (bool) {
        return noelNFT.isMinted(to);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return noelNFT.tokenURI(tokenId);
    }

    function name() external view returns (string memory) {
        return noelNFT.name();
    }

    function symbol() external view returns (string memory) {
        return noelNFT.symbol();
    }

    function setStartTime(uint64 _startTime) external onlyAdmin {
        noelProxy.setStartTime(_startTime);
    }

    function getStartTime() external view returns (uint64) {
        return noelProxy.getStartTime();
    }

    function setEndTime(uint64 _endTime) external onlyAdmin {
        noelProxy.setEndTime(_endTime);
    }

    function getEndTime() external view returns (uint64) {
        return noelProxy.getEndTime();
    }
}
