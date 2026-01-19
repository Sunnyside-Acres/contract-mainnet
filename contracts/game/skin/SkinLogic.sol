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

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    event SkinDescriptionUpdated(
        string indexed typeSkin,
        string oldDescription,
        string newDescription,
        address indexed admin
    );

    event SkinMaxSupplyUpdated(
        string indexed typeSkin,
        uint256 oldMaxSupply,
        uint256 newMaxSupply,
        address indexed admin
    );

    event BaseURIUpdated(string newBaseURI, address indexed admin);

    constructor(address _world, address _skinProxy, address _skinNFT) {
        world = IWorld(_world);
        skinProxy = ISkin(_skinProxy);
        skinNFT = ISkinNFT(_skinNFT);
    }

    function setSkinMaxSupply(
        string memory typeSkin,
        uint256 maxSupply
    ) external onlyAdmin {
        require(maxSupply > 0, "Max supply must be greater than zero");
        require(bytes(typeSkin).length > 0, "Skin type cannot be empty");
        require(
            !skinProxy.getSkin(typeSkin).exists,
            "Skin type already exists"
        );

        skinProxy.setSkinMaxSupply(typeSkin, maxSupply);

        emit SkinMaxSupplyUpdated(
            typeSkin,
            skinProxy.getSkinMaxSupply(typeSkin),
            maxSupply,
            msg.sender
        );
    }

    function getSkinMaxSupply(
        string memory typeSkin
    ) external view returns (uint256) {
        require(bytes(typeSkin).length > 0, "Skin type cannot be empty");
        require(skinProxy.getSkin(typeSkin).exists, "Skin type does not exist");
        return skinProxy.getSkinMaxSupply(typeSkin);
    }

    function getPlayerSkins(
        address player
    ) external view returns (uint256[] memory) {
        require(player != address(0), "Player cannot be zero address");
        return skinProxy.getPlayerSkins(player);
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
        require(bytes(newBaseURI).length > 0, "New base URI cannot be empty");
        skinNFT.updateBaseURI(newBaseURI);
        emit BaseURIUpdated(newBaseURI, msg.sender);
    }

    function getSkinType(uint256 skinId) external view returns (string memory) {
        return skinProxy.getSkinType(skinId);
    }

    function getCurrentSupply(
        string memory typeSkin
    ) external view returns (uint256) {
        require(bytes(typeSkin).length > 0, "Skin type cannot be empty");
        require(skinProxy.getSkin(typeSkin).exists, "Skin type does not exist");
        return skinProxy.getCurrentSupply(typeSkin);
    }

    function canSupply(string memory typeSkin) external view returns (bool) {
        require(bytes(typeSkin).length > 0, "Skin type cannot be empty");
        return skinProxy.canSupply(typeSkin);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        require(tokenId > 0, "Token ID must be greater than zero");
        return skinNFT.ownerOf(tokenId);
    }

    function getDescription(
        string memory typeSkin
    ) external view returns (string memory) {
        require(bytes(typeSkin).length > 0, "Skin type cannot be empty");
        require(skinProxy.getSkin(typeSkin).exists, "Skin type does not exist");
        return skinProxy.getDescription(typeSkin);
    }

    function setDescription(
        string memory typeSkin,
        string memory description
    ) external onlyAdmin {
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(typeSkin).length > 0, "Skin type cannot be empty");
        require(skinProxy.getSkin(typeSkin).exists, "Skin type does not exist");

        skinProxy.setDescription(typeSkin, description);

        emit SkinDescriptionUpdated(
            typeSkin,
            skinProxy.getDescription(typeSkin),
            description,
            msg.sender
        );
    }
}
