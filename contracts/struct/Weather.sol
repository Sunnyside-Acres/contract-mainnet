// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title WeatherStructs
 * @notice Library containing weather-related data structures
 */
library WeatherStructs {
    /**
     * @notice Enum defining weather states
     */
    enum WeatherState {
        Sunny, /// Sunny weather
        Rainy, /// Rainy weather
        Stormy, /// Stormy weather
        Cloudy /// Cloudy weather
    }

    /**
     * @notice Struct representing weather information
     */
    struct Weather {
        WeatherState state; /// Current weather state
        uint256 startTime; /// Start timestamp
        uint256 duration; /// Duration in seconds
    }
}
