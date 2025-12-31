//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";

contract SkinComponent {
    address public world;
    address public implementation;
    mapping(address => uint256[]) public playerSkins; // player address => skinId
    mapping(string => address[]) public skinOwners; // typeSkin => list of owner addresses
    mapping(string => uint256) public skinMaxSupply; // typeSkin => max supply allowed
    mapping(uint256 => string) public skinTypes; // skinId => typeSkin

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[NewYearComponent] Unauthorized"
        );
        _;
    }

    function getPlayerSkins(address player) external view returns (uint256[] memory) {
        return playerSkins[player];
    }

    function getSkinOwners(string memory typeSkin) external view returns (address[] memory) {
        return skinOwners[typeSkin];
    }

    function setPlayerSkin(address player, uint256 skinId) external onlyAuthorized {
        playerSkins[player].push(skinId);
    }

    function addSkinOwner(string memory typeSkin, address owner) external onlyAuthorized {
        skinOwners[typeSkin].push(owner);
    }

    function setSkinMaxSupply(string memory typeSkin, uint256 maxSupply) external onlyAuthorized {
        skinMaxSupply[typeSkin] = maxSupply;
    }

    function getSkinMaxSupply(string memory typeSkin) external view returns (uint256) {
        return skinMaxSupply[typeSkin];
    }

    function setSkinType(uint256 skinId, string memory typeSkin) external onlyAuthorized {
        skinTypes[skinId] = typeSkin;
    }
    
    function getSkinType(uint256 skinId) external view returns (string memory) {
        return skinTypes[skinId];
    }
}