// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/ICrafting.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IPlayer.sol";
import "../../struct/Crafting.sol";
import "../../struct/Inventory.sol";
import "../../struct/Player.sol";

/**
 * @title CraftingLogic
 * @dev Logic contract cho hệ thống Crafting - cho phép người chơi tạo item từ nguyên liệu
 *
 * Tính năng chính:
 * - Tạo và quản lý công thức crafting
 * - Craft item với tỉ lệ thành công
 * - Quản lý nguyên liệu và chi phí (sunlight, sunny)
 * - Lịch sử crafting và thống kê
 * - Kiểm tra điều kiện crafting
 */
contract CraftingLogic {
    IWorld public world;
    ICraftingComponent public craftingProxy;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    IPlayerComponent public playerProxy;

    // ============ EVENTS ============

    event CraftingCompleted(
        address indexed player,
        uint256 indexed recipeId,
        uint256 resultItemId,
        uint256 resultQuantity,
        bool isSuccess
    );

    event RecipeCreated(
        uint256 indexed recipeId,
        uint256 indexed resultItemId,
        uint256 successRate,
        uint256 sunlightCost,
        uint256 sunnyCost
    );

    event RecipeUpdated(
        uint256 indexed recipeId,
        uint256 successRate,
        uint256 sunlightCost,
        uint256 sunnyCost
    );

    event RecipeDeleted(uint256 indexed recipeId);

    event RecipeStatusChanged(uint256 indexed recipeId, bool isActive);

    // ============ MODIFIERS ============

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }


    modifier onlyInternal() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "Only registered logic can call this function"
        );
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _world,
        address _craftingProxy,
        address _inventoryProxy,
        address _itemProxy,
        address _playerProxy
    ) {
        world = IWorld(_world);
        craftingProxy = ICraftingComponent(_craftingProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
        playerProxy = IPlayerComponent(_playerProxy);
    }

    // ============ WRITE FUNCTIONS (EXTERNAL) ============

    /**
     * @dev Tạo công thức crafting mới (chỉ admin)
     * @param _resultItemId ID của item kết quả
     * @param _resultQuantity Số lượng item kết quả
     * @param _successRate Tỉ lệ thành công (0-10000, 10000 = 100%)
     * @param _sunlightCost Chi phí sunlight
     * @param _sunnyCost Chi phí sunny
     * @param _ingredients Mảng nguyên liệu cần thiết
     * @param _minPlayerLevel Level tối thiểu của người chơi
     * @return recipeId ID của công thức mới tạo
     *
     * Quy trình:
     * 1. Validate result item và ingredients tồn tại
     * 2. Kiểm tra số lượng nguyên liệu > 0
     * 3. Tạo công thức trong component
     * 4. Emit event RecipeCreated
     */
    function createRecipe(
        uint256 _resultItemId,
        uint256 _resultQuantity,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external onlyAdmin returns (uint256) {
        // Validate result item exists
        require(itemProxy.exists(_resultItemId), "Result item does not exist");

        // Validate ingredients exist
        for (uint256 i = 0; i < _ingredients.length; i++) {
            require(
                itemProxy.exists(_ingredients[i].itemId),
                "Ingredient item does not exist"
            );
            require(
                _ingredients[i].quantity > 0,
                "Ingredient quantity must be greater than 0"
            );
        }

        uint256 recipeId = craftingProxy.createRecipe(
            _resultItemId,
            _resultQuantity,
            _successRate,
            _sunlightCost,
            _sunnyCost,
            _ingredients,
            _minPlayerLevel
        );

        emit RecipeCreated(
            recipeId,
            _resultItemId,
            _successRate,
            _sunlightCost,
            _sunnyCost
        );
        return recipeId;
    }

    /**
     * @dev Craft item tức thì (người chơi gọi)
     * @param _recipeId ID của công thức muốn craft
     *
     * Quy trình:
     * 1. Kiểm tra công thức tồn tại và đang hoạt động
     * 2. Validate level người chơi và tài nguyên
     * 3. Kiểm tra đủ nguyên liệu trong inventory
     * 4. Trừ sunlight, sunny và nguyên liệu
     * 5. Xác định thành công dựa trên tỉ lệ
     * 6. Thêm item kết quả nếu thành công
     * 7. Ghi lịch sử crafting
     */
    function craftItem(uint256 _recipeId) external {
        address player = msg.sender;

        // Check if recipe exists and is active
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");
        CraftingRecipe memory recipe = craftingProxy.getRecipe(_recipeId);
        require(recipe.isActive, "Recipe is not active");

        // Check if player exists and meets level requirement
        Player memory playerData = playerProxy.getPlayer(player);
        require(playerData.level > 0, "Player not initialized");
        require(
            playerData.level >= recipe.minPlayerLevel,
            "Player level too low"
        );

        // Check if player has enough sunlight and sunny
        require(
            playerData.sunlight >= recipe.sunlightCost,
            "Not enough sunlight"
        );
        require(playerData.sunny >= recipe.sunnyCost, "Not enough sunny");

        // Check if player has all required ingredients
        for (uint256 i = 0; i < recipe.ingredients.length; i++) {
            CraftingIngredient memory ingredient = recipe.ingredients[i];
            InventoryItem memory playerItem = inventoryProxy.getItem(
                player,
                ingredient.itemId
            );
            require(
                playerItem.quantity >= ingredient.quantity,
                "Not enough ingredients"
            );
        }

        // Deduct sunlight and sunny
        if (recipe.sunlightCost > 0) {
            playerProxy.subtractSunlight(player, recipe.sunlightCost);
        }
        if (recipe.sunnyCost > 0) {
            playerProxy.subtractSunny(player, recipe.sunnyCost);
        }

        // Deduct ingredients
        for (uint256 i = 0; i < recipe.ingredients.length; i++) {
            CraftingIngredient memory ingredient = recipe.ingredients[i];
            InventoryItem memory playerItem = inventoryProxy.getItem(
                player,
                ingredient.itemId
            );

            uint256 newQuantity = playerItem.quantity - ingredient.quantity;
            inventoryProxy.setItem(
                player,
                ingredient.itemId,
                newQuantity,
                playerItem.durability,
                playerItem.expiration
            );
        }

        // Determine success based on success rate
        bool isSuccess = _determineCraftingSuccess(recipe.successRate);

        // Add to crafting history
        craftingProxy.addCraftingHistory(
            player,
            _recipeId,
            recipe.resultItemId,
            isSuccess ? recipe.resultQuantity : 0,
            isSuccess,
            recipe.sunlightCost,
            recipe.sunnyCost
        );

        // If successful, add result item to player's inventory
        if (isSuccess) {
            InventoryItem memory existingItem = inventoryProxy.getItem(
                player,
                recipe.resultItemId
            );
            uint256 newQuantity = existingItem.quantity + recipe.resultQuantity;

            // Set default durability and expiration for crafted items
            uint256 durability = 100;
            uint256 expiration = 0;

            inventoryProxy.setItem(
                player,
                recipe.resultItemId,
                newQuantity,
                durability,
                expiration
            );
        }

        emit CraftingCompleted(
            player,
            _recipeId,
            recipe.resultItemId,
            isSuccess ? recipe.resultQuantity : 0,
            isSuccess
        );
    }

    /**
     * @dev Cập nhật công thức (chỉ admin)
     * @param _recipeId ID của công thức muốn cập nhật
     * @param _successRate Tỉ lệ thành công mới
     * @param _sunlightCost Chi phí sunlight mới
     * @param _sunnyCost Chi phí sunny mới
     * @param _ingredients Nguyên liệu mới
     * @param _minPlayerLevel Level tối thiểu mới
     *
     * Quy trình:
     * 1. Kiểm tra công thức tồn tại
     * 2. Validate nguyên liệu mới
     * 3. Cập nhật thông tin công thức
     * 4. Emit event RecipeUpdated
     */
    function updateRecipe(
        uint256 _recipeId,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external onlyAdmin {
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");

        // Validate ingredients exist
        for (uint256 i = 0; i < _ingredients.length; i++) {
            require(
                itemProxy.exists(_ingredients[i].itemId),
                "Ingredient item does not exist"
            );
            require(
                _ingredients[i].quantity > 0,
                "Ingredient quantity must be greater than 0"
            );
        }

        craftingProxy.updateRecipe(
            _recipeId,
            _successRate,
            _sunlightCost,
            _sunnyCost,
            _ingredients,
            _minPlayerLevel
        );

        emit RecipeUpdated(_recipeId, _successRate, _sunlightCost, _sunnyCost);
    }

    /**
     * @dev Bật/tắt công thức (chỉ admin)
     * @param _recipeId ID của công thức
     * @param _isActive Trạng thái hoạt động mới
     *
     * Quy trình:
     * 1. Kiểm tra công thức tồn tại
     * 2. Cập nhật trạng thái hoạt động
     * 3. Emit event RecipeStatusChanged
     */
    function setRecipeActive(
        uint256 _recipeId,
        bool _isActive
    ) external onlyAdmin {
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");
        craftingProxy.setRecipeActive(_recipeId, _isActive);

        emit RecipeStatusChanged(_recipeId, _isActive);
    }

    /**
     * @dev Xóa công thức (chỉ admin)
     * @param _recipeId ID của công thức muốn xóa
     *
     * Quy trình:
     * 1. Kiểm tra công thức tồn tại
     * 2. Xóa công thức khỏi hệ thống
     * 3. Emit event RecipeDeleted
     */
    function deleteRecipe(uint256 _recipeId) external onlyAdmin {
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");
        craftingProxy.deleteRecipe(_recipeId);

        emit RecipeDeleted(_recipeId);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Kiểm tra xem crafting có thành công hay không dựa trên tỉ lệ
     * @param _successRate Tỉ lệ thành công (0-10000)
     * @return bool Kết quả thành công hay thất bại
     *
     * Logic:
     * - 10000 = 100% thành công
     * - 0 = 0% thành công
     * - Sử dụng random number để xác định kết quả
     */
    function _determineCraftingSuccess(
        uint256 _successRate
    ) internal view returns (bool) {
        require(_successRate <= 10000, "Invalid success rate");

        if (_successRate == 10000) return true;
        if (_successRate == 0) return false;

        // Generate random number between 0 and 9999
        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    block.number
                )
            )
        ) % 10000;

        return randomNumber < _successRate;
    }

    // ============ READ FUNCTIONS (EXTERNAL VIEW) ============

    /**
     * @dev Lấy tất cả công thức crafting
     * @return Mảng tất cả CraftingRecipe
     */
    function getAllRecipes() external view returns (CraftingRecipe[] memory) {
        return craftingProxy.getAllRecipes();
    }

    /**
     * @dev Lấy các công thức đang hoạt động
     * @return Mảng các CraftingRecipe đang hoạt động
     */
    function getActiveRecipes()
        external
        view
        returns (CraftingRecipe[] memory)
    {
        return craftingProxy.getActiveRecipes();
    }

    /**
     * @dev Lấy lịch sử crafting của người chơi
     * @param _player Địa chỉ người chơi
     * @return Mảng CraftingHistory của người chơi
     */
    function getPlayerCraftingHistory(
        address _player
    ) external view returns (CraftingHistory[] memory) {
        return craftingProxy.getPlayerCraftingHistory(_player);
    }

    /**
     * @dev Kiểm tra xem người chơi có thể craft công thức này không
     * @param _player Địa chỉ người chơi
     * @param _recipeId ID của công thức
     * @return (bool success, string message) Kết quả kiểm tra
     *
     * Kiểm tra:
     * 1. Công thức tồn tại và đang hoạt động
     * 2. Người chơi đã khởi tạo
     * 3. Level người chơi đủ yêu cầu
     * 4. Đủ sunlight và sunny
     * 5. Đủ nguyên liệu trong inventory
     */
    function canCraftRecipe(
        address _player,
        uint256 _recipeId
    ) external view returns (bool, string memory) {
        if (!craftingProxy.exists(_recipeId)) {
            return (false, "Recipe does not exist");
        }

        CraftingRecipe memory recipe = craftingProxy.getRecipe(_recipeId);
        if (!recipe.isActive) {
            return (false, "Recipe is not active");
        }

        Player memory playerData = playerProxy.getPlayer(_player);
        if (playerData.level == 0) {
            return (false, "Player not initialized");
        }
        if (playerData.level < recipe.minPlayerLevel) {
            return (false, "Player level too low");
        }

        if (playerData.sunlight < recipe.sunlightCost) {
            return (false, "Not enough sunlight");
        }
        if (playerData.sunny < recipe.sunnyCost) {
            return (false, "Not enough sunny");
        }

        for (uint256 i = 0; i < recipe.ingredients.length; i++) {
            CraftingIngredient memory ingredient = recipe.ingredients[i];
            InventoryItem memory playerItem = inventoryProxy.getItem(
                _player,
                ingredient.itemId
            );
            if (playerItem.quantity < ingredient.quantity) {
                return (false, "Not enough ingredients");
            }
        }

        return (true, "Can craft");
    }

    /**
     * @dev Lấy thông tin chi tiết về công thức
     * @param _recipeId ID của công thức
     * @return recipe Thông tin chi tiết của công thức
     */
    function getRecipeDetails(
        uint256 _recipeId
    ) external view returns (CraftingRecipe memory recipe) {
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");
        return craftingProxy.getRecipe(_recipeId);
    }

    /**
     * @dev Lấy thống kê crafting của người chơi
     * @param _player Địa chỉ người chơi
     * @return totalCrafts Tổng số lần craft
     * @return successfulCrafts Số lần craft thành công
     * @return successRate Tỉ lệ thành công (0-10000)
     */
    function getPlayerCraftingStats(
        address _player
    )
        external
        view
        returns (
            uint256 totalCrafts,
            uint256 successfulCrafts,
            uint256 successRate
        )
    {
        CraftingHistory[] memory history = craftingProxy
            .getPlayerCraftingHistory(_player);

        totalCrafts = history.length;

        for (uint256 i = 0; i < history.length; i++) {
            if (history[i].isSuccess) {
                successfulCrafts++;
            }
        }

        if (totalCrafts > 0) {
            successRate = (successfulCrafts * 10000) / totalCrafts;
        }
    }

    /**
     * @dev Lấy danh sách công thức mà người chơi có thể craft
     * @param _player Địa chỉ người chơi
     * @return Mảng các công thức có thể craft
     */
    function getAvailableRecipesForPlayer(
        address _player
    ) external view returns (CraftingRecipe[] memory) {
        CraftingRecipe[] memory allRecipes = craftingProxy.getActiveRecipes();

        // Count available recipes
        uint256 count = 0;
        for (uint256 i = 0; i < allRecipes.length; i++) {
            (bool canCraft, ) = this.canCraftRecipe(_player, allRecipes[i].id);
            if (canCraft) {
                count++;
            }
        }

        // Create filtered array
        CraftingRecipe[] memory availableRecipes = new CraftingRecipe[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allRecipes.length; i++) {
            (bool canCraft, ) = this.canCraftRecipe(_player, allRecipes[i].id);
            if (canCraft) {
                availableRecipes[index] = allRecipes[i];
                index++;
            }
        }

        return availableRecipes;
    }

    /**
     * @dev Lấy thống kê tổng quan về hệ thống crafting
     * @return totalRecipes Tổng số công thức
     * @return activeRecipes Số công thức đang hoạt động
     * @return totalCrafts Tổng số lần craft
     * @return totalSuccessfulCrafts Tổng số lần craft thành công
     */
    function getCraftingSystemStats()
        external
        view
        returns (
            uint256 totalRecipes,
            uint256 activeRecipes,
            uint256 totalCrafts,
            uint256 totalSuccessfulCrafts
        )
    {
        CraftingRecipe[] memory allRecipes = craftingProxy.getAllRecipes();
        totalRecipes = allRecipes.length;

        for (uint256 i = 0; i < allRecipes.length; i++) {
            if (allRecipes[i].isActive) {
                activeRecipes++;
            }
        }

        // Note: This would require additional tracking in the component
        // For now, returning 0 for total crafts stats
        totalCrafts = 0;
        totalSuccessfulCrafts = 0;
    }
}
