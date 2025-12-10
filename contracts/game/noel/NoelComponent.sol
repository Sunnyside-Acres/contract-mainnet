// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";

contract NoelComponent {
    address public world;
    address public implementation;

    mapping(address => uint256) public gifts;

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[NoelComponent] Unauthorized"
        );
        _;
    }

    function addGift(address to, uint256 amount) external onlyAuthorized {
        gifts[to] += amount;
    }

    function getGifts(address to) external view returns (uint256) {
        return gifts[to];
    }
}
