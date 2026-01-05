//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISkin {
    function setPlayerSkin(address player, uint256 skinId) external;
    function getPlayerSkins(address player) external view returns (uint256[] memory);
    
    function setSkinMaxSupply(string memory typeSkin, uint256 maxSupply) external;
    function getSkinMaxSupply(string memory typeSkin) external view returns (uint256);

    function setSkinType(uint256 skinId, string memory typeSkin) external;
    function getSkinType(uint256 skinId) external view returns (string memory);

    function canSupply(string memory typeSkin, uint256 amount) external view returns (bool);

    function incrementCurrentSupply(string memory typeSkin, uint256 amount) external;
    function getCurrentSupply(string memory typeSkin) external view returns (uint256);

    function addSkinBatch(address player, uint256[] memory tokenIds, string memory typeSkin) external;
}