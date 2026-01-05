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

    function incrementCurrentSupply(
        string memory typeSkin,
        uint256 amount
    ) external onlyAuthorized {
        skins[typeSkin].currentSupply += amount;
    }

    function canSupply(
        string memory typeSkin,
        uint256 amount
    ) external view returns (bool) {
        SkinTypeInfo storage skinInfo = skins[typeSkin];
        if (!skinInfo.exists) {
            return false;
        }
        return (skinInfo.currentSupply + amount) <= skinInfo.maxSupply;
    }

    function getPlayerSkins(
        address player
    ) external view returns (uint256[] memory) {
        return playerSkins[player];
    }

    function setPlayerSkin(
        address player,
        uint256 skinId
    ) external onlyAuthorized {
        playerSkins[player].push(skinId);
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

    function addSkinBatch(
        address player,
        uint256[] memory tokenIds,
        string memory typeSkin
    ) external onlyAuthorized {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            playerSkins[player].push(tokenIds[i]);
            skinTypes[tokenIds[i]] = typeSkin;
        }
        skins[typeSkin].currentSupply += tokenIds.length;
    }
}
