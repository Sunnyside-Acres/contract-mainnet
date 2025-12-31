//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ISkinNFT.sol";
import "../../interfaces/ISkin.sol";
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

    function safeMint(string memory typeSkin, bytes calldata proof) external {
        address player = msg.sender;
        bytes32 message = keccak256(
            abi.encodePacked(player, typeSkin, address(this), nonces[player])
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
                skinProxy.getSkinOwners(typeSkin).length < skinProxy.getSkinMaxSupply(typeSkin),
            "Max supply reached for this skin"
        );

        uint256 skinId = skinNFT.mint(player, typeSkin);

        skinProxy.setPlayerSkin(player, skinId);
        skinProxy.addSkinOwner(typeSkin, player);
        skinProxy.setSkinType(skinId, typeSkin);

        emit ClaimNFT(player, skinId, typeSkin);
    }

    function setSkinMaxSupply(string memory typeSkin, uint256 maxSupply) external onlyAdmin {
        skinProxy.setSkinMaxSupply(typeSkin, maxSupply);
    }

    function getSkinMaxSupply(string memory typeSkin) external view returns (uint256) {
        return skinProxy.getSkinMaxSupply(typeSkin);
    }

    function getSkinOwners(string memory typeSkin) external view returns (address[] memory) {
        return skinProxy.getSkinOwners(typeSkin);
    }

    function getPlayerSkins(address player) external view returns (uint256[] memory) {
        return skinProxy.getPlayerSkins(player);
    }

    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return skinNFT.tokenURI(tokenId);
    }

    function name() external view returns (string memory) {
        return skinNFT.name();
    }

    function symbol() external view returns (string memory) {
        return skinNFT.symbol();
    }

    function totalSupply() external view returns (uint256) {
        return skinNFT.totalSupply();
    }

    function updateBaseURI(string memory newBaseURI) external onlyAdmin {
        skinNFT.updateBaseURI(newBaseURI);
    }

    function getSkinType(uint256 skinId) external view returns (string memory) {
        return skinProxy.getSkinType(skinId);
    }
}