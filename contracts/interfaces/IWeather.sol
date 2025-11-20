// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Weather.sol";

/**
 * @title IWeatherComponent
 * @notice Interface for managing in-game weather system
 */
interface IWeatherComponent {
    /**
     * @notice Updates the current weather state
     * @return bool True if weather was updated successfully
     */
    function updateWeather() external returns (bool);

    /**
     * @notice Gets the current weather information
     * @return Weather struct containing full weather details
     */
    function getCurrentWeather()
        external
        view
        returns (WeatherStructs.Weather memory);

    /**
     * @notice Gets the current weather state enum
     * @return WeatherState enum value
     */
    function getCurrentWeatherState()
        external
        view
        returns (WeatherStructs.WeatherState);

    /**
     * @notice Initializes the weather system
     */
    function initializeWeather() external;

    /**
     * @notice Checks if weather should be updated
     * @return bool True if weather update is needed
     */
    function shouldUpdateWeather() external view returns (bool);
}
