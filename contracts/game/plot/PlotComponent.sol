// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Plot.sol";

/**
 * @title PlotComponent
 * @author RYG.Labs
 * @notice Data storage contract for the Plot system
 * @dev Stores all plot information and ownership data
 */
contract PlotComponent {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from plot ID to Plot struct
    mapping(uint256 => Plot) public plots;
    /// @notice Mapping from owner address to their plot IDs
    mapping(address => uint256[]) public ownerPlots;
    /// @notice Mapping from plot ID to owner address
    mapping(uint256 => address) public plotOwners;

    event PlotCreated(
        uint256 plotId,
        address plotOwner,
        int256 xCoordinate,
        int256 yCoordinate,
        uint256 plotType
    );
    event PlotDeleted(uint256 plotId);

    /// @notice Restricts access to authorized logic contracts only
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    /**
     * @notice Create a new plot
     * @param _xCoordinate The X coordinate of the plot
     * @param _yCoordinate The Y coordinate of the plot
     * @param _plotType The type of plot
     * @param _plotOwner The owner of the plot
     * @return The ID of the newly created plot
     */
    function createPlot(
        int256 _xCoordinate,
        int256 _yCoordinate,
        uint256 _plotType,
        address _plotOwner
    ) external onlyAuthorized returns (uint256) {
        uint256 plotId = uint256(
            keccak256(abi.encodePacked(_plotOwner, _xCoordinate, _yCoordinate))
        );
        require(plotOwners[plotId] == address(0), "[COMPONENT] Plot exist");
        require(
            _xCoordinate >= -1000000000000000000,
            "[COMPONENT] Invalid xCoordinate"
        );
        require(
            _yCoordinate >= -1000000000000000000,
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
            creationTime: block.timestamp,
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

    /**
     * @notice Delete a plot
     * @param plotId The ID of the plot to delete
     * @param _playerAddress The player's address (must be plot owner)
     */
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

    /**
     * @notice Get the owner of a plot
     * @param plotId The ID of the plot
     * @return The address of the plot owner
     */
    function getPlotOwner(
        uint256 plotId
    ) external view onlyAuthorized returns (address) {
        return plotOwners[plotId];
    }

    /**
     * @notice Get all plots owned by a player
     * @param _plotOwner The owner's address
     * @return Array of Plot structs owned by the player
     */
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

    /**
     * @notice Get a specific plot by ID
     * @param _plotId The ID of the plot
     * @return The Plot struct
     */
    function getPlot(
        uint256 _plotId
    ) external view onlyAuthorized returns (Plot memory) {
        return plots[_plotId];
    }
}
