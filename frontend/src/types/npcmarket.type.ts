export interface NPCMarket {
    npcId: number
    name: string
    isActive: boolean
    itemCount: number
}

export interface MarketItem {
    itemId: number
    limitPerUser: number
    pricePerUnit: number
    isSelling: boolean
    active: boolean
}

export interface MarketItemView {
    itemId: number
    limitPerUser: number
    pricePerUnit: number
    isSelling: boolean
    active: boolean
}

export interface NPCMarketFilters {
    page: number
    limit: number
    search?: string
    isActive?: boolean
    minItemCount?: number
    maxItemCount?: number
}

export interface NPCMarketPagination {
    currentPage: number
    totalPages: number
    totalItems: number
    limit: number
}
