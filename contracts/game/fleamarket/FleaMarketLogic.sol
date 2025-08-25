// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IFleaMarket.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/FleaMarket.sol";
import "../../struct/Inventory.sol";
import "../../struct/Player.sol";

/**
 * @title FleaMarketLogic
 * @dev Logic contract cho Flea Market - cho phép người chơi mua bán item
 *
 * Tính năng chính:
 * - List item lên market với nhiều lệnh khác nhau cho cùng một item
 * - Mua item từ listing cụ thể hoặc tự động chọn giá tốt nhất
 * - Quản lý inventory: trừ item khi list, trả lại khi cancel
 * - Bulk purchase từ nhiều listing
 * - Thống kê và báo cáo thị trường
 */
contract FleaMarketLogic {
    IWorld public world;
    IFleaMarketComponent public fleaMarketProxy;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    IPlayerComponent public playerProxy;

    // ============ EVENTS ============

    event ItemListed(
        address indexed seller,
        uint256 indexed listingId,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 price,
        uint256 expirationTime
    );

    event ItemPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed listingId,
        uint256 itemId,
        uint256 quantity,
        uint256 price
    );

    event ListingUpdated(
        uint256 indexed listingId,
        uint256 quantity,
        uint256 price,
        uint256 expirationTime
    );

    event ListingCancelled(address indexed seller, uint256 indexed listingId);

    event BulkPurchaseCompleted(
        address indexed buyer,
        uint256[] listingIds,
        uint256[] quantities,
        uint256 totalCost
    );

    event BestPricePurchaseCompleted(
        address indexed buyer,
        uint256 indexed itemId,
        uint256 requestedQuantity,
        uint256 actualQuantity,
        uint256 totalCost
    );

    // ============ MODIFIERS ============

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

    // ============ CONSTRUCTOR ============

    constructor(
        address _world,
        address _fleaMarketProxy,
        address _inventoryProxy,
        address _itemProxy,
        address _playerProxy
    ) {
        world = IWorld(_world);
        fleaMarketProxy = IFleaMarketComponent(_fleaMarketProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @dev Đăng bán item lên flea market - cho phép nhiều lệnh cho cùng một item
     * @param _itemId ID của item muốn bán
     * @param _quantity Số lượng item muốn bán trong lệnh này
     * @param _price Giá bán cho mỗi item (sunny)
     * @param _duration Thời gian hiệu lực của lệnh (giây)
     *
     * Quy trình:
     * 1. Validate input parameters
     * 2. Kiểm tra người chơi và item tồn tại
     * 3. Kiểm tra đủ item trong inventory
     * 4. Trừ item khỏi inventory ngay lập tức
     * 5. Tạo listing với ID duy nhất
     * 6. Emit event ItemListed
     */
    function listItem(
        uint256 _itemId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration
    ) external {
        address seller = msg.sender;

        // Validate input
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(seller);
        require(playerData.level > 0, "Player not initialized");

        // Check if item exists in game
        require(itemProxy.exists(_itemId), "Item does not exist in game");

        // Check if player has enough items in inventory
        InventoryItem memory playerItem = inventoryProxy.getItem(
            seller,
            _itemId
        );
        require(playerItem.quantity > 0, "Item does not exist in inventory");
        require(
            playerItem.quantity >= _quantity,
            "Not enough items in inventory to list"
        );

        // Remove items from seller's inventory immediately
        uint256 newQuantity = playerItem.quantity - _quantity;
        inventoryProxy.setItem(
            seller,
            _itemId,
            newQuantity,
            playerItem.durability,
            playerItem.expiration
        );

        // Create listing with unique ID
        uint256 listingId = fleaMarketProxy.createListing(
            seller,
            _itemId,
            _quantity,
            _price,
            _duration,
            playerItem.durability,
            playerItem.expiration
        );

        emit ItemListed(
            seller,
            listingId,
            _itemId,
            _quantity,
            _price,
            block.timestamp + _duration
        );
    }

    /**
     * @dev Mua item từ flea market - mỗi lần mua chỉ mua từ một listing cụ thể
     * @param _listingId ID của listing cụ thể muốn mua
     * @param _quantity Số lượng item muốn mua từ listing này
     *
     * Quy trình:
     * 1. Validate input và kiểm tra người mua
     * 2. Kiểm tra listing còn hoạt động và chưa hết hạn
     * 3. Kiểm tra đủ số lượng và không mua của chính mình
     * 4. Tính toán chi phí và kiểm tra đủ sunny
     * 5. Trừ sunny từ người mua, cộng cho người bán
     * 6. Xử lý giao dịch và cập nhật inventory
     * 7. Thêm vào lịch sử giao dịch
     */
    function purchaseItem(uint256 _listingId, uint256 _quantity) external {
        address buyer = msg.sender;

        // Validate input
        require(_quantity > 0, "Quantity must be greater than 0");

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(buyer);
        require(playerData.level > 0, "Player not initialized");

        // Get listing details
        MarketListing memory listing = fleaMarketProxy.getListing(_listingId);
        require(listing.isActive, "Listing is not active");
        require(
            listing.expirationTime > block.timestamp,
            "Listing has expired"
        );
        require(
            listing.quantity >= _quantity,
            "Not enough items available in this listing"
        );
        require(buyer != listing.seller, "Cannot buy your own item");

        // Calculate total cost for this specific listing
        uint256 totalCost = listing.price * _quantity;

        // Check if buyer has enough sunny
        require(playerData.sunny >= totalCost, "Not enough sunny to purchase");

        // Deduct sunny from buyer
        playerProxy.subtractSunny(buyer, totalCost);

        // Add sunny to seller
        playerProxy.addSunny(listing.seller, totalCost);

        // Process the purchase from this specific listing
        bool success = fleaMarketProxy.purchaseItem(
            _listingId,
            buyer,
            _quantity
        );
        require(success, "Purchase failed");

        // Add items to buyer's inventory
        InventoryItem memory buyerItem = inventoryProxy.getItem(
            buyer,
            listing.itemId
        );
        uint256 newQuantity = buyerItem.quantity + _quantity;

        inventoryProxy.setItem(
            buyer,
            listing.itemId,
            newQuantity,
            listing.durability,
            listing.expiration
        );

        // Add transaction to history
        fleaMarketProxy.addTransaction(
            _listingId,
            listing.seller,
            buyer,
            listing.itemId,
            _quantity,
            listing.price,
            listing.durability,
            listing.expiration
        );

        emit ItemPurchased(
            buyer,
            listing.seller,
            _listingId,
            listing.itemId,
            _quantity,
            totalCost
        );
    }

    /**
     * @dev Cập nhật listing (chỉ người bán)
     * @param _listingId ID của listing muốn cập nhật
     * @param _quantity Số lượng mới
     * @param _price Giá mới
     * @param _duration Thời gian hiệu lực mới
     *
     * Quy trình:
     * 1. Validate input và quyền sở hữu
     * 2. Nếu tăng số lượng: trừ thêm item từ inventory
     * 3. Nếu giảm số lượng: trả lại item vào inventory
     * 4. Cập nhật listing với thông tin mới
     */
    function updateListing(
        uint256 _listingId,
        uint256 _quantity,
        uint256 _price,
        uint256 _duration
    ) external {
        address seller = msg.sender;

        // Validate input
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_duration <= 7 days, "Duration cannot exceed 7 days");

        // Get listing details
        MarketListing memory listing = fleaMarketProxy.getListing(_listingId);
        require(listing.seller == seller, "Only seller can update listing");
        require(listing.isActive, "Listing is not active");
        require(
            listing.expirationTime > block.timestamp,
            "Listing has expired"
        );

        // Check if player has enough items for the new quantity
        if (_quantity > listing.quantity) {
            uint256 additionalQuantity = _quantity - listing.quantity;
            InventoryItem memory playerItem = inventoryProxy.getItem(
                seller,
                listing.itemId
            );
            require(
                playerItem.quantity >= additionalQuantity,
                "Not enough items for new quantity"
            );

            // Remove additional items from inventory
            uint256 newInventoryQuantity = playerItem.quantity -
                additionalQuantity;
            inventoryProxy.setItem(
                seller,
                listing.itemId,
                newInventoryQuantity,
                playerItem.durability,
                playerItem.expiration
            );
        } else if (_quantity < listing.quantity) {
            uint256 returnedQuantity = listing.quantity - _quantity;

            // Return items to inventory
            InventoryItem memory playerItem = inventoryProxy.getItem(
                seller,
                listing.itemId
            );
            uint256 newInventoryQuantity = playerItem.quantity +
                returnedQuantity;
            inventoryProxy.setItem(
                seller,
                listing.itemId,
                newInventoryQuantity,
                playerItem.durability,
                playerItem.expiration
            );
        }

        // Update listing
        fleaMarketProxy.updateListing(_listingId, _quantity, _price, _duration);

        emit ListingUpdated(
            _listingId,
            _quantity,
            _price,
            block.timestamp + _duration
        );
    }

    /**
     * @dev Hủy listing (chỉ người bán) - trả lại item vào inventory
     * @param _listingId ID của listing muốn hủy
     *
     * Quy trình:
     * 1. Kiểm tra quyền sở hữu và trạng thái listing
     * 2. Trả lại toàn bộ item vào inventory của người bán
     * 3. Hủy listing (set isActive = false)
     * 4. Emit event ListingCancelled
     */
    function cancelListing(uint256 _listingId) external {
        address seller = msg.sender;

        // Get listing details
        MarketListing memory listing = fleaMarketProxy.getListing(_listingId);
        require(listing.seller == seller, "Only seller can cancel listing");
        require(listing.isActive, "Listing is not active");

        // Return items to seller's inventory
        InventoryItem memory playerItem = inventoryProxy.getItem(
            seller,
            listing.itemId
        );
        uint256 newQuantity = playerItem.quantity + listing.quantity;

        inventoryProxy.setItem(
            seller,
            listing.itemId,
            newQuantity,
            listing.durability,
            listing.expiration
        );

        // Cancel listing
        fleaMarketProxy.cancelListing(_listingId);

        emit ListingCancelled(seller, _listingId);
    }

    /**
     * @dev Mua nhiều item từ nhiều listing khác nhau (bulk purchase)
     * @param _listingIds Mảng ID của các listing muốn mua
     * @param _quantities Mảng số lượng tương ứng cho mỗi listing
     *
     * Quy trình:
     * 1. Validate input arrays
     * 2. Kiểm tra tất cả listing và tính tổng chi phí
     * 3. Kiểm tra đủ sunny
     * 4. Xử lý từng giao dịch mua
     * 5. Cập nhật inventory và lịch sử
     */
    function purchaseMultipleItems(
        uint256[] calldata _listingIds,
        uint256[] calldata _quantities
    ) external {
        require(
            _listingIds.length == _quantities.length,
            "Arrays length mismatch"
        );
        require(_listingIds.length > 0, "Must purchase at least one item");

        address buyer = msg.sender;
        uint256 totalCost = 0;

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(buyer);
        require(playerData.level > 0, "Player not initialized");

        // Validate all purchases first
        for (uint256 i = 0; i < _listingIds.length; i++) {
            require(_quantities[i] > 0, "Quantity must be greater than 0");

            MarketListing memory listing = fleaMarketProxy.getListing(
                _listingIds[i]
            );
            require(listing.isActive, "Listing is not active");
            require(
                listing.expirationTime > block.timestamp,
                "Listing has expired"
            );
            require(
                listing.quantity >= _quantities[i],
                "Not enough items available"
            );
            require(buyer != listing.seller, "Cannot buy your own item");

            totalCost += listing.price * _quantities[i];
        }

        // Check if buyer has enough sunny
        require(playerData.sunny >= totalCost, "Not enough sunny to purchase");

        // Deduct sunny from buyer
        playerProxy.subtractSunny(buyer, totalCost);

        // Process each purchase
        for (uint256 i = 0; i < _listingIds.length; i++) {
            MarketListing memory listing = fleaMarketProxy.getListing(
                _listingIds[i]
            );

            // Add sunny to seller
            playerProxy.addSunny(
                listing.seller,
                listing.price * _quantities[i]
            );

            // Process the purchase
            bool success = fleaMarketProxy.purchaseItem(
                _listingIds[i],
                buyer,
                _quantities[i]
            );
            require(success, "Purchase failed");

            // Add items to buyer's inventory
            InventoryItem memory buyerItem = inventoryProxy.getItem(
                buyer,
                listing.itemId
            );
            uint256 newQuantity = buyerItem.quantity + _quantities[i];

            inventoryProxy.setItem(
                buyer,
                listing.itemId,
                newQuantity,
                listing.durability,
                listing.expiration
            );

            // Add transaction to history
            fleaMarketProxy.addTransaction(
                _listingIds[i],
                listing.seller,
                buyer,
                listing.itemId,
                _quantities[i],
                listing.price,
                listing.durability,
                listing.expiration
            );

            emit ItemPurchased(
                buyer,
                listing.seller,
                _listingIds[i],
                listing.itemId,
                _quantities[i],
                listing.price * _quantities[i]
            );
        }

        emit BulkPurchaseCompleted(buyer, _listingIds, _quantities, totalCost);
    }

    /**
     * @dev Mua item từ tất cả listing có sẵn (không sắp xếp theo giá)
     * @param _itemId ID của item muốn mua
     * @param _quantity Tổng số lượng item muốn mua
     *
     * Quy trình:
     * 1. Lấy tất cả listing cho item
     * 2. Mua từ listing đầu tiên có sẵn
     * 3. Tiếp tục với listing tiếp theo nếu cần
     * 4. Tính toán tổng chi phí và trừ sunny
     * 5. Cập nhật inventory và lịch sử
     */
    function purchaseBestPrice(uint256 _itemId, uint256 _quantity) external {
        address buyer = msg.sender;

        // Validate input
        require(_quantity > 0, "Quantity must be greater than 0");

        // Check if player exists
        Player memory playerData = playerProxy.getPlayer(buyer);
        require(playerData.level > 0, "Player not initialized");

        // Get all listings for this item
        MarketListing[] memory listings = fleaMarketProxy.getListingsByItem(
            _itemId
        );
        require(listings.length > 0, "No listings available for this item");

        uint256 remainingQuantity = _quantity;
        uint256 totalCost = 0;
        uint256 totalPurchased = 0;

        // Buy from available listings in order
        for (uint256 i = 0; i < listings.length && remainingQuantity > 0; i++) {
            MarketListing memory listing = listings[i];

            if (
                !listing.isActive || listing.expirationTime <= block.timestamp
            ) {
                continue;
            }

            uint256 buyQuantity = remainingQuantity;
            if (buyQuantity > listing.quantity) {
                buyQuantity = listing.quantity;
            }

            uint256 cost = listing.price * buyQuantity;
            totalCost += cost;
            remainingQuantity -= buyQuantity;
            totalPurchased += buyQuantity;

            // Process the purchase
            bool success = fleaMarketProxy.purchaseItem(
                listing.id,
                buyer,
                buyQuantity
            );
            require(success, "Purchase failed");

            // Add sunny to seller
            playerProxy.addSunny(listing.seller, cost);

            // Add items to buyer's inventory
            InventoryItem memory buyerItem = inventoryProxy.getItem(
                buyer,
                listing.itemId
            );
            uint256 newQuantity = buyerItem.quantity + buyQuantity;

            inventoryProxy.setItem(
                buyer,
                listing.itemId,
                newQuantity,
                listing.durability,
                listing.expiration
            );

            // Add transaction to history
            fleaMarketProxy.addTransaction(
                listing.id,
                listing.seller,
                buyer,
                listing.itemId,
                buyQuantity,
                listing.price,
                listing.durability,
                listing.expiration
            );

            emit ItemPurchased(
                buyer,
                listing.seller,
                listing.id,
                listing.itemId,
                buyQuantity,
                cost
            );
        }

        require(totalPurchased > 0, "No items were purchased");

        // Deduct total sunny from buyer
        playerProxy.subtractSunny(buyer, totalCost);

        // If we couldn't buy all requested quantity, emit a warning
        if (remainingQuantity > 0) {
            // You could emit an event here to inform the buyer
            // that not all requested quantity was available
        }

        emit BestPricePurchaseCompleted(
            buyer,
            _itemId,
            _quantity,
            totalPurchased,
            totalCost
        );
    }

    // ============ READ FUNCTIONS (EXTERNAL VIEW) ============

    /**
     * @dev Lấy tất cả listing đang hoạt động
     * @return Mảng các MarketListing đang hoạt động
     */
    function getActiveListings()
        external
        view
        returns (MarketListing[] memory)
    {
        return fleaMarketProxy.getActiveListings();
    }

    /**
     * @dev Lấy listing theo người bán
     * @param _seller Địa chỉ người bán
     * @return Mảng các MarketListing của người bán
     */
    function getListingsBySeller(
        address _seller
    ) external view returns (MarketListing[] memory) {
        return fleaMarketProxy.getListingsBySeller(_seller);
    }

    /**
     * @dev Lấy listing theo item (chỉ những listing đang hoạt động)
     * @param _itemId ID của item
     * @return Mảng các MarketListing cho item này
     */
    function getListingsByItem(
        uint256 _itemId
    ) external view returns (MarketListing[] memory) {
        return fleaMarketProxy.getListingsByItem(_itemId);
    }

    /**
     * @dev Lấy lịch sử giao dịch của người chơi
     * @param _player Địa chỉ người chơi
     * @return Mảng các MarketTransaction
     */
    function getTransactionHistory(
        address _player
    ) external view returns (MarketTransaction[] memory) {
        return fleaMarketProxy.getTransactionHistory(_player);
    }

    /**
     * @dev Lấy thống kê thị trường
     * @return MarketStats với các thông tin tổng quan
     */
    function getMarketStats() external view returns (MarketStats memory) {
        return fleaMarketProxy.getMarketStats();
    }

    /**
     * @dev Kiểm tra xem người chơi có thể mua item không
     * @param _player Địa chỉ người chơi
     * @param _listingId ID của listing
     * @param _quantity Số lượng muốn mua
     * @return (bool success, string message)
     */
    function canPurchaseItem(
        address _player,
        uint256 _listingId,
        uint256 _quantity
    ) external view returns (bool, string memory) {
        if (!fleaMarketProxy.exists(_listingId)) {
            return (false, "Listing does not exist");
        }

        MarketListing memory listing = fleaMarketProxy.getListing(_listingId);
        if (!listing.isActive) {
            return (false, "Listing is not active");
        }
        if (listing.expirationTime <= block.timestamp) {
            return (false, "Listing has expired");
        }
        if (listing.quantity < _quantity) {
            return (false, "Not enough items available");
        }
        if (_player == listing.seller) {
            return (false, "Cannot buy your own item");
        }

        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }

        uint256 totalCost = listing.price * _quantity;
        if (playerData.sunny < totalCost) {
            return (false, "Not enough sunny");
        }

        return (true, "Can purchase");
    }

    /**
     * @dev Kiểm tra xem người chơi có thể đăng bán item không
     * @param _player Địa chỉ người chơi
     * @param _itemId ID của item
     * @param _quantity Số lượng muốn list
     * @return (bool success, string message)
     */
    function canListItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (bool, string memory) {
        if (!itemProxy.exists(_itemId)) {
            return (false, "Item does not exist");
        }

        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }

        InventoryItem memory playerItem = inventoryProxy.getItem(
            _player,
            _itemId
        );

        if (playerItem.quantity < _quantity) {
            return (false, "Not enough items");
        }

        return (true, "Can list item");
    }

    /**
     * @dev Lấy tổng số lượng item đang được list bởi một người chơi
     * @param _player Địa chỉ người chơi
     * @param _itemId ID của item
     * @return Tổng số lượng đang được list
     */
    function getPlayerTotalListedQuantity(
        address _player,
        uint256 _itemId
    ) external view returns (uint256) {
        MarketListing[] memory allPlayerListings = fleaMarketProxy
            .getListingsBySeller(_player);

        uint256 totalQuantity = 0;
        for (uint256 i = 0; i < allPlayerListings.length; i++) {
            if (
                allPlayerListings[i].itemId == _itemId &&
                allPlayerListings[i].isActive &&
                allPlayerListings[i].expirationTime > block.timestamp
            ) {
                totalQuantity += allPlayerListings[i].quantity;
            }
        }

        return totalQuantity;
    }

    /**
     * @dev Kiểm tra xem người chơi có thể list thêm item không (dựa trên inventory hiện tại)
     * @param _player Địa chỉ người chơi
     * @param _itemId ID của item
     * @param _additionalQuantity Số lượng muốn list thêm
     * @return (bool success, string message)
     */
    function canListAdditionalItem(
        address _player,
        uint256 _itemId,
        uint256 _additionalQuantity
    ) external view returns (bool, string memory) {
        // Check if player can list the basic quantity (this already checks inventory)
        (bool canList, string memory message) = this.canListItem(
            _player,
            _itemId,
            _additionalQuantity
        );

        return (canList, message);
    }

    /**
     * @dev Lấy thông tin chi tiết về tất cả listing của một item (bao gồm cả không hoạt động)
     * @param _itemId ID của item
     * @return filteredListings Mảng tất cả MarketListing cho item này
     */
    function getAllListingsForItem(
        uint256 _itemId
    ) external view returns (MarketListing[] memory filteredListings) {
        MarketListing[] memory allListings = fleaMarketProxy.getAllListings();

        // Count listings for this item
        uint256 count = 0;
        for (uint256 i = 0; i < allListings.length; i++) {
            if (allListings[i].itemId == _itemId) {
                count++;
            }
        }

        // Handle edge cases
        if (count == 0) {
            filteredListings = new MarketListing[](0);
            return filteredListings;
        }

        // Create filtered array
        filteredListings = new MarketListing[](count);
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < allListings.length; i++) {
            if (allListings[i].itemId == _itemId) {
                filteredListings[resultIndex] = allListings[i];
                resultIndex++;
            }
        }

        return filteredListings;
    }

    /**
     * @dev Lấy thống kê về listing của một item
     * @param _itemId ID của item
     * @return totalListings Tổng số listing
     * @return activeListings Số listing đang hoạt động
     * @return totalQuantity Tổng số lượng item
     * @return activeQuantity Số lượng item đang hoạt động
     * @return lowestPrice Giá thấp nhất
     * @return highestPrice Giá cao nhất
     */
    function getItemListingStats(
        uint256 _itemId
    )
        external
        view
        returns (
            uint256 totalListings,
            uint256 activeListings,
            uint256 totalQuantity,
            uint256 activeQuantity,
            uint256 lowestPrice,
            uint256 highestPrice
        )
    {
        MarketListing[] memory allListings = fleaMarketProxy.getAllListings();

        totalListings = 0;
        lowestPrice = type(uint256).max;
        highestPrice = 0;

        for (uint256 i = 0; i < allListings.length; i++) {
            if (allListings[i].itemId == _itemId) {
                totalListings++;
                totalQuantity += allListings[i].quantity;

                if (allListings[i].price < lowestPrice) {
                    lowestPrice = allListings[i].price;
                }
                if (allListings[i].price > highestPrice) {
                    highestPrice = allListings[i].price;
                }

                if (
                    allListings[i].isActive &&
                    allListings[i].expirationTime > block.timestamp
                ) {
                    activeListings++;
                    activeQuantity += allListings[i].quantity;
                }
            }
        }

        if (lowestPrice == type(uint256).max) {
            lowestPrice = 0;
        }
    }

    /**
     * @dev Lấy thông tin tổng quan về inventory và listing của người chơi cho một item
     * @param _player Địa chỉ người chơi
     * @param _itemId ID của item
     * @return inventoryQuantity Số lượng trong inventory
     * @return listedQuantity Số lượng đang được list
     * @return availableForListing Số lượng có thể list
     * @return totalListings Tổng số listing
     */
    function getPlayerItemOverview(
        address _player,
        uint256 _itemId
    )
        external
        view
        returns (
            uint256 inventoryQuantity,
            uint256 listedQuantity,
            uint256 availableForListing,
            uint256 totalListings
        )
    {
        // Get inventory quantity
        InventoryItem memory playerItem = inventoryProxy.getItem(
            _player,
            _itemId
        );
        inventoryQuantity = playerItem.quantity;

        // Get total listed quantity
        listedQuantity = this.getPlayerTotalListedQuantity(_player, _itemId);

        // Available for listing = inventory quantity (since listed items are already removed from inventory)
        availableForListing = inventoryQuantity;

        // Get total number of listings
        MarketListing[] memory allPlayerListings = fleaMarketProxy
            .getListingsBySeller(_player);

        totalListings = 0;
        for (uint256 i = 0; i < allPlayerListings.length; i++) {
            if (
                allPlayerListings[i].itemId == _itemId &&
                allPlayerListings[i].isActive &&
                allPlayerListings[i].expirationTime > block.timestamp
            ) {
                totalListings++;
            }
        }
    }

    /**
     * @dev Kiểm tra xem người chơi có thể sử dụng item không (không bị lock trong listing)
     * @param _player Địa chỉ người chơi
     * @param _itemId ID của item
     * @param _quantity Số lượng muốn sử dụng
     * @return (bool success, string message)
     */
    function canUseItem(
        address _player,
        uint256 _itemId,
        uint256 _quantity
    ) external view returns (bool, string memory) {
        // Check if player has enough items in inventory
        InventoryItem memory playerItem = inventoryProxy.getItem(
            _player,
            _itemId
        );

        if (playerItem.quantity < _quantity) {
            return (false, "Not enough items in inventory");
        }

        return (true, "Can use item");
    }

    /**
     * @dev Lấy tổng số item duy nhất mà player đang list
     * @param _player Địa chỉ người chơi
     * @return Tổng số item duy nhất
     */
    function getPlayerTotalListedItemsCount(
        address _player
    ) external view returns (uint256) {
        MarketListing[] memory allPlayerListings = fleaMarketProxy
            .getListingsBySeller(_player);

        uint256 uniqueItemCount = 0;
        bool[] memory itemFound = new bool[](1000); // Assuming max 1000 items

        for (uint256 i = 0; i < allPlayerListings.length; i++) {
            if (
                allPlayerListings[i].isActive &&
                allPlayerListings[i].expirationTime > block.timestamp &&
                !itemFound[allPlayerListings[i].itemId]
            ) {
                itemFound[allPlayerListings[i].itemId] = true;
                uniqueItemCount++;
            }
        }

        return uniqueItemCount;
    }

    /**
     * @dev Lấy tổng số item duy nhất đang được bán trên flea market
     * @return Tổng số item duy nhất
     */
    function getTotalUniqueItemsCount() external view returns (uint256) {
        MarketListing[] memory allActiveListings = fleaMarketProxy
            .getActiveListings();

        uint256 uniqueItemCount = 0;
        bool[] memory itemFound = new bool[](1000); // Assuming max 1000 items

        for (uint256 i = 0; i < allActiveListings.length; i++) {
            if (
                allActiveListings[i].isActive &&
                allActiveListings[i].expirationTime > block.timestamp &&
                !itemFound[allActiveListings[i].itemId]
            ) {
                itemFound[allActiveListings[i].itemId] = true;
                uniqueItemCount++;
            }
        }

        return uniqueItemCount;
    }

    /**
     * @dev Lấy thông tin chi tiết của một item cụ thể trên flea market
     * @param _itemId ID của item
     * @return bestPrice Giá tốt nhất
     * @return totalQuantity Tổng số lượng có sẵn
     * @return totalListings Tổng số listing
     * @return averagePrice Giá trung bình (weighted)
     */
    function getItemMarketInfo(
        uint256 _itemId
    )
        external
        view
        returns (
            uint256 bestPrice,
            uint256 totalQuantity,
            uint256 totalListings,
            uint256 averagePrice
        )
    {
        MarketListing[] memory allActiveListings = fleaMarketProxy
            .getActiveListings();

        bestPrice = type(uint256).max;
        uint256 totalPrice = 0;

        for (uint256 i = 0; i < allActiveListings.length; i++) {
            if (
                allActiveListings[i].itemId == _itemId &&
                allActiveListings[i].isActive &&
                allActiveListings[i].expirationTime > block.timestamp
            ) {
                if (allActiveListings[i].price < bestPrice) {
                    bestPrice = allActiveListings[i].price;
                }
                totalQuantity += allActiveListings[i].quantity;
                totalPrice +=
                    allActiveListings[i].price *
                    allActiveListings[i].quantity;
                totalListings++;
            }
        }

        bestPrice = bestPrice == type(uint256).max ? 0 : bestPrice;
        averagePrice = totalQuantity > 0 ? totalPrice / totalQuantity : 0;
    }

    /**
     * @dev Lấy danh sách chi tiết tất cả listing của một player đối với một item cụ thể
     * @param _player Địa chỉ người chơi
     * @param _itemId ID của item
     * @return playerItemListings Mảng các MarketListing của player cho item này
     */
    function getPlayerItemListings(
        address _player,
        uint256 _itemId
    ) external view returns (MarketListing[] memory playerItemListings) {
        MarketListing[] memory allPlayerListings = fleaMarketProxy
            .getListingsBySeller(_player);

        // Count listings for this specific item
        uint256 count = 0;
        for (uint256 i = 0; i < allPlayerListings.length; i++) {
            if (allPlayerListings[i].itemId == _itemId) {
                count++;
            }
        }

        // Handle edge cases
        if (count == 0) {
            playerItemListings = new MarketListing[](0);
            return playerItemListings;
        }

        // Create filtered array
        playerItemListings = new MarketListing[](count);
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < allPlayerListings.length; i++) {
            if (allPlayerListings[i].itemId == _itemId) {
                playerItemListings[resultIndex] = allPlayerListings[i];
                resultIndex++;
            }
        }

        return playerItemListings;
    }
}
