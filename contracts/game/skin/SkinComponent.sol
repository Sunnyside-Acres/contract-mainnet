//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/Skin.sol";

contract SkinComponent {
    address public world;
    address public implementation;
    mapping(address => uint256[]) public playerSkins; // player address => skinIds
    mapping(string => SkinTypeInfo) public skins; // typeSkin => SkinTypeInfo
    mapping(uint256 => string) public skinTypes; // skinId => typeSkin

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[SkinComponent] Unauthorized"
        );
        _;
    }

    function getCurrentSupply(
        string memory typeSkin
    ) external view returns (uint256) {
        return skins[typeSkin].currentSupply;
    }

    function canSupply(string memory typeSkin) external view returns (bool) {
        SkinTypeInfo storage skinInfo = skins[typeSkin];
        if (!skinInfo.exists) {
            return false;
        }
        return skinInfo.currentSupply < skinInfo.maxSupply;
    }

    function getPlayerSkins(
        address player
    ) external view returns (uint256[] memory) {
        return playerSkins[player];
    }

    function setSkinMaxSupply(
        string memory typeSkin,
        uint256 maxSupply
    ) external onlyAuthorized {
        skins[typeSkin].maxSupply = maxSupply;
        skins[typeSkin].exists = true;
    }

    function getSkinMaxSupply(
        string memory typeSkin
    ) external view returns (uint256) {
        return skins[typeSkin].maxSupply;
    }

    function setSkinType(
        uint256 skinId,
        string memory typeSkin
    ) external onlyAuthorized {
        skinTypes[skinId] = typeSkin;
    }

    function getSkinType(uint256 skinId) external view returns (string memory) {
        return skinTypes[skinId];
    }

    function addSkin(
        address player,
        uint256 tokenId,
        string memory typeSkin
    ) external onlyAuthorized {
        playerSkins[player].push(tokenId);
        skinTypes[tokenId] = typeSkin;
        skins[typeSkin].currentSupply++;
    }

    function getSkin(
        string memory typeSkin
    ) external view returns (SkinTypeInfo memory) {
        return skins[typeSkin];
    }

    function getDescription(
        string memory typeSkin
    ) external view returns (string memory) {
        return skins[typeSkin].description;
    }

    function setDescription(
        string memory typeSkin,
        string memory description
    ) external onlyAuthorized {
        skins[typeSkin].description = description;
    }
}
