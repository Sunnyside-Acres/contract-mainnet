// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CraftingIngredient
 * @notice Struct representing a required ingredient for crafting
 */
struct CraftingIngredient {
    uint256 itemId; /// ID of the required item
    uint256 quantity; /// Required quantity
}

/**
 * @title CraftingRecipe
 * @notice Struct representing a crafting recipe
 */
struct CraftingRecipe {
    uint256 id; /// Unique recipe ID
    uint256 resultItemId; /// ID of the crafted item
    uint256 resultQuantity; /// Quantity of items crafted
    uint256 successRate; /// Success rate (0-100)
    uint256 sunlightCost; /// Sunlight currency cost
    uint256 sunnyCost; /// Sunny currency cost
    CraftingIngredient[] ingredients; /// List of required ingredients
    bool isActive; /// Whether recipe is active
    uint256 minPlayerLevel; /// Minimum player level required
}

/**
 * @title CraftingHistory
 * @notice Struct representing a crafting history record
 */
struct CraftingHistory {
    address player; /// Address of the player
    uint256 recipeId; /// Recipe ID used
    uint256 resultItemId; /// ID of resulting item
    uint256 resultQuantity; /// Quantity of resulting items
    bool isSuccess; /// Whether crafting was successful
    uint256 timestamp; /// Timestamp of crafting
    uint256 sunlightSpent; /// Sunlight spent
    uint256 sunnySpent; /// Sunny spent
}
