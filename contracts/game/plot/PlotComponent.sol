// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Plot.sol";

contract PlotComponent {
    address public world;
    address public admin;
    address public implementation;

    mapping(uint256 => Plot) public plots;
    mapping(address => uint256[]) public ownerPlots;
    mapping(uint256 => address) public plotOwners;

    event PlotCreated(
        uint256 plotId,
        address plotOwner,
        int256 xCoordinate,
        int256 yCoordinate,
        uint256 plotType
    );
    event PlotDeleted(uint256 plotId);

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    function createPlot(
        int32 _xCoordinate,
        int32 _yCoordinate,
        uint8 _plotType,
        address _plotOwner
    ) external onlyAuthorized returns (uint256) {
        uint256 plotId = uint256(
            keccak256(abi.encodePacked(_plotOwner, _xCoordinate, _yCoordinate))
        );
        require(
            plotOwners[plotId] == address(0),
            "[COMPONENT] Plot exist"
        );
        require(
            _xCoordinate >= -2147483648,
            "[COMPONENT] Invalid xCoordinate"
        );
        require(
            _yCoordinate >= -2147483648,
            "[COMPONENT] Invalid yCoordinate"
        );

        Plot memory newPlot = Plot({
            id: plotId,
            owner: _plotOwner,
            plotType: _plotType,
            fertility: 100,
            isActive: true,
            xCoordinate: _xCoordinate,
            yCoordinate: _yCoordinate,
            creationTime: uint64(block.timestamp),
            isLocked: false
        });

        plots[plotId] = newPlot;
        ownerPlots[_plotOwner].push(plotId);
        plotOwners[plotId] = _plotOwner;

        emit PlotCreated(
            plotId,
            _plotOwner,
            _xCoordinate,
            _yCoordinate,
            _plotType
        );

        return plotId;
    }

    function deletePlot(
        uint256 plotId,
        address _playerAddress
    ) external onlyAuthorized {
        require(
            plotOwners[plotId] != address(0),
            "[COMPONENT] Plot does not exist"
        );
        require(
            plotOwners[plotId] == _playerAddress,
            "[COMPONENT] Not plot owner"
        );

        address owner = plotOwners[plotId];

        uint256[] storage ownerPlotList = ownerPlots[owner];
        for (uint256 i = 0; i < ownerPlotList.length; i++) {
            if (ownerPlotList[i] == plotId) {
                ownerPlotList[i] = ownerPlotList[ownerPlotList.length - 1];
                ownerPlotList.pop();
                break;
            }
        }

        delete plots[plotId];
        delete plotOwners[plotId];

        emit PlotDeleted(plotId);
    }

    function getPlotOwner(
        uint256 plotId
    ) external view onlyAuthorized returns (address) {
        return plotOwners[plotId];
    }

    function getPlots(
        address _plotOwner
    ) external view returns (Plot[] memory) {
        uint256[] memory plotIds = ownerPlots[_plotOwner];
        Plot[] memory plotsData = new Plot[](plotIds.length);
        for (uint256 i = 0; i < plotIds.length; i++) {
            plotsData[i] = plots[plotIds[i]];
        }
        return plotsData;
    }

    function getPlot(
        uint256 _plotId
    ) external view onlyAuthorized returns (Plot memory) {
        return plots[_plotId];
    }
}
