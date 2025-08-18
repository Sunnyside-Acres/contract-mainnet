// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract World is Ownable {
    mapping(address => bool) public registeredLogics;
    mapping(address => bool) public adminAddresses;

    constructor(address _owner) Ownable(_owner) {
        adminAddresses[_owner] = true;
    }

    function setAdmin(address _adminAddress) external onlyOwner {
        adminAddresses[_adminAddress] = true;
    }

    function removeAdmin(address _adminAddress) external onlyOwner {
        adminAddresses[_adminAddress] = false;
    }

    function isAdmin(address _adminAddress) external view returns (bool) {
        return adminAddresses[_adminAddress];
    }

    function isLogicRegistered(address _logicAddress) external view returns (bool) {
        return registeredLogics[_logicAddress];
    }

    function registerLogic(address _logicAddress) external onlyOwner {
        registeredLogics[_logicAddress] = true;
    }
}