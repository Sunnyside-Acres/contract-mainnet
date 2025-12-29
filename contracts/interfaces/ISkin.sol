//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISkin {
    function addSkinOwner(string memory skinURI, address owner) external;
    function getSkinOwners(string memory skinURI) external view returns (address[] memory);

    function setPlayerSkin(address player, uint256 skinId) external;
    function getPlayerSkins(address player) external view returns (uint256[] memory);
    
    function setSkinMaxSupply(string memory skinURI, uint256 maxSupply) external;
    function getSkinMaxSupply(string memory skinURI) external view returns (uint256);

}