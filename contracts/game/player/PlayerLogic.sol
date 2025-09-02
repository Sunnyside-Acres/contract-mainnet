// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";

contract PlayerLogic {
    IWorld public world;
    IPlayerComponent public playerProxy;

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

    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    modifier onlyInternal() {
        require(
            world.isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    constructor(address _world, address _playerProxy) {
        world = IWorld(_world);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    function createPlayer(string memory _name) external {
        // Validate name
        require(bytes(_name).length > 0, "[LOGIC] Name cannot be empty");
        require(bytes(_name).length <= 32, "[LOGIC] Name too long");

        Player memory player = playerProxy.createPlayer(msg.sender, _name);
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

    function addSunny(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.addSunny(_playerAddress, _amount);
    }

    function subtractSunny(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.subtractSunny(_playerAddress, _amount);
    }

    function addSunlight(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.addSunlight(_playerAddress, _amount);
    }

    function subtractSunlight(
        address _playerAddress,
        uint256 _amount
    ) external onlyAdmin {
        playerProxy.subtractSunlight(_playerAddress, _amount);
    }

    function getPlayerList() external view returns (address[] memory) {
        return playerProxy.getPlayerAddresses();
    }

    function getPlayerData(
        address _playerAddress
    ) external view returns (Player memory) {
        return playerProxy.getPlayer(_playerAddress);
    }

    // Experience functions
    function addXP(address _playerAddress, uint256 _amount) external onlyAdmin {
        playerProxy.addXP(_playerAddress, _amount);
    }

    function getXP(address _playerAddress) external view returns (uint256) {
        return playerProxy.getXP(_playerAddress);
    }

    function levelUp(address _playerAddress) external onlyAdmin {
        playerProxy.levelUp(_playerAddress);
    }

    function getLevel(address _playerAddress) external view returns (uint16) {
        return playerProxy.getLevel(_playerAddress);
    }
}
