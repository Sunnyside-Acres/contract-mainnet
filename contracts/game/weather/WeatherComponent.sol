// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Weather.sol";

/**
 * @title WeatherComponent
 * @author RYG.Labs
 * @notice Data storage contract for the Weather system
 * @dev Stores current weather state and handles weather updates
 */
contract WeatherComponent {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Current weather information
    WeatherStructs.Weather public currentWeather;

    /// @notice Minimum duration for weather (15 minutes in seconds)
    uint256 public constant MIN_DURATION = 15 * 60;
    /// @notice Maximum duration for weather (1 hour in seconds)
    uint256 public constant MAX_DURATION = 60 * 60;
    /// @notice Duration of 1 hour in seconds
    uint256 public constant HOUR_DURATION = 60 * 60;
    /// @notice Duration of 1.5 hours in seconds
    uint256 public constant HOUR_AND_HALF_DURATION = 90 * 60;

    /// @notice Restricts access to authorized logic contracts only
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    /// @notice Restricts access to admin only
    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /// @notice Emitted when weather is updated
    event WeatherUpdated(
        WeatherStructs.WeatherState newState,
        uint256 startTime,
        uint256 duration
    );

    /// @notice Emitted when weather is first initialized
    event WeatherInitialized(
        WeatherStructs.WeatherState initialState,
        uint256 startTime,
        uint256 duration
    );

    /// @notice Nonce for generating random numbers
    uint256 private nonce = 0;

    /**
     * @dev Generate a random number
     * @param max The maximum value (exclusive)
     * @return A random number from 0 to max-1
     */
    function random(uint256 max) private returns (uint256) {
        nonce++;
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.number,
                        nonce,
                        msg.sender
                    )
                )
            ) % max;
    }

    /**
     * @notice Update the weather to a new random state
     * @dev Only updates if current weather duration has expired
     * @return True if weather was updated, false otherwise
     */
    function updateWeather() public onlyAuthorized returns (bool) {
        if (
            block.timestamp >=
            currentWeather.startTime + currentWeather.duration
        ) {
            uint256 randomState = random(4); // 4 weather states (0-3)
            WeatherStructs.WeatherState newState = WeatherStructs.WeatherState(
                randomState
            );

            uint256 newDuration = MIN_DURATION +
                (random(MAX_DURATION - MIN_DURATION + 1));

            // Update to new weather
            currentWeather = WeatherStructs.Weather({
                state: newState,
                startTime: block.timestamp,
                duration: newDuration
            });

            emit WeatherUpdated(newState, block.timestamp, newDuration);
            return true;
        }
        return false;
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
        return currentWeather;
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
        return currentWeather.state;
    }

    /**
     * @notice Check if weather should be updated
     * @return True if current weather duration has expired
     */
    function shouldUpdateWeather() external view returns (bool) {
        return
            block.timestamp >=
            currentWeather.startTime + currentWeather.duration;
    }
}
