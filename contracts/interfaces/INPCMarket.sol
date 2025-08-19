// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/NPCMarket.sol";

interface INPCMarketComponent {
    // Core functions
    function createNPCMarket(
        uint256 _npcId,
        string memory _name
    ) external;

    function addItemToMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external;

    function updateItemInMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _newLimitPerUser,
        uint256 _newPrice
    ) external;

    function removeItemFromMarket(uint256 _npcId, uint256 _itemId) external;

    // View functions
    function getMarketItem(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (MarketItemView memory);

    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (MarketItemView[] memory);

    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory);

    function getNPCMarketInfo(
        uint256 _npcId
    )
        external
        view
        returns (
            uint256 npcId,
            string memory name,
            bool isActive,
            uint256 itemCount
        );

    function isMarketOpen(uint256 _npcId) external view returns (bool);

    // User tracking functions
    function addUserPurchase(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _quantity
    ) external;

    function getUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256);

    function canUserPurchaseMore(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _additionalQuantity
    ) external view returns (bool);

    function resetUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external;
}
