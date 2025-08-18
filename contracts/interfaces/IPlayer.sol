// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Player.sol";

interface IPlayerComponent {
    function createPlayer(address _playerAddress, string memory _name) external;

    function getPlayer(
        address _playerAddress
    ) external view returns (Player memory);

    function addSunlight(address _playerAddress, uint256 _amount) external;

    function addSunny(address _playerAddress, uint256 _amount) external;

    function getPlayerAddresses() external view returns (address[] memory);
}
