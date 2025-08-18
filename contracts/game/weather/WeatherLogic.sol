// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IWeather.sol";
import "../../struct/Weather.sol";

contract WeatherLogic {
    IWorld public world;
    IWeatherComponent public weatherProxy;

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

    constructor(address _world, address _weatherProxy) {
        world = IWorld(_world);
        weatherProxy = IWeatherComponent(_weatherProxy);
    }

    function updateWeather() external returns (bool) {
        return weatherProxy.updateWeather();
    }

    function getCurrentWeather()
        external
        view
        returns (WeatherStructs.Weather memory)
    {
        return weatherProxy.getCurrentWeather();
    }

    function getCurrentWeatherState() external view returns (WeatherStructs.WeatherState) {
        return weatherProxy.getCurrentWeatherState();
    }
}
