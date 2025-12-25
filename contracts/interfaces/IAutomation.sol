// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Automation.sol";

interface IAutomationComponent {
    function createFactory(uint256 factoryId, uint256 price) external;
    function getFactory(address player, uint256 factoryId) external view returns (FactoryState memory);
    function setFactory(address player, uint256 factoryId, FactoryState memory state) external;
    function setFactoryActive(address player, uint256 factoryId, bool isActive) external;
    function updateClaimedOutput(address player, uint256 factoryId, uint256 indexClaimed, uint256 newClaimedAmount) external;
    function resetFactory(address player, uint256 factoryId) external;

    function getFactoryPrice(uint256 factoryId) external view returns (uint256);
    function setFactoryPrice(uint256 factoryId, uint256 price) external;
}
