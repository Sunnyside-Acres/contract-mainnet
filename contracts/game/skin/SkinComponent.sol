//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";

contract SkinComponent {
    address public world;
    address public implementation;
    mapping(address => uint256[]) public playerSkins; // player address => skinId
    mapping(string => address[]) public skinOwners; // skinURI => list of owner addresses
    mapping(string => uint256) public skinMaxSupply; // skinURI => max supply allowed

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


    function getSkinOwners(string memory skinURI) external view returns (address[] memory) {
        return skinOwners[skinURI];
    }

    function setPlayerSkin(address player, uint256 skinId) external onlyAuthorized {
        playerSkins[player].push(skinId);
    }

    function addSkinOwner(string memory skinURI, address owner) external onlyAuthorized {
        skinOwners[skinURI].push(owner);
    }

    function setSkinMaxSupply(string memory skinURI, uint256 maxSupply) external onlyAuthorized {
        skinMaxSupply[skinURI] = maxSupply;
    }

    function getSkinMaxSupply(string memory skinURI) external view returns (uint256) {
        return skinMaxSupply[skinURI];
    }
}