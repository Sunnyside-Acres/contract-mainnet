// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IInventory.sol";

/**
 * @title PlayerLogic
 * @author RYG.Labs
 * @notice Logic contract for the Player system
 * @dev Handles player creation, resource management, and progression
 */
contract PlayerLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice Player component contract
    IPlayerComponent public playerProxy;
    /// @notice Inventory component contract
    IInventoryComponent public inventoryProxy;

    event PlayerCreated(
        address indexed playerAddress,
        string name,
        uint16 level,
        uint256 xp,
        uint16 mana,
        uint16 maxMana,
        uint256 sunlight,
        uint256 sunny,
        uint256 lastLogin
    );
    event LastLoginUpdated(address indexed playerAddress);

    /// @notice Restricts access to admin only
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Restricts access to registered logic contracts only
    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    /**
     * @notice Constructor to initialize the player logic contract
     * @param _world The address of the World contract
     * @param _playerProxy The address of the Player component
     * @param _inventoryProxy The address of the Inventory component
     */
    constructor(address _world, address _playerProxy, address _inventoryProxy) {
        world = IWorld(_world);
        playerProxy = IPlayerComponent(_playerProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
    }

    /**
     * @notice Create a new player
     * @dev Initializes player with starting items (Item 8 and Item 10)
     * @param _name The player's name
     */
    function createPlayer(string memory _name) external {
        // Validate name
        require(bytes(_name).length > 0, "[LOGIC] Name cannot be empty");
        require(bytes(_name).length <= 32, "[LOGIC] Name too long");

        Player memory player = playerProxy.createPlayer(msg.sender, _name);

        // Add starter items for new player
        // Item ID 8 - quantity 1, durability 100, expiration 0
        inventoryProxy.setItem(msg.sender, 8, 1, 100, 0);

        // Item ID 10 - quantity 1, durability 100, expiration 0
        inventoryProxy.setItem(msg.sender, 10, 1, 100, 0);

        emit PlayerCreated(
            msg.sender,
            player.name,
            player.level,
            player.xp,
            player.mana,
            player.maxMana,
            player.sunlight,
            player.sunny,
            player.lastLogin
        );
    }

    /**
     * @notice Add sunny tokens to a player (admin only)
     * @param _playerAddress The player's address
     * @param _amount The amount to add
     */
    function addSunny(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.addSunny(_playerAddress, _amount);
    }

    /**
     * @notice Subtract sunny tokens from a player (admin only)
     * @param _playerAddress The player's address
     * @param _amount The amount to subtract
     */
    function subtractSunny(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.subtractSunny(_playerAddress, _amount);
    }

    /**
     * @notice Add sunlight to a player (admin only)
     * @param _playerAddress The player's address
     * @param _amount The amount to add
     */
    function addSunlight(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.addSunlight(_playerAddress, _amount);
    }

    /**
     * @notice Subtract sunlight from a player (admin only)
     * @param _playerAddress The player's address
     * @param _amount The amount to subtract
     */
    function subtractSunlight(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.subtractSunlight(_playerAddress, _amount);
    }

    /**
     * @notice Get list of all player addresses
     * @return Array of player addresses
     */
    function getPlayerList() external view returns (address[] memory) {
        return playerProxy.getPlayerAddresses();
    }

    /**
     * @notice Get player data
     * @param _playerAddress The player's address
     * @return The Player struct
     */
    function getPlayerData(
        address _playerAddress
    ) external view returns (Player memory) {
        return playerProxy.getPlayer(_playerAddress);
    }

    /**
     * @notice Add experience points to a player (admin only)
     * @param _playerAddress The player's address
     * @param _amount The amount of XP to add
     */
    function addXP(address _playerAddress, uint256 _amount) external onlyAdmin {
        playerProxy.addXP(_playerAddress, _amount);
    }

    /**
     * @notice Get a player's experience points
     * @param _playerAddress The player's address
     * @return The player's XP
     */
    function getXP(address _playerAddress) external view returns (uint256) {
        return playerProxy.getXP(_playerAddress);
    }

    /**
     * @notice Level up a player (admin only)
     * @param _playerAddress The player's address
     */
    function levelUp(address _playerAddress) external onlyAdmin {
        playerProxy.levelUp(_playerAddress);
    }

    /**
     * @notice Get a player's level
     * @param _playerAddress The player's address
     * @return The player's level
     */
    function getLevel(address _playerAddress) external view returns (uint16) {
        return playerProxy.getLevel(_playerAddress);
    }
}
