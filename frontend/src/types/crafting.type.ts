export interface CraftingIngredient {
    itemId: number
    quantity: number
}

export interface CraftingRecipe {
    id: number
    resultItemId: number
    resultQuantity: number
    successRate: number
    sunlightCost: number
    sunnyCost: number
    ingredients: CraftingIngredient[]
    isActive: boolean
    minPlayerLevel: number
}



export interface CraftingFilters {
    page: number
    limit: number
    search: string
    isActive?: boolean
    minPlayerLevel?: number
    resultItemId?: number
}

export interface CraftingPagination {
    currentPage: number
    totalPages: number
    totalItems: number
    limit: number
}
