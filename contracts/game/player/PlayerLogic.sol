// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";

contract PlayerLogic {
    IWorld public world;
    IPlayerComponent public playerProxy;

    event PlayerCreated(address indexed playerAddress);
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
        require(bytes(_name).length <= 32, "[LOGIC]Name too long");

        playerProxy.createPlayer(msg.sender, _name);
        emit PlayerCreated(msg.sender);
    }

    function getPlayerList() external view returns (address[] memory) {
        return playerProxy.getPlayerAddresses();
    }

    function getPlayerData(address _playerAddress) external view returns (Player memory) {
        return playerProxy.getPlayer(_playerAddress);
    }
}
