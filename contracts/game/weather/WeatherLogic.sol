// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IWeather.sol";
import "../../struct/Weather.sol";

/**
 * @title WeatherLogic
 * @author RYG.Labs
 * @notice Logic contract for the Weather system
 * @dev Handles weather updates and queries
 */
contract WeatherLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice Weather component contract
    IWeatherComponent public weatherProxy;

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
     * @notice Constructor to initialize the weather logic contract
     * @param _world The address of the World contract
     * @param _weatherProxy The address of the Weather component
     */
    constructor(address _world, address _weatherProxy) {
        world = IWorld(_world);
        weatherProxy = IWeatherComponent(_weatherProxy);
    }

    /**
     * @notice Update the weather to a new state
     * @return True if weather was updated successfully
     */
    function updateWeather() external returns (bool) {
        return weatherProxy.updateWeather();
    }

    /**
     * @notice Get the current weather information
     * @return The current Weather struct
     */
    function getCurrentWeather()
        external
        view
        returns (WeatherStructs.Weather memory)
    {
        return weatherProxy.getCurrentWeather();
    }

    /**
     * @notice Get the current weather state only
     * @return The current WeatherState enum value
     */
    function getCurrentWeatherState()
        external
        view
        returns (WeatherStructs.WeatherState)
    {
        return weatherProxy.getCurrentWeatherState();
    }

    /**
     * @notice Check if weather should be updated
     * @return True if weather duration has expired
     */
    function shouldUpdateWeather() external view returns (bool) {
        return weatherProxy.shouldUpdateWeather();
    }
}
