// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INoel.sol";
import "../../interfaces/IInventory.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NoelLogic is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    IWorld public world;
    INoelComponent public noelProxy;
    IInventoryComponent public inventoryProxy;

    uint256 public maxSupply;
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    mapping(address => uint256) public nonces;

    event ClaimGift(
        address indexed player,
        uint256 indexed itemId,
        uint256 amount,
        uint256 totalAmount
    );

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(
        address _world,
        address _noelProxy,
        address _inventoryProxy,
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        world = IWorld(_world);
        noelProxy = INoelComponent(_noelProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        maxSupply = _maxSupply;
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function safeMint(bytes calldata proof) external returns (uint256) {
        address player = msg.sender;
        bytes32 message = keccak256(
            abi.encodePacked(player, address(this), nonces[player])
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

        require(_nextTokenId < maxSupply, "Max supply reached");
        require(
            !noelProxy.getHasMinted(player),
            "User has already redeemed NFT"
        );

        uint256 numGift = noelProxy.getGifts(player);
        uint256 giftRedemptionMilestones = noelProxy
            .getGiftRedemptionMilestones();

        require(
            numGift >= giftRedemptionMilestones,
            "Not enough gifts to redeem"
        );

        uint256 tokenId = _nextTokenId++;
        
        _safeMint(player, tokenId);

        noelProxy.setGift(player, numGift - giftRedemptionMilestones);
        noelProxy.setHasMinted(player, true);

        return tokenId;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
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

        uint256 giftAmount = noelProxy.getGifts(player);

        uint256 newGiftAmount = giftAmount + amount;

        noelProxy.setGift(player, newGiftAmount);

        InventoryItem memory item = inventoryProxy.getItem(player, itemId);

        inventoryProxy.setItem(
            player,
            itemId,
            newGiftAmount,
            item.durability,
            item.expiration
        );

        noelProxy.setLastClaimTime(player, currentTime);

        emit ClaimGift(player, itemId, amount, newGiftAmount);
    }

    function canClaimGift() public view returns (bool) {
        uint64 currentTime = uint64(block.timestamp);
        uint64 spaceTime = noelProxy.getSpaceTime();
        uint64 waitingTime = noelProxy.getWaitingTime();

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

    function isMinted(address _player) external view returns (bool) {
        return noelProxy.getHasMinted(_player);
    }
}
