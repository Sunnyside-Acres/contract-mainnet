// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IPlot.sol";
import "../../interfaces/IWeather.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/Weather.sol";

/**
 * @title PlotLogic
 * @author RYG.Labs
 * @notice Logic contract for the Plot system
 * @dev Handles plot creation with weather-based plot type probabilities
 */
contract PlotLogic {
    /// @notice World contract for access control
    IWorld public world;
    /// @notice Plot component contract
    IPlotComponent public plotProxy;
    /// @notice Weather component contract
    IWeatherComponent public weatherProxy;
    /// @notice Player component contract
    IPlayerComponent public playerProxy;

    event PlayerCreated(address indexed playerAddress);
    event LastLoginUpdated(address indexed playerAddress);
    event PlotCreated(
        uint256 indexed plotId,
        address indexed playerAddress,
        int256 xCoordinate,
        int256 yCoordinate,
        uint256 plotType
    );

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
     * @notice Constructor to initialize the plot logic contract
     * @param _world The address of the World contract
     * @param _plotProxy The address of the Plot component
     * @param _weatherProxy The address of the Weather component
     * @param _playerProxy The address of the Player component
     */
    constructor(
        address _world,
        address _plotProxy,
        address _weatherProxy,
        address _playerProxy
    ) {
        world = IWorld(_world);
        plotProxy = IPlotComponent(_plotProxy);
        weatherProxy = IWeatherComponent(_weatherProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    function createPlot(int256 _xCoordinate, int256 _yCoordinate) external {
        WeatherStructs.Weather memory currentWeather = weatherProxy
            .getCurrentWeather();

        // Deterministic plot type based on coordinates and weather state
        // Same coordinates + same weather = same plot type (no randomness)
        uint256 coordinateHash = uint256(
            keccak256(
                abi.encodePacked(
                    block.number,
                    _xCoordinate,
                    _yCoordinate,
                    uint8(currentWeather.state),
                    block.chainid // Add chain ID to prevent cross-chain replay
                )
            )
        ) % 100;

        uint256 plotType;

        if (currentWeather.state == WeatherStructs.WeatherState.Cloudy) {
            // Cloudy: 80% Normal, 15% Fertile, 5% Magic
            if (coordinateHash < 80) {
                plotType = 0; // Normal
            } else if (coordinateHash < 95) {
                plotType = 1; // Fertile
            } else {
                plotType = 2; // Magic
            }
        } else if (currentWeather.state == WeatherStructs.WeatherState.Rainy) {
            // Rainy: 40% Normal, 50% Fertile, 10% Magic
            if (coordinateHash < 40) {
                plotType = 0; // Normal
            } else if (coordinateHash < 90) {
                plotType = 1; // Fertile
            } else {
                plotType = 2; // Magic
            }
        } else if (currentWeather.state == WeatherStructs.WeatherState.Stormy) {
            // Stormy: 50% Normal, 40% Fertile, 10% Magic
            if (coordinateHash < 50) {
                plotType = 0; // Normal
            } else if (coordinateHash < 90) {
                plotType = 1; // Fertile
            } else {
                plotType = 2; // Magic
            }
        } else {
            // Sunny: 80% Normal, 16% Fertile, 4% Magic
            if (coordinateHash < 80) {
                plotType = 0; // Normal
            } else if (coordinateHash < 96) {
                plotType = 1; // Fertile
            } else {
                plotType = 2; // Magic
            }
        }

        uint256 plotId = plotProxy.createPlot(
            int32(_xCoordinate),
            int32(_yCoordinate),
            uint8(plotType),
            msg.sender
        );

        emit PlotCreated(
            plotId,
            msg.sender,
            _xCoordinate,
            _yCoordinate,
            plotType
        );
    }

    /**
     * @notice Delete a plot (internal logic only)
     * @param _plotId The ID of the plot to delete
     */
    function deletePlot(uint256 _plotId) external onlyInternal {
        plotProxy.deletePlot(_plotId, msg.sender);
    }

    /**
     * @notice Get the owner of a plot
     * @param _plotId The ID of the plot
     * @return The address of the plot owner
     */
    function getPlotOwner(uint256 _plotId) external view returns (address) {
        return plotProxy.getPlotOwner(_plotId);
    }

    /**
     * @notice Get all plots owned by a player
     * @param _playerAddress The player's address
     * @return Array of Plot structs
     */
    function getPlots(
        address _playerAddress
    ) external view returns (Plot[] memory) {
        return plotProxy.getPlots(_playerAddress);
    }
}
