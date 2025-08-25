export interface CraftingIngredient {
    itemId: number;
    quantity: number;
}

export interface CraftingRecipe {
    id: number;
    resultItemId: number;
    resultQuantity: number;
    successRate: number;
    sunlightCost: number;
    sunnyCost: number;
    ingredients: CraftingIngredient[];
    isActive: boolean;
    minPlayerLevel: number;
}

export interface CraftingHistory {
    player: string;
    recipeId: number;
    resultItemId: number;
    resultQuantity: number;
    isSuccess: boolean;
    timestamp: number;
    sunlightSpent: number;
    sunnySpent: number;
}

export interface CraftingStats {
    totalCrafts: number;
    successfulCrafts: number;
    successRate: number;
}

export interface CraftingSystemStats {
    totalRecipes: number;
    activeRecipes: number;
    totalCrafts: number;
    totalSuccessfulCrafts: number;
}

export interface RecipeFormData {
    resultItemId: number;
    resultQuantity: number;
    successRate: number;
    sunlightCost: number;
    sunnyCost: number;
    ingredients: CraftingIngredient[];
    minPlayerLevel: number;
}

export interface UpdateRecipeFormData {
    successRate: number;
    sunlightCost: number;
    sunnyCost: number;
    ingredients: CraftingIngredient[];
    minPlayerLevel: number;
}
