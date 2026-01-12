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

    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(address _world, address _skinProxy, address _skinNFT) {
        world = IWorld(_world);
        skinProxy = ISkin(_skinProxy);
        skinNFT = ISkinNFT(_skinNFT);
    }

    function setSkinMaxSupply(
        string memory typeSkin,
        uint256 maxSupply
    ) external onlyAdmin {
        skinProxy.setSkinMaxSupply(typeSkin, maxSupply);
    }

    function getSkinMaxSupply(
        string memory typeSkin
    ) external view returns (uint256) {
        return skinProxy.getSkinMaxSupply(typeSkin);
    }

    function getPlayerSkins(
        address player
    ) external view returns (uint256[] memory) {
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
        skinNFT.updateBaseURI(newBaseURI);
    }

    function getSkinType(uint256 skinId) external view returns (string memory) {
        return skinProxy.getSkinType(skinId);
    }

    function getCurrentSupply(
        string memory typeSkin
    ) external view returns (uint256) {
        return skinProxy.getCurrentSupply(typeSkin);
    }

    function canSupply(string memory typeSkin) external view returns (bool) {
        return skinProxy.canSupply(typeSkin);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return skinNFT.ownerOf(tokenId);
    }

    function approve(address to, uint256 tokenId) external {
        require(
            skinNFT.ownerOf(tokenId) == msg.sender ||
                skinNFT.getApproved(tokenId) == msg.sender,
            "Not the owner of the skin or approved to transfer"
        );
        skinNFT.approve(to, tokenId);
        emit Approval(msg.sender, to, tokenId);
    }
}
