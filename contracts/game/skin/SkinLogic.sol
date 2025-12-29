//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ISkinNFT.sol";
import "../../interfaces/ISkin.sol";
import "../../utils/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SkinLogic {
    IWorld public world;
    ISkinNFT public skinNFT;
    ISkin public skinProxy;
    mapping(address => uint256) public nonces;

    event ClaimNFT(address indexed player, uint256 indexed tokenId, string skinURI);

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(
        address _world,
        address _skinProxy,
        address _skinNFT
    ) {
        world = IWorld(_world);
        skinProxy = ISkin(_skinProxy);
        skinNFT = ISkinNFT(_skinNFT);
    }

    function safeMint(uint256 skinId, string memory uri, bytes calldata proof) external {
        address player = msg.sender;
        bytes32 message = keccak256(
            abi.encodePacked(player, skinId, uri, address(this), nonces[player])
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

        require(
                skinProxy.getSkinOwners(uri).length < skinProxy.getSkinMaxSupply(uri),
            "Max supply reached for this skin"
        );

        uint256 tokenId = skinNFT.mint(player, uri);

        skinProxy.setPlayerSkin(player, skinId);
        skinProxy.addSkinOwner(uri, player);

        emit ClaimNFT(player, tokenId, uri);
    }

    function setSkinMaxSupply(string memory skinURI, uint256 maxSupply) external onlyAdmin {
        skinProxy.setSkinMaxSupply(skinURI, maxSupply);
    }

    function getSkinMaxSupply(string memory skinURI) external view returns (uint256) {
        return skinProxy.getSkinMaxSupply(skinURI);
    }

    function getSkinOwners(string memory skinURI) external view returns (address[] memory) {
        return skinProxy.getSkinOwners(skinURI);
    }

    function getPlayerSkins(address player) external view returns (uint256[] memory) {
        return skinProxy.getPlayerSkins(player);
    }

    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
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

    function totalSupply() external view returns (uint256) {
        return noelNFT.totalSupply();
    }
}