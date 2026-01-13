//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/SkinMarket.sol";

contract SkinMarketComponent {
    address public world;
    address public implementation;

    /// @notice Mapping from NPC ID to NPCMarket struct
    mapping(uint256 => SkinMarket.NPCMarket) public npcMarkets;

    // ============ EVENTS ============

    /// @notice Emitted when the implementation contract is upgraded
    event ComponentUpdated(address indexed newImplementation);

    /// @notice Emitted when a new NPC market is created
    event NPCMarketCreated(uint256 indexed npcId, string name);

    /// @notice Emitted when an skin is added to a market
    event SkinAddedToMarket(
        uint256 indexed npcId,
        string indexed typeSkin,
        uint256 price
    );

    /// @notice Emitted when an skin's details are updated in a market
    event SkinUpdatedInMarket(
        uint256 indexed npcId,
        string indexed typeSkin,
        uint256 price
    );

    /// @notice Emitted when an skin is removed from a market
    event SkinRemovedFromMarket(uint256 indexed npcId, string indexed typeSkin);

    /// @notice Emitted when a market's active state is changed
    event MarketStateChanged(uint256 indexed npcId, bool isActive);

    // ============ MODIFIERS ============
    /**
     * @dev Modifier to restrict access to authorized logic contracts only
     * @notice Reverts if caller is not a registered logic contract
     */
    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    /**
     * @dev Creates a new NPC Market
     * @notice Initializes a market for a specific NPC with ETH payment settings
     * @param _npcId ID of the NPC
     * @param _name Name of the market/NPC
     */
    function createNPCMarket(
        uint256 _npcId,
        string memory _name
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(!npcMarkets[_npcId].isActive, "NPC market already exists");

        npcMarkets[_npcId].npcId = _npcId;
        npcMarkets[_npcId].name = _name;
        npcMarkets[_npcId].isActive = true;

        emit NPCMarketCreated(_npcId, _name);
    }

    /**
     * @dev Adds an skin to an NPC market
     * @notice Sets up an skin for buying or selling in the market
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin to add
     * @param _price Price in wei
     */
    function addSkinToMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _price
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(bytes(_typeSkin).length > 0, "Invalid Skin Type");
        require(_price > 0, "Price must be greater than 0");
        require(
            !npcMarkets[_npcId].skins[_typeSkin].active,
            "Skin already exists in market"
        );

        // Add skin type to market
        npcMarkets[_npcId].skins[_typeSkin].skinType = _typeSkin;
        npcMarkets[_npcId].skins[_typeSkin].price = _price;
        npcMarkets[_npcId].skins[_typeSkin].active = true;
        npcMarkets[_npcId].skins[_typeSkin].lastPriceUpdate = block.timestamp;

        // Add skin type to list for iteration
        npcMarkets[_npcId].skinTypes.push(_typeSkin);

        emit SkinAddedToMarket(_npcId, _typeSkin, _price);
    }

    /**
     * @dev Updates an skin's details in the market
     * @notice Modifies price and purchase limit for an existing market skin
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin to update
     * @param _newPrice New price per unit in wei
     */
    function updateSkinInMarket(
        uint256 _npcId,
        string memory _typeSkin,
        uint256 _newPrice
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(bytes(_typeSkin).length > 0, "Invalid Skin Type");
        require(
            npcMarkets[_npcId].skins[_typeSkin].active,
            "Skin not found in market"
        );
        require(_newPrice > 0, "Price must be greater than 0");

        npcMarkets[_npcId].skins[_typeSkin].price = _newPrice;
        npcMarkets[_npcId].skins[_typeSkin].lastPriceUpdate = block.timestamp;

        emit SkinUpdatedInMarket(_npcId, _typeSkin, _newPrice);
    }

    /**
     * @dev Removes a skin type from the market
     * @notice Marks skin type as inactive and removes from skin type list
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin to remove
     */
    function removeSkinFromMarket(
        uint256 _npcId,
        string memory _typeSkin
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(bytes(_typeSkin).length > 0, "Invalid Skin Type");
        require(
            npcMarkets[_npcId].skins[_typeSkin].active,
            "Skin not found in market"
        );

        // Mark skin type as inactive
        npcMarkets[_npcId].skins[_typeSkin].active = false;

        // Remove skin type from list
        string[] storage skinTypes = npcMarkets[_npcId].skinTypes;
        for (uint256 i = 0; i < skinTypes.length; i++) {
            if (
                keccak256(abi.encodePacked(skinTypes[i])) ==
                keccak256(abi.encodePacked(_typeSkin))
            ) {
                skinTypes[i] = skinTypes[skinTypes.length - 1];
                skinTypes.pop();

                emit SkinRemovedFromMarket(_npcId, _typeSkin);

                break;
            }
        }
    }

    /**
     * @dev Sets market active status
     * @param _npcId ID of the NPC market
     * @param _isActive Whether market is active
     */
    function setMarketActive(
        uint256 _npcId,
        bool _isActive
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        npcMarkets[_npcId].isActive = _isActive;
        emit MarketStateChanged(_npcId, _isActive);
    }

    // ============ READ FUNCTIONS ============

    /**
     * @dev Gets detailed information about a specific market skin
     * @param _npcId ID of the NPC market
     * @param _typeSkin Type of the skin
     * @return MarketSkin struct with skin details
     */
    function getMarketSkin(
        uint256 _npcId,
        string memory _typeSkin
    ) external view returns (SkinMarket.MarketSkin memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].skins[_typeSkin].active,
            "Skin not found in market"
        );

        SkinMarket.MarketSkin memory skin = npcMarkets[_npcId].skins[_typeSkin];
        return skin;
    }

    /**
     * @dev Gets all skins in a market
     * @param _npcId ID of the NPC market
     * @return Array of MarketSkin structs
     */
    function getAllMarketSkins(
        uint256 _npcId
    ) public view returns (SkinMarket.MarketSkin[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");

        string[] memory skinTypes = npcMarkets[_npcId].skinTypes;
        SkinMarket.MarketSkin[] memory skins = new SkinMarket.MarketSkin[](
            skinTypes.length
        );

        for (uint256 i = 0; i < skinTypes.length; i++) {
            SkinMarket.MarketSkin memory skin = npcMarkets[_npcId].skins[
                skinTypes[i]
            ];
            skins[i] = skin;
        }
        return skins;
    }

    /**
     * @dev Gets all skin IDs in a market
     * @param _npcId ID of the NPC market
     * @return Array of skin IDs
     */
    function getMarketSkinIds(
        uint256 _npcId
    ) external view returns (string[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        return npcMarkets[_npcId].skinTypes;
    }

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
    )
        external
        view
        returns (
            uint256 npcId,
            string memory name,
            bool isActive,
            SkinMarket.MarketSkin[] memory skins
        )
    {
        SkinMarket.NPCMarket storage market = npcMarkets[_npcId];

        return (
            market.npcId,
            market.name,
            market.isActive,
            getAllMarketSkins(_npcId)
        );
    }

    /**
     * @dev Checks if a market is currently open/active
     * @param _npcId ID of the NPC market
     * @return True if market is active, false otherwise
     */
    function isMarketOpen(uint256 _npcId) external view returns (bool) {
        SkinMarket.NPCMarket storage market = npcMarkets[_npcId];
        return market.isActive;
    }

    /**
     * @dev Updates NPC Market configuration
     * @param _npcId ID of the NPC market
     * @param _name New name of the market/NPC
     */
    function updateNPCMarketConfig(
        uint256 _npcId,
        string memory _name
    ) external onlyAuthorized {
        require(npcMarkets[_npcId].isActive, "Market not found");
        npcMarkets[_npcId].name = _name;
    }
}
