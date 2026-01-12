//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../struct/Skin.sol";
interface ISkin {
    function getPlayerSkins(address player) external view returns (uint256[] memory);
    
    function setSkinMaxSupply(string memory typeSkin, uint256 maxSupply) external;
    function getSkinMaxSupply(string memory typeSkin) external view returns (uint256);

    function setSkinType(uint256 skinId, string memory typeSkin) external;
    function getSkinType(uint256 skinId) external view returns (string memory);

    function canSupply(string memory typeSkin, uint256 amount) external view returns (bool);

    function incrementCurrentSupply(string memory typeSkin, uint256 amount) external;
    function getCurrentSupply(string memory typeSkin) external view returns (uint256);

    function addSkin(address player, uint256 tokenId, string memory typeSkin) external;

    function getSkin(string memory typeSkin) external view returns (SkinTypeInfo memory);
}