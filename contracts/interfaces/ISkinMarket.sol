//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../contracts/struct/SkinMarket.sol";

interface ISkinMarketComponent {
    /**
     * @notice Creates a new NPC Market (admin only)
     * @param _npcId ID of the NPC
     * @param _name Name of the NPC Market
     */
    function createNPCMarket(uint256 _npcId, string memory _name) external;

    /**
     * @notice Adds a skin to the NPC Market (admin only)
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _price Price per unit in wei
     */
    function addSkinToMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _price
    ) external;

    /**
     * @notice Updates a skin's details in the NPC Market (admin only)
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @param _price New price in wei
     */
    function updateSkinInMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _price
    ) external;

    /**
     * @notice Removes a skin from the NPC Market (admin only)
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     */
    function removeSkinFromMarket(
        uint256 _npcId,
        string memory _typeSkin
    ) external;

    /**
     * @notice Sets market active status (admin only)
     * @param _npcId ID of the NPC market
     * @param _isActive Whether market is active
     */
    function setMarketActive(uint256 _npcId, bool _isActive) external;

    /**
     * @notice Allows a player to purchase skins from an NPC with ETH
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @return transactionId ID of the transaction
     */
    function buySkinFromNPC(
        uint256 _npcId,
        string memory _typeSkin
    ) external payable returns (uint256);

    // ============ READ FUNCTIONS ============

    /**
     * @notice Gets market skin information
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of skin (e.g., "Dragon", "Phoenix")
     * @return MarketSkin struct with skin details
     */
    function getMarketSkin(
        uint256 _npcId,
        string memory _typeSkin
    ) external view returns (SkinMarket.MarketSkin memory);

    /**
     * @notice Gets all skins in an NPC market
     * @param _npcId ID of the NPC market
     * @return Array of MarketSkin structs
     */
    function getAllMarketSkins(
        uint256 _npcId
    ) external view returns (SkinMarket.MarketSkin[] memory);

    /**
     * @notice Gets all skin IDs in an NPC market
     * @param _npcId ID of the NPC market
     * @return Array of skin IDs
     */
    function getMarketSkinIds(
        uint256 _npcId
    ) external view returns (uint256[] memory);

    /**
     * @notice Gets basic information about an NPC market
     * @param _npcId ID of the NPC market
     * @return npcId ID of the NPC
     * @return name Name of the market
     * @return isActive Whether the market is active
     * @return skins Array of MarketSkin structs
     */
    function getNPCMarketInfo(
        uint256 _npcId
    ) external view returns (
        uint256 npcId,
        string memory name,
        bool isActive,
        SkinMarket.MarketSkin[] memory skins
    );
    /**
     * @notice Checks if an NPC market is open
     * @param _npcId ID of the NPC market
     * @return True if market is open
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool);

    function updateNPCMarketConfig(
        uint256 _npcId,
        string memory _name
    ) external;
}
