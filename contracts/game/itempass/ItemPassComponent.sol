// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/ItemPass.sol";

contract ItemPassComponent {
    /// @notice Address of the World contract
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic
    address public implementation;

    /// @notice Mapping save information ItemPass of every players
    mapping(address => ItemPassStruct) public listPassActive;

    /// @notice Event when pass is updated
    event PassUpdated(address indexed player, uint64 beginTime, uint64 endTime);

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[ItemPassComponent] Unauthorized"
        );
        _;
    }

    /**
     * @notice update information pass for player
     * @dev Just called by Logic contract
     */
    function setPass(
        address _player,
        uint64 _beginTime,
        uint64 _endTime
    ) external onlyAuthorized {
        listPassActive[_player] = ItemPassStruct({
            beginTime: _beginTime,
            endTime: _endTime
        });
        
        emit PassUpdated(_player, _beginTime, _endTime);
    }

    /**
     * @notice Get information Pass
     * @dev Logic can this function to get information about pass of player
     */
    function getPass(address _player) external view returns (ItemPassStruct memory) {
        return listPassActive[_player];
    }
}