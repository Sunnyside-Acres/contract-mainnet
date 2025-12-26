// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Automation.sol";
import "../../interfaces/IWorld.sol";

contract AutomationComponent {
    address public world;
    address public implementation;
    uint256 public maxFactory;
    mapping(address => mapping(uint256 => FactoryState)) public userFactories;
    mapping(uint256 => uint256) public factoryPrices;

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[AutomationComponent] Unauthorized"
        );
        _;
    }

    function getFactory(
        address player,
        uint256 factoryId
    ) external view returns (FactoryState memory) {
        return userFactories[player][factoryId];
    }

    function setFactory(
        address player,
        uint256 factoryId,
        FactoryState memory state
    ) external onlyAuthorized {
        userFactories[player][factoryId] = state;
    }

    function setFactoryActive(
        address player,
        uint256 factoryId,
        bool isActive
    ) external onlyAuthorized {
        userFactories[player][factoryId].isActive = isActive;
    }

    function updateClaimedOutput(
        address player,
        uint256 factoryId,
        uint256 indexClaimed,
        uint256 newClaimedAmount
    ) external onlyAuthorized {
        userFactories[player][factoryId].claimedOutput[indexClaimed] = newClaimedAmount;
    }

    function resetFactory(
        address player,
        uint256 factoryId
    ) external onlyAuthorized {
        bool owned = userFactories[player][factoryId].isOwned;
        delete userFactories[player][factoryId];
        userFactories[player][factoryId].isOwned = owned;
        userFactories[player][factoryId].isActive = false;
    }

    function getFactoryPrice(
        uint256 factoryId
    ) external view returns (uint256) {
        return factoryPrices[factoryId];
    }

    function getAllFactoryPrices() external view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](maxFactory);
        for (uint256 i = 0; i < maxFactory; i++) {
            prices[i] = factoryPrices[i];
        }
        return prices;
    }

    function setFactoryPrice(
        uint256 factoryId,
        uint256 price
    ) external onlyAuthorized {
        factoryPrices[factoryId] = price;
    }

    function getMaxFactory() external view returns (uint256) {
        return maxFactory;
    }

    function setMaxFactory(
        uint256 newMaxFactory
    ) external onlyAuthorized {
        maxFactory = newMaxFactory;
    }
}
