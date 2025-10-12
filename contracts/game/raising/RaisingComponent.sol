// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Raising.sol";
import "../../struct/Weather.sol";

/**
 * @title RaisingComponent
 * @dev Component contract for Animal Raising system - manages livestock raising data
 * @notice This contract stores and manages all raising-related data and state
 *
 * Key Features:
 * - Tracks raising lifecycle (start, feed, harvest, slaughter)
 * - Weather-based growth time and quality adjustments
 * - Multi-harvest system with cooldowns
 * - Feeding mechanics with quality modifiers
 */
contract RaisingComponent {
    /// @notice Address of the World contract for access control
    address public world;
    /// @notice Address of the admin
    address public admin;
    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping to store raising information by raising ID
    mapping(uint256 => Raising) public raisings;

    /// @notice Mapping from owner address to their raising IDs
    mapping(address => uint256[]) public ownerRaisings;

    /// @notice Mapping from raising ID to owner address
    mapping(uint256 => address) public raisingOwners;

    /// @notice Emitted when a new raising process is started
    event RaisingStarted(
        uint256 indexed raisingId,
        address indexed raisingOwner,
        uint256 itemId
    );

    /// @notice Emitted when an animal is fed
    event RaisingFed(uint256 indexed raisingId, uint256 qualityModifier);

    /// @notice Emitted when an animal is slaughtered
    event RaisingSlaughtered(uint256 indexed raisingId);

    /// @notice Emitted when an animal is harvested (non-destructive)
    event RaisingHarvestedWithCooldown(
        uint256 indexed raisingId,
        uint256 harvestCount
    );

    /// @notice Emitted when total harvested items count is updated
    event TotalHarvestedItemsUpdated(
        uint256 indexed raisingId,
        uint256 totalHarvestedItems
    );

    /// @notice Emitted when feeding counter is reset after harvest
    event FeedingReset(uint256 indexed raisingId, uint256 harvestCount);

    /**
     * @dev Modifier to restrict access to authorized logic contracts only
     * @notice Reverts if caller is not a registered logic contract
     */
    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    /**
     * @dev Starts a new raising process for a livestock item
     * @notice Creates a new raising with weather-adjusted growth time and quality
     *
     * Requirements:
     * - Caller must be authorized logic contract
     * - Raising ID must not already exist
     * - Growth time must be greater than 0
     *
     * Weather Modifiers:
     * - Sunny: -5% time, +5 quality
     * - Cloudy: -10% time, +10 quality
     * - Rainy: -15% time, +15 quality
     * - Stormy: -20% time, +20 quality
     *
     * @param _itemId ID of the livestock item to raise
     * @param _raisingOwner Address of the player starting the raising
     * @param _growthTime Base growth time in seconds
     * @param _weatherState Current weather state for modifiers
     * @return raisingId The unique ID of the newly created raising
     */
    function startRaising(
        uint256 _itemId,
        address _raisingOwner,
        uint256 _growthTime,
        WeatherStructs.WeatherState _weatherState
    ) external onlyAuthorized returns (uint256) {
        uint256 raisingId = uint256(
            keccak256(abi.encodePacked(_raisingOwner, _itemId, block.timestamp))
        );

        require(
            raisings[raisingId].id == 0,
            "[COMPONENT] Raising already exists"
        );
        require(_growthTime > 0, "[COMPONENT] Invalid growth time");

        uint256 adjustedGrowthTime = _growthTime;
        uint256 adjustedQuality = 100;

        // Apply weather-based adjustments to growth time and quality
        if (_weatherState == WeatherStructs.WeatherState.Cloudy) {
            adjustedGrowthTime = (adjustedGrowthTime * 90) / 100; // -10%
            adjustedQuality += 10;
        } else if (_weatherState == WeatherStructs.WeatherState.Rainy) {
            adjustedGrowthTime = (adjustedGrowthTime * 85) / 100; // -15%
            adjustedQuality += 15;
        } else if (_weatherState == WeatherStructs.WeatherState.Stormy) {
            adjustedGrowthTime = (adjustedGrowthTime * 80) / 100; // -20%
            adjustedQuality += 20;
        } else {
            adjustedGrowthTime = (adjustedGrowthTime * 95) / 100; // -5%
            adjustedQuality += 5;
        }

        raisings[raisingId] = Raising(
            raisingId,
            _itemId,
            block.timestamp,
            adjustedQuality,
            adjustedGrowthTime,
            block.timestamp,
            0,
            false,
            0, // lastHarvestTime
            0, // harvestCount
            false, // isSlaughtered
            0 // totalHarvestedItems
        );

        ownerRaisings[_raisingOwner].push(raisingId);
        raisingOwners[raisingId] = _raisingOwner;

        emit RaisingStarted(raisingId, _raisingOwner, _itemId);

        return raisingId;
    }

    /**
     * @dev Feeds an animal to improve its quality
     * @notice Increases quality modifier by 10% per feeding, up to 3 times
     *
     * Requirements:
     * - Caller must be authorized logic contract
     * - Raising must not be harvested
     * - Feed count must not exceed 3
     * - Feeding cooldown must have passed
     *
     * Feeding Cooldown Logic:
     * - Before first harvest: growthTime / 4
     * - After first harvest: harvestCooldown / 4
     *
     * Effects:
     * - Increases quality modifier by 10%
     * - Increments feed count
     * - Updates last feed time
     *
     * @param _raisingId ID of the raising to feed
     * @param _harvestCooldown Harvest cooldown duration for timing calculations
     */
    function feedRaising(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external onlyAuthorized {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");

        require(raising.feedCount <= 3, "[COMPONENT] Too many feeds");

        // Feeding cooldown logic:
        // - Before first harvest: use growthTime/4
        // - After first harvest: use harvestCooldown/4
        if (raising.harvestCount == 0) {
            // Not harvested yet, use growthTime/4
            require(
                block.timestamp >=
                    raising.lastFeedTime + (raising.growthTime / 4),
                "Too early to feed"
            );
        } else {
            // Already harvested at least once, use harvestCooldown/4
            require(
                block.timestamp >=
                    raising.lastFeedTime + (_harvestCooldown / 4),
                "Too early to feed"
            );
        }

        // Increase quality modifier by 10% per feeding
        if (raising.feedCount > 0) {
            raising.qualityModifier = (raising.qualityModifier * 110) / 100;
        }

        // Update feeding time and count
        raising.lastFeedTime = block.timestamp;
        raising.feedCount++;

        emit RaisingFed(_raisingId, raising.qualityModifier);
    }

    /**
     * @dev Harvests resources from an animal without killing it
     * @notice Allows up to 3 harvests with cooldown between each
     *
     * Requirements:
     * - Caller must be authorized logic contract
     * - Raising must not be fully harvested
     * - Raising must not be slaughtered
     * - Animal must be fully grown
     * - Harvest count must be less than 3
     * - Harvest cooldown must have passed (for subsequent harvests)
     *
     * Effects:
     * - Increments harvest count
     * - Updates last harvest time
     * - Resets feeding counter and time for next cycle
     *
     * @param _raisingId ID of the raising to harvest
     * @param _harvestCooldown Cooldown duration between harvests
     * @return qualityModifier Current quality modifier for calculating yields
     */
    function harvestRaisingWithCooldown(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external onlyAuthorized returns (uint256) {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );
        require(
            raising.raisingTime + raising.growthTime <= block.timestamp,
            "Raising not fully grown"
        );
        require(
            raising.harvestCount < 3,
            "[COMPONENT] Max harvest count reached"
        );

        // Check harvest cooldown
        if (raising.harvestCount > 0) {
            require(
                block.timestamp >= raising.lastHarvestTime + _harvestCooldown,
                "[COMPONENT] Harvest cooldown not finished"
            );
        }

        uint256 qualityModifier = raising.qualityModifier;

        raising.lastHarvestTime = block.timestamp;
        raising.harvestCount++;

        // Reset feeding after harvest to allow feeding again
        // lastFeedTime is reset to harvest time (like starting a new raising cycle)
        raising.feedCount = 0;
        raising.lastFeedTime = block.timestamp;

        emit RaisingHarvestedWithCooldown(_raisingId, raising.harvestCount);
        emit FeedingReset(_raisingId, raising.harvestCount);
        return qualityModifier;
    }

    /**
     * @dev Updates the total count of harvested items
     * @notice Tracks cumulative items harvested from an animal
     * @param _raisingId ID of the raising
     * @param _additionalItems Number of items to add to the total
     */
    function updateTotalHarvestedItems(
        uint256 _raisingId,
        uint256 _additionalItems
    ) external onlyAuthorized {
        Raising storage raising = raisings[_raisingId];
        require(raising.id != 0, "[COMPONENT] Raising not found");

        raising.totalHarvestedItems += _additionalItems;

        emit TotalHarvestedItemsUpdated(
            _raisingId,
            raising.totalHarvestedItems
        );
    }

    /**
     * @dev Gets the next available feeding time
     * @notice Returns current time if feeding is available now
     * @param _raisingId ID of the raising
     * @param _harvestCooldown Harvest cooldown for timing calculations
     * @return nextFeedTime Timestamp when next feeding is available
     */
    function getNextFeedingTime(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external view onlyAuthorized returns (uint256) {
        Raising storage raising = raisings[_raisingId];
        require(raising.id != 0, "[COMPONENT] Raising not found");
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );

        // If never fed, can feed immediately
        if (raising.feedCount == 0) {
            return block.timestamp;
        }

        // Next feeding time logic:
        // - Before first harvest: use growthTime/4
        // - After first harvest: use harvestCooldown/4
        uint256 nextFeedingTime;
        if (raising.harvestCount == 0) {
            // Not harvested yet, use growthTime/4
            nextFeedingTime = raising.lastFeedTime + (raising.growthTime / 4);
        } else {
            // Already harvested at least once, use harvestCooldown/4
            nextFeedingTime = raising.lastFeedTime + (_harvestCooldown / 4);
        }

        // If next feeding time has passed, return current time
        if (nextFeedingTime <= block.timestamp) {
            return block.timestamp;
        }

        return nextFeedingTime;
    }

    /**
     * @dev Checks if an animal can be fed now
     * @notice Verifies feed count limit and cooldown timing
     * @param _raisingId ID of the raising
     * @param _harvestCooldown Harvest cooldown for timing calculations
     * @return canFeedNow True if feeding is allowed now, false otherwise
     */
    function canFeed(
        uint256 _raisingId,
        uint256 _harvestCooldown
    ) external view onlyAuthorized returns (bool) {
        Raising storage raising = raisings[_raisingId];
        require(raising.id != 0, "[COMPONENT] Raising not found");
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );

        // Check feed count limit
        if (raising.feedCount >= 3) {
            return false;
        }

        // If never fed, can feed immediately
        if (raising.feedCount == 0) {
            return true;
        }

        // Feeding cooldown logic:
        // - Before first harvest: use growthTime/4
        // - After first harvest: use harvestCooldown/4
        if (raising.harvestCount == 0) {
            // Not harvested yet, use growthTime/4
            return
                block.timestamp >=
                raising.lastFeedTime + (raising.growthTime / 4);
        } else {
            // Already harvested at least once, use harvestCooldown/4
            return
                block.timestamp >=
                raising.lastFeedTime + (_harvestCooldown / 4);
        }
    }

    /**
     * @dev Slaughters an animal for meat drops
     * @notice Removes the animal and returns quality modifier for rewards
     *
     * Requirements:
     * - Caller must be authorized logic contract
     * - Raising must not be harvested
     * - Raising must not already be slaughtered
     * - Animal must be fully grown
     *
     * Effects:
     * - Marks raising as slaughtered
     * - Removes raising from owner's list
     * - Deletes raising data
     *
     * @param _raisingId ID of the raising to slaughter
     * @return qualityModifier Quality modifier for calculating meat drops
     */
    function slaughterRaising(
        uint256 _raisingId
    ) external onlyAuthorized returns (uint256) {
        Raising storage raising = raisings[_raisingId];
        require(!raising.isHarvested, "[COMPONENT] Raising already harvested");
        require(
            !raising.isSlaughtered,
            "[COMPONENT] Raising already slaughtered"
        );
        require(
            raising.raisingTime + raising.growthTime <= block.timestamp,
            "Raising not fully grown"
        );

        address owner = raisingOwners[_raisingId];
        uint256 qualityModifier = raising.qualityModifier;

        raising.isSlaughtered = true;
        removeRaisingFromOwnerList(owner, _raisingId);

        delete raisingOwners[_raisingId];
        delete raisings[_raisingId];

        emit RaisingSlaughtered(_raisingId);
        return qualityModifier;
    }

    /**
     * @dev Internal helper to remove a raising from owner's list
     * @notice Uses swap-and-pop pattern for gas efficiency
     * @param owner Address of the raising owner
     * @param raisingId ID of the raising to remove
     */
    function removeRaisingFromOwnerList(
        address owner,
        uint256 raisingId
    ) internal {
        uint256[] storage ownerRaisingList = ownerRaisings[owner];
        uint256 length = ownerRaisingList.length;

        for (uint256 i = 0; i < length; i++) {
            if (ownerRaisingList[i] == raisingId) {
                // Move last element to current position (if not already last)
                if (i < length - 1) {
                    ownerRaisingList[i] = ownerRaisingList[length - 1];
                }

                ownerRaisingList.pop();
                return;
            }
        }
    }

    /**
     * @dev Gets raising data by ID
     * @param raisingId ID of the raising
     * @return raising Raising struct with all data
     */
    function getRaising(
        uint256 raisingId
    ) external view onlyAuthorized returns (Raising memory) {
        return raisings[raisingId];
    }

    /**
     * @dev Gets all raising IDs owned by an address
     * @param owner Address of the owner
     * @return raisingIds Array of raising IDs
     */
    function getOwnerRaisings(
        address owner
    ) external view onlyAuthorized returns (uint256[] memory) {
        return ownerRaisings[owner];
    }

    /**
     * @dev Gets detailed information for all active raisings owned by an address
     * @notice Only returns raisings that are not harvested or slaughtered
     * @param owner Address of the owner
     * @return raisings Array of Raising structs with full details
     */
    function getOwnerRaisingsWithDetails(
        address owner
    ) external view onlyAuthorized returns (Raising[] memory) {
        require(owner != address(0), "Invalid owner address");

        uint256[] memory allRaisings = ownerRaisings[owner];
        uint256 count = 0;

        // Count valid raisings (exist in mapping and not harvested)
        for (uint256 i = 0; i < allRaisings.length; i++) {
            uint256 raisingId = allRaisings[i];
            if (
                raisingOwners[raisingId] == owner && // Verify ownership
                raisings[raisingId].id != 0 && // Verify raising exists
                !raisings[raisingId].isHarvested && // Verify not harvested
                !raisings[raisingId].isSlaughtered // Verify not slaughtered
            ) {
                count++;
            }
        }

        // Create result array with appropriate size
        Raising[] memory result = new Raising[](count);
        uint256 index = 0;

        // Get details for valid raisings
        for (uint256 i = 0; i < allRaisings.length; i++) {
            uint256 raisingId = allRaisings[i];
            if (
                raisingOwners[raisingId] == owner &&
                raisings[raisingId].id != 0 &&
                !raisings[raisingId].isHarvested &&
                !raisings[raisingId].isSlaughtered
            ) {
                Raising memory raising = raisings[raisingId];
                result[index] = raising;
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Gets the owner of a raising
     * @param raisingId ID of the raising
     * @return owner Address of the raising owner
     */
    function getRaisingOwner(
        uint256 raisingId
    ) external view onlyAuthorized returns (address) {
        return raisingOwners[raisingId];
    }

    /**
     * @dev Cleans up invalid entries from owner's raising list
     * @notice Removes raisings that no longer exist, are harvested, or are slaughtered
     * @param owner Address of the owner to clean up
     */
    function cleanupOwnerRaisings(address owner) external onlyAuthorized {
        uint256[] storage ownerRaisingList = ownerRaisings[owner];
        uint256 length = ownerRaisingList.length;

        for (uint256 i = length; i > 0; i--) {
            uint256 raisingId = ownerRaisingList[i - 1];
            // Check if raising still exists
            if (
                raisings[raisingId].id == 0 ||
                raisingOwners[raisingId] != owner ||
                raisings[raisingId].isHarvested ||
                raisings[raisingId].isSlaughtered
            ) {
                // Move last element to current position (if not already last)
                if (i - 1 < length - 1) {
                    ownerRaisingList[i - 1] = ownerRaisingList[length - 1];
                }
                // Remove last element
                ownerRaisingList.pop();
                length--;
            }
        }
    }
}
