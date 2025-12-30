//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ISkinMarket.sol";

contract SkinMarketLogic {
    IWorld public world;
    ISkinMarket public skinMarketProxy;

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }
    
    constructor(address _world, address _skinMarketProxy) {
        world = IWorld(_world);
        skinMarketProxy = ISkinMarket(_skinMarketProxy);
    }
}
