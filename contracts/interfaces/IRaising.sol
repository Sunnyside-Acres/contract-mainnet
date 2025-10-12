// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Raising.sol";
import "../struct/Weather.sol";

/**
 * @title IRaisingComponent
 * @notice Interface for managing animal raising system
 */
interface IRaisingComponent {
    /**
     * @notice Starts raising an animal
     * @param _itemId ID of the animal item
     * @param _raisingOwner Address of the owner
     * @param _growthTime Time required for animal to grow
     * @param _weatherState Current weather state
     * @return uint256 ID of the created raising
     */
    function startRaising(
        uint256 _itemId,
        address _raisingOwner,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external returns (uint256);

    /**
     * @notice Feeds a raised animal
     * @param _raisingId ID of the raising
     * @param _harvestCooldown Cooldown period for harvest
     */
    function feedRaising(uint256 _raisingId, uint256 _harvestCooldown) external;

    /**
     * @notice Harvests resources from a raised animal with cooldown
     * @param _raisingId ID of the raising
     * @param _harvestCooldown Cooldown period for next harvest
     * @return uint256 Amount harvested
     */
    function harvestRaisingWithCooldown(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external returns (uint256);

    /**
     * @notice Updates total harvested items count
     * @param _raisingId ID of the raising
     * @param _additionalItems Number of additional items harvested
     */
    function updateTotalHarvestedItems(
        uint256 _raisingId,
        uint256 _additionalItems
    ) external;

    /**
     * @notice Gets the next feeding time for an animal
     * @param _raisingId ID of the raising
     * @param _harvestCooldown Cooldown period for harvest
     * @return uint256 Timestamp of next feeding time
     */
    function getNextFeedingTime(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external view returns (uint256);

    /**
     * @notice Checks if an animal can be fed
     * @param _raisingId ID of the raising
     * @param _harvestCooldown Cooldown period for harvest
     * @return bool True if animal can be fed
     */
    function canFeed(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external view returns (bool);

    /**
     * @notice Slaughters an animal for final harvest
     * @param _raisingId ID of the raising to slaughter
     * @return uint256 Amount obtained from slaughter
     */
    function slaughterRaising(uint256 _raisingId) external returns (uint256);

    /**
     * @notice Gets details of a specific raising
     * @param raisingId ID of the raising
     * @return Raising struct containing raising details
     */
    function getRaising(
        uint256 raisingId
    ) external view returns (Raising memory);

    /**
     * @notice Gets all raisings owned by an address with details
     * @param owner Address of the owner
     * @return Array of Raising structs
     */
    function getOwnerRaisingsWithDetails(
        address owner
    ) external view returns (Raising[] memory);

    /**
     * @notice Gets the owner of a raising
     * @param raisingId ID of the raising
     * @return address Owner address
     */
    function getRaisingOwner(uint256 raisingId) external view returns (address);

    /**
     * @notice Gets all raising IDs owned by an address
     * @param owner Address of the owner
     * @return Array of raising IDs
     */
    function getOwnerRaisings(
        address owner
    ) external view returns (uint256[] memory);
}
