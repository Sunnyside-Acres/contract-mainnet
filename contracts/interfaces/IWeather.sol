// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Weather.sol";

interface IWeatherComponent {
    function updateWeather() external returns (bool);

    function getCurrentWeather()
        external
        view
        returns (WeatherStructs.Weather memory);

    function getCurrentWeatherState() external  view returns (WeatherStructs.WeatherState);
}
