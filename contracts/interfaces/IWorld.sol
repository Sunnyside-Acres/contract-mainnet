// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IWorld {
    function isLogicRegistered(address logic) external view returns (bool);

    function isAdmin(address account) external view returns (bool);

    function isPlayer(address account) external view returns (bool);

    function setAdmin(address adminAddress) external;

    function removeAdmin(address adminAddress) external;

    function registerLogic(address logicAddress) external;
}