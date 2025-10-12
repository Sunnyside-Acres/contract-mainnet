// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Player.sol";

/**
 * @title IPlayerComponent
 * @notice Interface for managing player data and currencies
 */
interface IPlayerComponent {
    /**
     * @notice Creates a new player profile
     * @param _playerAddress Address of the player
     * @param _name Name of the player
     * @return Player struct containing player data
     */
    function createPlayer(
        address _playerAddress,
        string memory _name
    ) external returns (Player memory);

    /**
     * @notice Retrieves player data
     * @param _playerAddress Address of the player
     * @return player Player struct containing player data
     */
    function getPlayer(
        address _playerAddress
    ) external view returns (Player memory player);

    /**
     * @notice Adds sunlight currency to a player
     * @param _playerAddress Address of the player
     * @param _amount Amount of sunlight to add
     */
    function addSunlight(address _playerAddress, uint256 _amount) external;

    /**
     * @notice Adds sunny currency to a player
     * @param _playerAddress Address of the player
     * @param _amount Amount of sunny to add
     */
    function addSunny(address _playerAddress, uint256 _amount) external;

    /**
     * @notice Subtracts sunny currency from a player
     * @param _playerAddress Address of the player
     * @param _amount Amount of sunny to subtract
     */
    function subtractSunny(address _playerAddress, uint256 _amount) external;

    /**
     * @notice Subtracts sunlight currency from a player
     * @param _playerAddress Address of the player
     * @param _amount Amount of sunlight to subtract
     */
    function subtractSunlight(address _playerAddress, uint256 _amount) external;

    /**
     * @notice Gets the sunlight balance of a player
     * @param _playerAddress Address of the player
     * @return uint256 Sunlight balance
     */
    function getSunlight(
        address _playerAddress
    ) external view returns (uint256);

    /**
     * @notice Gets all registered player addresses
     * @return Array of player addresses
     */
    function getPlayerAddresses() external view returns (address[] memory);

    /**
     * @notice Adds experience points to a player
     * @param _playerAddress Address of the player
     * @param _amount Amount of XP to add
     */
    function addXP(address _playerAddress, uint256 _amount) external;

    /**
     * @notice Gets the experience points of a player
     * @param _playerAddress Address of the player
     * @return uint256 Experience points
     */
    function getXP(address _playerAddress) external view returns (uint256);

    /**
     * @notice Levels up a player
     * @param _playerAddress Address of the player
     */
    function levelUp(address _playerAddress) external;

    /**
     * @notice Gets the level of a player
     * @param _playerAddress Address of the player
     * @return uint16 Player level
     */
    function getLevel(address _playerAddress) external view returns (uint16);
}
