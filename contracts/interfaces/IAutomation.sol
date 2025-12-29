// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Automation.sol";

interface IAutomationComponent {
    function getFactory(address player, uint256 factoryId) external view returns (FactoryState memory);
    function setFactory(address player, uint256 factoryId, FactoryState memory state) external;
    function setFactoryActive(address player, uint256 factoryId, bool isActive) external;
    function updateClaimedOutput(address player, uint256 factoryId, uint256 indexClaimed, uint256 newClaimedAmount) external;
    function resetFactory(address player, uint256 factoryId) external;

    function getFactoryPrice(uint256 factoryId) external view returns (uint256);
    function getAllFactoryPrices() external view returns (uint256[] memory);
    function setFactoryPrice(uint256 factoryId, uint256 price) external;

    function getMaxFactory() external view returns (uint256);
    function setMaxFactory(uint256 newMaxFactory) external;

    function getBatteryIdValid() external view returns (uint256[] memory);
    function setBatteryIdValid(uint256[] memory newBatteryIds) external;

    function getSupportIdValid() external view returns (uint256[] memory);
    function setSupportIdValid(uint256[] memory newSupportIds) external;

    function isBatteryIdValid(uint256 batteryId) external view returns (bool);
    function isSupportIdValid(uint256 supportId) external view returns (bool);
}