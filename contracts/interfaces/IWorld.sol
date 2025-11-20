// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IWorld
 * @notice Interface for the World contract managing game permissions and logic registration
 */
interface IWorld {
    /**
     * @notice Checks if a logic contract is registered
     * @param logic Address of the logic contract to check
     * @return bool True if the logic is registered
     */
    function isLogicRegistered(address logic) external view returns (bool);

    /**
     * @notice Checks if an account has admin privileges
     * @param account Address to check
     * @return bool True if the account is an admin
     */
    function isAdmin(address account) external view returns (bool);

    /**
     * @notice Checks if an account is a registered player
     * @param account Address to check
     * @return bool True if the account is a player
     */
    function isPlayer(address account) external view returns (bool);

    /**
     * @notice Grants admin privileges to an address
     * @param adminAddress Address to grant admin privileges
     */
    function setAdmin(address adminAddress) external;

    /**
     * @notice Revokes admin privileges from an address
     * @param adminAddress Address to revoke admin privileges
     */
    function removeAdmin(address adminAddress) external;

    /**
     * @notice Registers a logic contract with the World
     * @param logicAddress Address of the logic contract to register
     */
    function registerLogic(address logicAddress) external;
}
