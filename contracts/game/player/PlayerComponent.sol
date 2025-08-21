// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";

contract PlayerComponent {
    address public world;
    address public admin;
    address public implementation;

    mapping(address => Player) public players;
    address[] public playerAddresses;
    mapping(address => bool) public playerExists;

    event PlayerCreated(address indexed playerAddress, string name);
    event AddSunlight(address indexed playerAddress, uint256 amount);
    event AddSunny(address indexed playerAddress, uint256 amount);
    event SubtractSunny(address indexed playerAddress, uint256 amount);
    event SubtractSunlight(address indexed playerAddress, uint256 amount);

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    function createPlayer(
        address _playerAddress,
        string memory _name
    ) external onlyAuthorized {
        require(
            !playerExists[_playerAddress],
            "[COMPONENT] Player already initialized"
        );

        Player storage player = players[_playerAddress];

        player.name = _name;
        player.level = 1;
        player.xp = 0;
        player.mana = 1000;
        player.maxMana = 1000;
        player.sunlight = 500;
        player.sunny = 0;
        player.lastLogin = block.timestamp;

        playerAddresses.push(_playerAddress);
        playerExists[_playerAddress] = true;

        emit PlayerCreated(_playerAddress, _name);
    }

    function addSunlight(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].sunlight += _amount;

        emit AddSunlight(_playerAddress, _amount);
    }

    function addSunny(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].sunny += _amount;

        emit AddSunny(_playerAddress, _amount);
    }

    function subtractSunny(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        require(
            players[_playerAddress].sunny >= _amount,
            "[COMPONENT] Insufficient sunny"
        );
        players[_playerAddress].sunny -= _amount;

        emit SubtractSunny(_playerAddress, _amount);
    }

    function subtractSunlight(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].sunlight -= _amount;
    }

    function getSunlight(
        address _playerAddress
    ) external view returns (uint256) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress].sunlight;
    }

    function getPlayer(
        address _playerAddress
    ) external view returns (Player memory) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress];
    }

    function getPlayerAddresses() external view returns (address[] memory) {
        return playerAddresses;
    }
}
