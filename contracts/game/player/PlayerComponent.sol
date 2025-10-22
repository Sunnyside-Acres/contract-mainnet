// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";

/**
 * @title PlayerComponent
 * @author RYG.Labs
 * @notice Data storage contract for the Player system
 * @dev Stores all player data including resources, level, and progression
 */
contract PlayerComponent {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from player address to Player struct
    mapping(address => Player) public players;
    /// @notice Array of all player addresses
    address[] public playerAddresses;
    /// @notice Mapping to check if player exists
    mapping(address => bool) public playerExists;

    event PlayerCreated(address indexed playerAddress, string name);
    event AddSunlight(address indexed playerAddress, uint256 amount);
    event AddSunny(address indexed playerAddress, uint256 amount);
    event SubtractSunny(address indexed playerAddress, uint256 amount);
    event SubtractSunlight(address indexed playerAddress, uint256 amount);
    event SubtractMana(address indexed playerAddress, uint256 amount);
    event XPAdded(address indexed playerAddress, uint256 amount);
    event LevelUp(address indexed playerAddress, uint16 newLevel);

    /// @notice Restricts access to authorized logic contracts only
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    /**
     * @notice Create a new player
     * @param _playerAddress The player's address
     * @param _name The player's name
     * @return The newly created Player struct
     */
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

    /**
     * @notice Add sunlight to a player
     * @param _playerAddress The player's address
     * @param _amount The amount to add
     */
    function addSunlight(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].sunlight += _amount;

        emit AddSunlight(_playerAddress, _amount);
    }

    /**
     * @notice Add sunny tokens to a player
     * @param _playerAddress The player's address
     * @param _amount The amount to add
     */
    function addSunny(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].sunny += _amount;

        emit AddSunny(_playerAddress, _amount);
    }

    /**
     * @notice Subtract sunny tokens from a player
     * @param _playerAddress The player's address
     * @param _amount The amount to subtract
     */
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

    /**
     * @notice Subtract sunlight from a player
     * @param _playerAddress The player's address
     * @param _amount The amount to subtract
     */
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

    /**
     * @notice Subtract mana from a player
     * @param _playerAddress The player's address
     * @param _amount The amount to subtract
     */
    function subtractMana(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        require(
            players[_playerAddress].mana >= _amount,
            "[COMPONENT] Insufficient mana"
        );
        players[_playerAddress].mana -= uint16(_amount);

        emit SubtractMana(_playerAddress, _amount);
    }

    /**
     * @notice Set a player's mana
     * @param _playerAddress The player's address
     * @param _mana The new mana value
     */
    function setMana(
        address _playerAddress,
        uint16 _mana
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].mana = _mana;
    }

    /**
     * @notice Get a player's sunlight
     * @param _playerAddress The player's address
     * @return The player's sunlight amount
     */
    function getSunlight(
        address _playerAddress
    ) external view returns (uint256) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress].sunlight;
    }

    /**
     * @notice Get player data
     * @param _playerAddress The player's address
     * @return The Player struct
     */
    function getPlayer(
        address _playerAddress
    ) external view returns (Player memory) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress];
    }

    /**
     * @notice Get all player addresses
     * @return Array of all player addresses
     */
    function getPlayerAddresses() external view returns (address[] memory) {
        return playerAddresses;
    }

    /**
     * @notice Add experience points to a player
     * @param _playerAddress The player's address
     * @param _amount The amount of XP to add
     */
    function addXP(
        address _playerAddress,
        uint256 _amount
    ) external onlyAuthorized {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        players[_playerAddress].xp += _amount;

        emit XPAdded(_playerAddress, _amount);
    }

    /**
     * @notice Get a player's experience points
     * @param _playerAddress The player's address
     * @return The player's XP
     */
    function getXP(address _playerAddress) external view returns (uint256) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress].xp;
    }

    /**
     * @notice Level up a player
     * @dev Requires player to have sufficient XP (level * 1000)
     * @param _playerAddress The player's address
     */
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

    /**
     * @notice Get a player's level
     * @param _playerAddress The player's address
     * @return The player's level
     */
    function getLevel(address _playerAddress) external view returns (uint16) {
        require(playerExists[_playerAddress], "[COMPONENT] Player not found");
        return players[_playerAddress].level;
    }
}
