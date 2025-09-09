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
    event XPAdded(address indexed playerAddress, uint256 amount);
    event LevelUp(address indexed playerAddress, uint16 newLevel);

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
    ) external onlyAuthorized returns (Player memory) {
        require(
            !playerExists[_playerAddress],
            "[COMPONENT] Player already initialized"
        );

        Player storage player = players[_playerAddress];

        player.playerAddress = _playerAddress;
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

        return player;
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
        require(
            players[_playerAddress].sunlight >= _amount,
            "[COMPONENT] Insufficient sunlight"
        );
        players[_playerAddress].sunlight -= _amount;

        emit SubtractSunlight(_playerAddress, _amount);
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

    // Experience functions
    function addXP(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].xp += _amount;

        emit XPAdded(_playerAddress, _amount);
    }

    function getXP(address _playerAddress) external view returns (uint256) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress].xp;
    }

    function levelUp(address _playerAddress) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");

        Player storage player = players[_playerAddress];
        uint16 currentLevel = player.level;
        uint256 currentXP = player.xp;

        // Calculate required XP for next level (simple formula: level * 1000)
        uint256 requiredXP = uint256(currentLevel) * 1000;

        require(
            currentXP >= requiredXP,
            "[COMPONENT] Insufficient XP for level up"
        );

        player.level = currentLevel + 1;
        player.maxMana += 100; // Increase max mana with level
        player.mana = player.maxMana; // Restore mana to full

        emit LevelUp(_playerAddress, player.level);
    }

    function getLevel(address _playerAddress) external view returns (uint16) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress].level;
    }
}
