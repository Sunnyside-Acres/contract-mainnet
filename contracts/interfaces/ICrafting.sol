// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Crafting.sol";

interface ICraftingComponent {
    function createRecipe(
        uint256 _resultItemId,
        uint256 _resultQuantity,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external returns (uint256);

    function craftItem(
        uint256 _recipeId,
        uint256 _rangeStart,
        uint256 _rangeEnd
    ) external;

    function getRecipe(
        uint256 _recipeId
    ) external view returns (CraftingRecipe memory);

    function getAllRecipes() external view returns (CraftingRecipe[] memory);

    function getActiveRecipes() external view returns (CraftingRecipe[] memory);

    function updateRecipe(
        uint256 _recipeId,
        uint256 _successRate,
        uint256 _sunlightCost,
        uint256 _sunnyCost,
        CraftingIngredient[] calldata _ingredients,
        uint256 _minPlayerLevel
    ) external;

    function setRecipeActive(uint256 _recipeId, bool _isActive) external;

    function deleteRecipe(uint256 _recipeId) external;

    function addCraftingHistory(
        address _player,
        uint256 _recipeId,
        uint256 _resultItemId,
        uint256 _resultQuantity,
        bool _isSuccess,
        uint256 _sunlightSpent,
        uint256 _sunnySpent
    ) external;

    function getPlayerCraftingHistory(
        address _player
    ) external view returns (CraftingHistory[] memory);

    function getRecipeCount() external view returns (uint256);

    function exists(uint256 _recipeId) external view returns (bool);
}
