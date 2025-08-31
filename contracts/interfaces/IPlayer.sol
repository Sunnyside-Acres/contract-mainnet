// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Player.sol";

interface IPlayerComponent {
    function createPlayer(
        address _playerAddress,
        string memory _name
    ) external returns (Player memory);

    function getPlayer(
        address _playerAddress
    ) external view returns (Player memory player);

    function addSunlight(address _playerAddress, uint256 _amount) external;

    function addSunny(address _playerAddress, uint256 _amount) external;

    function subtractSunny(address _playerAddress, uint256 _amount) external;

    function subtractSunlight(address _playerAddress, uint256 _amount) external;

    function getSunlight(
        address _playerAddress
    ) external view returns (uint256);

    function getPlayerAddresses() external view returns (address[] memory);
}
