export interface MarketListing {
    id: number
    seller: string
    itemId: number
    quantity: number
    price: number
    listingTime: number
    expirationTime: number
    isActive: boolean
    durability: number
    expiration: number
}

export interface MarketTransaction {
    listingId: number
    seller: string
    buyer: string
    itemId: number
    quantity: number
    price: number
    transactionTime: number
    durability: number
    expiration: number
}

export interface MarketStats {
    totalListings: number
    totalTransactions: number
    totalVolume: number
    activeListings: number
}

export interface ItemMarketInfo {
    bestPrice: number
    totalQuantity: number
    totalListings: number
    averagePrice: number
}

export interface PlayerItemOverview {
    inventoryQuantity: number
    listedQuantity: number
    availableForListing: number
    totalListings: number
}

export interface ItemListingStats {
    totalListings: number
    activeListings: number
    totalQuantity: number
    activeQuantity: number
    lowestPrice: number
    highestPrice: number
}

export interface PlayerListedItemStats {
    itemId: number
    totalQuantity: number
    averagePrice: number
    totalListings: number
}

export interface UniqueItemWithBestPrice {
    itemId: number
    bestPrice: number
    totalQuantity: number
    totalListings: number
}

export interface FleaMarketFilters {
    itemId?: number
    seller?: string
    minPrice?: number
    maxPrice?: number
    isActive?: boolean
    page?: number
    limit?: number
}

export interface FleaMarketPagination {
    page: number
    limit: number
    total: number
    hasMore: boolean
}

export interface ListingFormData {
    itemId: number
    quantity: number
    price: number
    duration: number // in seconds
}

export interface PurchaseFormData {
    listingId: number
    quantity: number
}

export interface BulkPurchaseFormData {
    listingIds: number[]
    quantities: number[]
}

export interface BestPricePurchaseFormData {
    itemId: number
    quantity: number
}
