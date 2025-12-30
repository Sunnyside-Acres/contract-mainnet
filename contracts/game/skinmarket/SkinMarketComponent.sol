//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
contract SkinMarketComponent {
    address public world;
    address public implementation;

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[NoelComponent] Unauthorized"
        );
        _;
    }
}
