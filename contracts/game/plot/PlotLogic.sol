// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../struct/Player.sol";
import "../../interfaces/IWorld.sol";
import "../../interfaces/IPlayer.sol";
import "../../interfaces/IPlot.sol";
import "../../interfaces/IWeather.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/Weather.sol";

contract PlotLogic {
    IWorld public world;
    IPlotComponent public plotProxy;
    IWeatherComponent public weatherProxy;
    IPlayerComponent public playerProxy;

    event PlayerCreated(address indexed playerAddress);
    event LastLoginUpdated(address indexed playerAddress);
    event PlotCreated(
        address indexed playerAddress,
        int256 xCoordinate,
        int256 yCoordinate,
        uint256 plotType
    );

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

    function createPlot(
        int256 _xCoordinate,
        int256 _yCoordinate
    ) external returns (uint256) {
        playerProxy.getPlayer(msg.sender);

        WeatherStructs.Weather memory currentWeather = weatherProxy
            .getCurrentWeather();

        // Phương pháp 1: Deterministic randomness từ tọa độ và address
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.number,
                    msg.sender,
                    _xCoordinate,
                    _yCoordinate,
                    block.chainid // Thêm chain ID để tránh replay cross-chain
                )
            )
        ) % 100;

        uint256 plotType;

        if (currentWeather.state == WeatherStructs.WeatherState.Cloudy) {
            // Cloudy: 80% Thường, 15% Phì nhiêu, 5% Ma thuật
            if (random < 80) {
                plotType = 0; // Thường
            } else if (random < 95) {
                plotType = 1; // Phì nhiêu
            } else {
                plotType = 2; // Ma thuật
            }
        } else if (currentWeather.state == WeatherStructs.WeatherState.Rainy) {
            // Rainy: 40% Thường, 50% Phì nhiêu, 10% Ma thuật
            if (random < 40) {
                plotType = 0; // Thường
            } else if (random < 90) {
                plotType = 1; // Phì nhiêu
            } else {
                plotType = 2; // Ma thuật
            }
        } else if (currentWeather.state == WeatherStructs.WeatherState.Stormy) {
            // Stormy: 50% Thường, 40% Phì nhiêu, 10% Ma thuật
            if (random < 50) {
                plotType = 0; // Thường
            } else if (random < 90) {
                plotType = 1; // Phì nhiêu
            } else {
                plotType = 2; // Ma thuật
            }
        } else {
            // Sunny: 80% Thường, 16% Phì nhiêu, 4% Ma thuật
            if (random < 80) {
                plotType = 0; // Thường
            } else if (random < 96) {
                plotType = 1; // Phì nhiêu
            } else {
                plotType = 2; // Ma thuật
            }
        }

        plotProxy.createPlot(_xCoordinate, _yCoordinate, plotType, msg.sender);

        emit PlotCreated(msg.sender, _xCoordinate, _yCoordinate, plotType);
    }

    function deletePlot(uint256 _plotId) external onlyInternal {
        plotProxy.deletePlot(_plotId, msg.sender);
    }

    function getPlotOwner(uint256 _plotId) external view returns (address) {
        return plotProxy.getPlotOwner(_plotId);
    }

    function getPlots(
        address _playerAddress
    ) external view returns (Plot[] memory) {
        return plotProxy.getPlots(_playerAddress);
    }
}
