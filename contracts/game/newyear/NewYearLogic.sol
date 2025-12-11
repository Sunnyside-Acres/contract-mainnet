//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INewYear.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NewYearLogic is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    IWorld public world;
    INewYearComponent public newYearProxy;

    uint256 public maxSupply;
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    mapping(address => uint256) public nonces;

    event ClaimNFT(address indexed player, uint256 indexed tokenId);

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(
        address _world,
        address _newYearProxy,
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        world = IWorld(_world);
        newYearProxy = INewYearComponent(_newYearProxy);
        maxSupply = _maxSupply;
        _baseTokenURI = baseURI;
    }

    function safeMint(bytes calldata proof) external {
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
        require(newYearProxy.canClaimNFT(), "Not within claim period");
        require(
            !newYearProxy.isMinted(player),
            "User has already redeemed NFT"
        );

        uint256 tokenId = _nextTokenId++;
        _safeMint(player, tokenId);

        newYearProxy.setHasMinted(player, true);
        emit ClaimNFT(player, tokenId);
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

    function getCurrentTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    function getBaseTokenURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    function canClaimNFT(address player) external view returns (bool) {
        if (newYearProxy.isMinted(player)) {
            return false;
        }
        return newYearProxy.canClaimNFT();
    }

    function setBaseTokenURI(string memory baseTokenURI) external onlyAdmin {
        _baseTokenURI = baseTokenURI;
    }

    function getStartTime() external view returns (uint64) {
        return newYearProxy.getStartTime();
    }

    function setStartTime(uint64 _startTime) external onlyAdmin {
        newYearProxy.setStartTime(_startTime);
    }

    function getEndTime() external view returns (uint64) {
        return newYearProxy.getEndTime();
    }

    function setEndTime(uint64 _endTime) external onlyAdmin {
        newYearProxy.setEndTime(_endTime);
    }

    function isMinted(address player) external view returns (bool) {
        return newYearProxy.isMinted(player);
    }

    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
    }
}
