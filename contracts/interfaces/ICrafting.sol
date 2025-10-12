// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Crafting.sol";

/**
 * @title ICraftingComponent
 * @notice Interface for managing item crafting recipes and crafting operations
 */
interface ICraftingComponent {
    /**
     * @notice Creates a new crafting recipe (admin only)
     * @param _resultItemId ID of the resulting item
     * @param _resultQuantity Quantity of items produced
     * @param _successRate Success rate percentage (0-100)
     * @param _sunlightCost Sunlight currency cost to craft
     * @param _sunnyCost Sunny currency cost to craft
     * @param _ingredients Array of required ingredients
     * @param _minPlayerLevel Minimum player level required
     * @return uint256 ID of the created recipe
     */
    function createRecipe(
        uint256 _resultItemId,
        uint256 _resultQuantity,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external returns (uint256);

    /**
     * @notice Crafts an item using a recipe
     * @param _recipeId ID of the recipe to use
     * @param _rangeStart Start of random range for success calculation
     * @param _rangeEnd End of random range for success calculation
     */
    function craftItem(
        uint256 _recipeId,
        uint256 _rangeStart,
        uint256 _rangeEnd
    ) external;

    /**
     * @notice Gets details of a specific recipe
     * @param _recipeId ID of the recipe
     * @return CraftingRecipe struct containing recipe details
     */
    function getRecipe(
        uint256 _recipeId
    ) external view returns (CraftingRecipe memory);

    /**
     * @notice Gets all crafting recipes
     * @return Array of all CraftingRecipe structs
     */
    function getAllRecipes() external view returns (CraftingRecipe[] memory);

    /**
     * @notice Gets all active crafting recipes
     * @return Array of active CraftingRecipe structs
     */
    function getActiveRecipes() external view returns (CraftingRecipe[] memory);

    /**
     * @notice Updates an existing recipe (admin only)
     * @param _recipeId ID of the recipe to update
     * @param _successRate New success rate percentage
     * @param _sunlightCost New sunlight cost
     * @param _sunnyCost New sunny cost
     * @param _ingredients New ingredients array
     * @param _minPlayerLevel New minimum player level
     */
    function updateRecipe(
        uint256 _recipeId,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external;

    /**
     * @notice Sets whether a recipe is active (admin only)
     * @param _recipeId ID of the recipe
     * @param _isActive Active status to set
     */
    function setRecipeActive(uint256 _recipeId, bool _isActive) external;

    /**
     * @notice Deletes a recipe (admin only)
     * @param _recipeId ID of the recipe to delete
     */
    function deleteRecipe(uint256 _recipeId) external;

    /**
     * @notice Adds a crafting history entry for a player
     * @param _player Address of the player
     * @param _recipeId ID of the recipe used
     * @param _resultItemId ID of the resulting item
     * @param _resultQuantity Quantity produced
     * @param _isSuccess Whether crafting was successful
     * @param _sunlightSpent Amount of sunlight spent
     * @param _sunnySpent Amount of sunny spent
     */
    function addCraftingHistory(
        address _player,
        uint256 _recipeId,
        uint256 _resultItemId,
        uint256 _resultQuantity,
        bool _isSuccess,
        uint256 _sunlightSpent,
        uint256 _sunnySpent
    ) external;

    /**
     * @notice Gets crafting history for a player
     * @param _player Address of the player
     * @return Array of CraftingHistory structs
     */
    function getPlayerCraftingHistory(
        address _player
    ) external view returns (CraftingHistory[] memory);

    /**
     * @notice Gets total count of recipes
     * @return uint256 Number of recipes
     */
    function getRecipeCount() external view returns (uint256);

    /**
     * @notice Checks if a recipe exists
     * @param _recipeId ID of the recipe to check
     * @return bool True if recipe exists
     */
    function exists(uint256 _recipeId) external view returns (bool);
}
