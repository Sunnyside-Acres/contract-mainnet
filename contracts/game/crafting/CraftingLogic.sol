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
 * @author RYG.Labs
 * @notice Logic contract for the Crafting system - allows players to create items from materials
 * @dev Implements the core crafting mechanics for the game
 *
 * Key Features:
 * - Create and manage crafting recipes
 * - Craft items with success rate based on user-selected range
 * - Manage ingredients and costs (sunlight, sunny)
 * - Crafting history and statistics
 * - Check crafting conditions
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
        bool isSuccess,
        uint256 userRangeStart,
        uint256 userRangeEnd,
        uint256 randomNumber
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
     * @notice Create a new crafting recipe (admin only)
     * @dev Validates all inputs before creating the recipe
     * @param _resultItemId The ID of the resulting item
     * @param _resultQuantity The quantity of the resulting item
     * @param _successRate The success rate (0-99, represents number of units in range)
     * @param _sunlightCost The sunlight cost for crafting
     * @param _sunnyCost The sunny token cost for crafting
     * @param _ingredients Array of required ingredients
     * @param _minPlayerLevel Minimum player level required
     * @return recipeId The ID of the newly created recipe
     *
     * Process:
     * 1. Validate that result item and ingredients exist
     * 2. Check that ingredient quantities > 0
     * 3. Create recipe in component
     * 4. Emit RecipeCreated event
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

        // Validate success rate (0-99)
        require(_successRate <= 99, "Success rate must be 0-99");

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
     * @notice Craft an item with user-selected number range
     * @dev Players call this function to attempt crafting. Success is determined by whether a random number falls within the selected range
     * @param _recipeId The ID of the recipe to craft
     * @param _rangeStart The start point of the number range (0-99)
     * @param _rangeEnd The end point of the number range (0-99)
     *
     * Process:
     * 1. Check that recipe exists and is active
     * 2. Validate player level and resources
     * 3. Check that player has all required ingredients
     * 4. Validate user-selected range
     * 5. Deduct sunlight, sunny, and ingredients
     * 6. Generate random number 0-100 and determine success
     * 7. Add result item if successful
     * 8. Record crafting history
     */
    function craftItem(
        uint256 _recipeId,
        uint256 _rangeStart,
        uint256 _rangeEnd
    ) external {
        address player = msg.sender;

        // Check if recipe exists and is active
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");
        CraftingRecipe memory recipe = craftingProxy.getRecipe(_recipeId);
        require(recipe.isActive, "Recipe is not active");

        // Validate range - supports both normal and wrap-around ranges (start > end)
        require(_rangeStart <= 99, "Range start must be 0-99");
        require(_rangeEnd <= 99, "Range end must be 0-99");

        // Calculate range size (supports both normal and wrap-around ranges)
        uint256 rangeSize;
        if (_rangeStart <= _rangeEnd) {
            // Normal range: 5 -> 10 (size = 6)
            rangeSize = _rangeEnd - _rangeStart + 1;
        } else {
            // Wrap-around range: 80 -> 30 (size = 51: 20 numbers from 80-99 + 31 numbers from 0-30)
            rangeSize = (99 - _rangeStart + 1) + (_rangeEnd + 1);
        }

        require(
            rangeSize == recipe.successRate,
            "Range size must match success rate"
        );

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

        // Deduct ingredients (always deducted regardless of success or failure)
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

        // Generate random number and determine success
        uint256 randomNumber = _generateRandomNumber(0, 99);
        bool isSuccess = _isNumberInRange(randomNumber, _rangeStart, _rangeEnd);

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
            isSuccess,
            _rangeStart,
            _rangeEnd,
            randomNumber
        );
    }

    /**
     * @notice Update an existing recipe (admin only)
     * @dev Validates all inputs before updating the recipe
     * @param _recipeId The ID of the recipe to update
     * @param _successRate The new success rate (0-99)
     * @param _sunlightCost The new sunlight cost
     * @param _sunnyCost The new sunny token cost
     * @param _ingredients The new ingredients array
     * @param _minPlayerLevel The new minimum player level
     *
     * Process:
     * 1. Check that recipe exists
     * 2. Validate new ingredients
     * 3. Update recipe information
     * 4. Emit RecipeUpdated event
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

        // Validate success rate (0-99)
        require(_successRate <= 99, "Success rate must be 0-99");

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
     * @notice Enable or disable a recipe (admin only)
     * @dev Changes the active status of a recipe
     * @param _recipeId The ID of the recipe
     * @param _isActive The new active status
     *
     * Process:
     * 1. Check that recipe exists
     * 2. Update active status
     * 3. Emit RecipeStatusChanged event
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
     * @notice Delete a recipe (admin only)
     * @dev Removes a recipe from the system
     * @param _recipeId The ID of the recipe to delete
     *
     * Process:
     * 1. Check that recipe exists
     * 2. Remove recipe from system
     * 3. Emit RecipeDeleted event
     */
    function deleteRecipe(uint256 _recipeId) external onlyAdmin {
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");
        craftingProxy.deleteRecipe(_recipeId);

        emit RecipeDeleted(_recipeId);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Generate a random number within min-max range
     * @param _min The minimum value
     * @param _max The maximum value
     * @return A random number within the range
     */
    function _generateRandomNumber(
        uint256 _min,
        uint256 _max
    ) internal view returns (uint256) {
        require(_max >= _min, "Invalid range");

        uint256 range = _max - _min + 1;
        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    msg.sender,
                    block.number,
                    blockhash(block.number - 1),
                    gasleft()
                )
            )
        ) % range;

        return randomNumber + _min;
    }

    /**
     * @dev Check if a number is within a range (supports both normal and wrap-around ranges)
     * @param _number The number to check
     * @param _rangeStart The start of the range
     * @param _rangeEnd The end of the range
     * @return bool True if the number is within the range
     *
     * Examples:
     * - Normal range: 5-10 -> number 7 returns true
     * - Wrap-around range: 80-30 -> numbers 2, 75, 99 return true
     */
    function _isNumberInRange(
        uint256 _number,
        uint256 _rangeStart,
        uint256 _rangeEnd
    ) internal pure returns (bool) {
        if (_rangeStart <= _rangeEnd) {
            // Normal range: 5 -> 10
            return _number >= _rangeStart && _number <= _rangeEnd;
        } else {
            // Wrap-around range: 80 -> 30 (includes 80-99 and 0-30)
            return _number >= _rangeStart || _number <= _rangeEnd;
        }
    }

    // ============ READ FUNCTIONS (EXTERNAL VIEW) ============

    /**
     * @notice Get all crafting recipes
     * @return Array of all CraftingRecipe structs
     */
    function getAllRecipes() external view returns (CraftingRecipe[] memory) {
        return craftingProxy.getAllRecipes();
    }

    /**
     * @notice Get all active crafting recipes
     * @return Array of active CraftingRecipe structs
     */
    function getActiveRecipes()
        external
        view
        returns (CraftingRecipe[] memory)
    {
        return craftingProxy.getActiveRecipes();
    }

    /**
     * @notice Get a player's crafting history
     * @param _player The player's address
     * @return Array of CraftingHistory structs for the player
     */
    function getPlayerCraftingHistory(
        address _player
    ) external view returns (CraftingHistory[] memory) {
        return craftingProxy.getPlayerCraftingHistory(_player);
    }

    /**
     * @notice Check if a player can craft a recipe
     * @dev Performs comprehensive validation of player's ability to craft
     * @param _player The player's address
     * @param _recipeId The ID of the recipe
     * @return success True if player can craft
     * @return message Description of the result
     *
     * Checks:
     * 1. Recipe exists and is active
     * 2. Player is initialized
     * 3. Player level meets requirement
     * 4. Sufficient sunlight and sunny
     * 5. Sufficient ingredients in inventory
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
     * @notice Get detailed information about a recipe
     * @param _recipeId The ID of the recipe
     * @return recipe The detailed recipe information
     */
    function getRecipeDetails(
        uint256 _recipeId
    ) external view returns (CraftingRecipe memory recipe) {
        require(craftingProxy.exists(_recipeId), "Recipe does not exist");
        return craftingProxy.getRecipe(_recipeId);
    }

    /**
     * @notice Get a player's crafting statistics
     * @param _player The player's address
     * @return totalCrafts Total number of crafting attempts
     * @return successfulCrafts Number of successful crafts
     * @return successRate Success rate (0-10000, representing percentage with 2 decimal places)
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
     * @notice Get list of recipes that a player can craft
     * @param _player The player's address
     * @return Array of recipes that the player can currently craft
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
     * @notice Get overall crafting system statistics
     * @return totalRecipes Total number of recipes
     * @return activeRecipes Number of active recipes
     * @return totalCrafts Total number of crafting attempts (not currently tracked)
     * @return totalSuccessfulCrafts Total number of successful crafts (not currently tracked)
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
