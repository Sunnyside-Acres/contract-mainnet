// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/NPCMarket.sol";

contract NPCMarketComponent {
    address public world;
    address public admin;
    address public implementation;

    mapping(uint256 => NPCMarket) public npcMarkets;

    event ComponentUpdated(address indexed newImplementation);
    event NPCMarketCreated(uint256 indexed npcId, string name);
    event ItemAddedToMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 pricePerUnit,
        bool isSelling
    );
    event ItemUpdatedInMarket(
        uint256 indexed npcId,
        uint256 indexed itemId,
        uint256 newQuantity,
        uint256 newPrice
    );
    event ItemRemovedFromMarket(uint256 indexed npcId, uint256 indexed itemId);

    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

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

    function addItemToMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _limitPerUser,
        uint256 _pricePerUnit,
        bool _isSelling
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(_itemId > 0, "Invalid Item ID");
        require(_pricePerUnit > 0, "Price per unit must be greater than 0");
        require(
            !npcMarkets[_npcId].items[_itemId].active,
            "Item already exists in market"
        );

        // Thêm item vào market
        npcMarkets[_npcId].items[_itemId].itemId = _itemId;
        npcMarkets[_npcId].items[_itemId].limitPerUser = _limitPerUser;
        npcMarkets[_npcId].items[_itemId].pricePerUnit = _pricePerUnit;
        npcMarkets[_npcId].items[_itemId].isSelling = _isSelling;
        npcMarkets[_npcId].items[_itemId].active = true;
        npcMarkets[_npcId].items[_itemId].lastPriceUpdate = block.timestamp;

        // Thêm itemId vào danh sách để iterate
        npcMarkets[_npcId].itemIds.push(_itemId);

        emit ItemAddedToMarket(
            _npcId,
            _itemId,
            _limitPerUser,
            _pricePerUnit,
            _isSelling
        );
    }

    // Function để update item
    function updateItemInMarket(
        uint256 _npcId,
        uint256 _itemId,
        uint256 _newLimitPerUser,
        uint256 _newPrice
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(_itemId > 0, "Invalid Item ID");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );
        require(_newPrice > 0, "Price must be greater than 0");

        npcMarkets[_npcId].items[_itemId].limitPerUser = _newLimitPerUser;
        npcMarkets[_npcId].items[_itemId].pricePerUnit = _newPrice;
        npcMarkets[_npcId].items[_itemId].lastPriceUpdate = block.timestamp;

        emit ItemUpdatedInMarket(_npcId, _itemId, _newLimitPerUser, _newPrice);
    }

    // Function để xóa item khỏi market
    function removeItemFromMarket(
        uint256 _npcId,
        uint256 _itemId
    ) external onlyAuthorized {
        require(_npcId > 0, "Invalid NPC ID");
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(_itemId > 0, "Invalid Item ID");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        // Đánh dấu item không active
        npcMarkets[_npcId].items[_itemId].active = false;

        // Xóa itemId khỏi danh sách
        uint256[] storage itemIds = npcMarkets[_npcId].itemIds;
        for (uint256 i = 0; i < itemIds.length; i++) {
            if (itemIds[i] == _itemId) {
                itemIds[i] = itemIds[itemIds.length - 1];
                itemIds.pop();
                break;
            }
        }

        emit ItemRemovedFromMarket(_npcId, _itemId);
    }

    // Function để lấy thông tin item cụ thể trong market
    function getMarketItem(
        uint256 _npcId,
        uint256 _itemId
    ) external view returns (MarketItemView memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        MarketItem storage item = npcMarkets[_npcId].items[_itemId];
        return
            MarketItemView({
                itemId: item.itemId,
                limitPerUser: item.limitPerUser,
                pricePerUnit: item.pricePerUnit,
                isSelling: item.isSelling,
                active: item.active,
                lastPriceUpdate: item.lastPriceUpdate
            });
    }

    // Function để lấy tất cả items trong market
    function getAllMarketItems(
        uint256 _npcId
    ) external view returns (MarketItemView[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");

        uint256[] memory itemIds = npcMarkets[_npcId].itemIds;
        MarketItemView[] memory items = new MarketItemView[](itemIds.length);

        for (uint256 i = 0; i < itemIds.length; i++) {
            MarketItem storage item = npcMarkets[_npcId].items[itemIds[i]];
            items[i] = MarketItemView({
                itemId: item.itemId,
                limitPerUser: item.limitPerUser,
                pricePerUnit: item.pricePerUnit,
                isSelling: item.isSelling,
                active: item.active,
                lastPriceUpdate: item.lastPriceUpdate
            });
        }

        return items;
    }

    // Function để lấy danh sách itemIds
    function getMarketItemIds(
        uint256 _npcId
    ) external view returns (uint256[] memory) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        return npcMarkets[_npcId].itemIds;
    }

    // Function để lấy thông tin NPC market
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
        )
    {
        NPCMarket storage market = npcMarkets[_npcId];
        return (
            market.npcId,
            market.name,
            market.isActive,
            market.itemIds.length
        );
    }

    // Function để kiểm tra market có mở không
    function isMarketOpen(uint256 _npcId) external view returns (bool) {
        NPCMarket storage market = npcMarkets[_npcId];
        return market.isActive;
    }

    // Function để track user purchases
    function addUserPurchase(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _quantity
    ) external onlyAuthorized {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        npcMarkets[_npcId].items[_itemId].userPurchases[_user] += _quantity;
    }

    // Function để lấy số lượng đã mua của user
    function getUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external view returns (uint256) {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        return npcMarkets[_npcId].items[_itemId].userPurchases[_user];
    }

    // Function để kiểm tra xem user có thể mua thêm không
    function canUserPurchaseMore(
        uint256 _npcId,
        uint256 _itemId,
        address _user,
        uint256 _additionalQuantity
    ) external view returns (bool) {
        if (!npcMarkets[_npcId].isActive) return false;
        if (!npcMarkets[_npcId].items[_itemId].active) return false;

        uint256 limitPerUser = npcMarkets[_npcId].items[_itemId].limitPerUser;

        // Nếu limit = 0, không giới hạn
        if (limitPerUser == 0) return true;

        uint256 currentPurchases = npcMarkets[_npcId]
            .items[_itemId]
            .userPurchases[_user];
        return (currentPurchases + _additionalQuantity) <= limitPerUser;
    }

    // Function để reset user purchases (admin only)
    function resetUserPurchases(
        uint256 _npcId,
        uint256 _itemId,
        address _user
    ) external onlyAuthorized {
        require(npcMarkets[_npcId].isActive, "NPC market is not active");
        require(
            npcMarkets[_npcId].items[_itemId].active,
            "Item not found in market"
        );

        npcMarkets[_npcId].items[_itemId].userPurchases[_user] = 0;
    }
}
