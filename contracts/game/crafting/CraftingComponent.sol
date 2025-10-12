// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Crafting.sol";

/**
 * @title CraftingComponent
 * @author RYG.Labs
 * @notice Data storage contract for the Crafting system
 * @dev Stores all crafting recipes and player crafting histories
 */
contract CraftingComponent {
    /// @notice Address of the World contract for access control
    address public world;

    /// @notice Address of the admin
    address public admin;

    /// @notice Address of the implementation logic contract
    address public implementation;

    /// @notice Mapping from recipe ID to CraftingRecipe
    mapping(uint256 => CraftingRecipe) public recipes;

    /// @notice Mapping from player address to crafting history
    mapping(address => CraftingHistory[]) public craftingHistories;

    /// @notice Total number of recipes created
    uint256 public recipeCount;

    /// @notice Array of all recipe IDs
    uint256[] public allRecipeIds;

    /**
     * @notice Create a new crafting recipe
     * @param _resultItemId The ID of the resulting item
     * @param _resultQuantity The quantity of the resulting item
     * @param _successRate The success rate (0-10000, representing 0-100%)
     * @param _sunlightCost The sunlight cost for crafting
     * @param _sunnyCost The sunny token cost for crafting
     * @param _ingredients Array of required ingredients
     * @param _minPlayerLevel Minimum player level required
     * @return The ID of the newly created recipe
     */
    function createRecipe(
        uint256 _resultItemId,
        uint256 _resultQuantity,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external returns (uint256) {
        require(_successRate <= 10000, "Success rate cannot exceed 100%");
        require(_resultQuantity > 0, "Result quantity must be greater than 0");
        require(_ingredients.length > 0, "Must have at least one ingredient");

        recipeCount++;
        uint256 recipeId = recipeCount;

        CraftingRecipe storage recipe = recipes[recipeId];
        recipe.id = recipeId;
        recipe.resultItemId = _resultItemId;
        recipe.resultQuantity = _resultQuantity;
        recipe.successRate = _successRate;
        recipe.sunlightCost = _sunlightCost;
        recipe.sunnyCost = _sunnyCost;
        recipe.minPlayerLevel = _minPlayerLevel;
        recipe.isActive = true;

        // Copy ingredients
        for (uint256 i = 0; i < _ingredients.length; i++) {
            recipe.ingredients.push(_ingredients[i]);
        }

        allRecipeIds.push(recipeId);

        return recipeId;
    }

    /**
     * @notice Get a recipe by ID
     * @param _recipeId The ID of the recipe
     * @return The CraftingRecipe struct
     */
    function getRecipe(
        uint256 _recipeId
    ) external view returns (CraftingRecipe memory) {
        require(recipes[_recipeId].id != 0, "Recipe does not exist");
        return recipes[_recipeId];
    }

    /**
     * @notice Get all recipes
     * @return Array of all CraftingRecipe structs
     */
    function getAllRecipes() external view returns (CraftingRecipe[] memory) {
        CraftingRecipe[] memory allRecipes = new CraftingRecipe[](
            allRecipeIds.length
        );

        for (uint256 i = 0; i < allRecipeIds.length; i++) {
            allRecipes[i] = recipes[allRecipeIds[i]];
        }

        return allRecipes;
    }

    /**
     * @notice Get all active recipes
     * @return Array of active CraftingRecipe structs
     */
    function getActiveRecipes()
        external
        view
        returns (CraftingRecipe[] memory)
    {
        uint256 activeCount = 0;

        // Count active recipes
        for (uint256 i = 0; i < allRecipeIds.length; i++) {
            if (recipes[allRecipeIds[i]].isActive) {
                activeCount++;
            }
        }

        CraftingRecipe[] memory activeRecipes = new CraftingRecipe[](
            activeCount
        );
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < allRecipeIds.length; i++) {
            if (recipes[allRecipeIds[i]].isActive) {
                activeRecipes[currentIndex] = recipes[allRecipeIds[i]];
                currentIndex++;
            }
        }

        return activeRecipes;
    }

    /**
     * @notice Update an existing recipe
     * @param _recipeId The ID of the recipe to update
     * @param _successRate The new success rate
     * @param _sunlightCost The new sunlight cost
     * @param _sunnyCost The new sunny token cost
     * @param _ingredients The new ingredients array
     * @param _minPlayerLevel The new minimum player level
     */
    function updateRecipe(
        uint256 _recipeId,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external {
        require(recipes[_recipeId].id != 0, "Recipe does not exist");
        require(_successRate <= 10000, "Success rate cannot exceed 100%");
        require(_ingredients.length > 0, "Must have at least one ingredient");

        CraftingRecipe storage recipe = recipes[_recipeId];
        recipe.successRate = _successRate;
        recipe.sunlightCost = _sunlightCost;
        recipe.sunnyCost = _sunnyCost;
        recipe.minPlayerLevel = _minPlayerLevel;

        // Clear existing ingredients and add new ones
        delete recipe.ingredients;
        for (uint256 i = 0; i < _ingredients.length; i++) {
            recipe.ingredients.push(_ingredients[i]);
        }
    }

    /**
     * @notice Enable or disable a recipe
     * @param _recipeId The ID of the recipe
     * @param _isActive The new active status
     */
    function setRecipeActive(uint256 _recipeId, bool _isActive) external {
        require(recipes[_recipeId].id != 0, "Recipe does not exist");
        recipes[_recipeId].isActive = _isActive;
    }

    /**
     * @notice Delete a recipe
     * @param _recipeId The ID of the recipe to delete
     */
    function deleteRecipe(uint256 _recipeId) external {
        require(recipes[_recipeId].id != 0, "Recipe does not exist");
        delete recipes[_recipeId];

        // Remove from allRecipeIds array
        for (uint256 i = 0; i < allRecipeIds.length; i++) {
            if (allRecipeIds[i] == _recipeId) {
                allRecipeIds[i] = allRecipeIds[allRecipeIds.length - 1];
                allRecipeIds.pop();
                break;
            }
        }
    }

    /**
     * @notice Add a crafting history entry for a player
     * @param _player The player's address
     * @param _recipeId The ID of the recipe used
     * @param _resultItemId The ID of the result item
     * @param _resultQuantity The quantity of the result item
     * @param _isSuccess Whether the crafting was successful
     * @param _sunlightSpent The amount of sunlight spent
     * @param _sunnySpent The amount of sunny tokens spent
     */
    function addCraftingHistory(
        address _player,
        uint256 _recipeId,
        uint256 _resultItemId,
        uint256 _resultQuantity,
        bool _isSuccess,
        uint256 _sunlightSpent,
        uint256 _sunnySpent
    ) external {
        craftingHistories[_player].push(
            CraftingHistory({
                player: _player,
                recipeId: _recipeId,
                resultItemId: _resultItemId,
                resultQuantity: _resultQuantity,
                isSuccess: _isSuccess,
                timestamp: block.timestamp,
                sunlightSpent: _sunlightSpent,
                sunnySpent: _sunnySpent
            })
        );
    }

    /**
     * @notice Get a player's crafting history
     * @param _player The player's address
     * @return Array of CraftingHistory structs for the player
     */
    function getPlayerCraftingHistory(
        address _player
    ) external view returns (CraftingHistory[] memory) {
        return craftingHistories[_player];
    }

    /**
     * @notice Get the total number of recipes
     * @return The total recipe count
     */
    function getRecipeCount() external view returns (uint256) {
        return recipeCount;
    }

    /**
     * @notice Check if a recipe exists
     * @param _recipeId The ID of the recipe
     * @return True if the recipe exists, false otherwise
     */
    function exists(uint256 _recipeId) external view returns (bool) {
        return recipes[_recipeId].id != 0;
    }
}
