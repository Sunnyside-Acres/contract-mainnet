// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Crafting.sol";

contract CraftingComponent {
    address public world;
    address public admin;
    address public implementation;
    // Mapping từ recipe ID đến CraftingRecipe
    mapping(uint256 => CraftingRecipe) public recipes;

    // Mapping từ player address đến lịch sử crafting
    mapping(address => CraftingHistory[]) public craftingHistories;

    // Tổng số recipe
    uint256 public recipeCount;

    // Danh sách tất cả recipe IDs
    uint256[] public allRecipeIds;

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    function createRecipe(
        uint256 _resultItemId,
        uint256 _resultQuantity,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external onlyAuthorized returns (uint256) {
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

    function getRecipe(
        uint256 _recipeId
    ) external view returns (CraftingRecipe memory) {
        require(recipes[_recipeId].id != 0, "Recipe does not exist");
        return recipes[_recipeId];
    }

    function getAllRecipes() external view returns (CraftingRecipe[] memory) {
        CraftingRecipe[] memory allRecipes = new CraftingRecipe[](
            allRecipeIds.length
        );

        for (uint256 i = 0; i < allRecipeIds.length; i++) {
            allRecipes[i] = recipes[allRecipeIds[i]];
        }

        return allRecipes;
    }

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

    function updateRecipe(
        uint256 _recipeId,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external onlyAuthorized {
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

    function setRecipeActive(
        uint256 _recipeId,
        bool _isActive
    ) external onlyAuthorized {
        require(recipes[_recipeId].id != 0, "Recipe does not exist");
        recipes[_recipeId].isActive = _isActive;
    }

    function deleteRecipe(uint256 _recipeId) external onlyAuthorized {
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

    function addCraftingHistory(
        address _player,
        uint256 _recipeId,
        uint256 _resultItemId,
        uint256 _resultQuantity,
        bool _isSuccess,
        uint256 _sunlightSpent,
        uint256 _sunnySpent
    ) external onlyAuthorized {
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

    function getPlayerCraftingHistory(
        address _player
    ) external view returns (CraftingHistory[] memory) {
        return craftingHistories[_player];
    }

    function getRecipeCount() external view returns (uint256) {
        return recipeCount;
    }

    function exists(uint256 _recipeId) external view returns (bool) {
        return recipes[_recipeId].id != 0;
    }
}
