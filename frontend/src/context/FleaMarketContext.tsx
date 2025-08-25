'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import {
    MarketListing,
    MarketTransaction,
    MarketStats,
    FleaMarketFilters,
    FleaMarketPagination,
    ListingFormData,
    PurchaseFormData,
    BulkPurchaseFormData,
    BestPricePurchaseFormData,
    ItemMarketInfo,
    PlayerItemOverview,
    ItemListingStats,
    PlayerListedItemStats,
    UniqueItemWithBestPrice
} from '@/types/fleamarket.type'

interface FleaMarketContextType {
    // State
    listings: MarketListing[]
    transactions: MarketTransaction[]
    marketStats: MarketStats | null
    filters: FleaMarketFilters
    pagination: FleaMarketPagination
    isLoading: boolean
    error: string | null

    // Actions
    setFilters: (filters: FleaMarketFilters) => void
    setPagination: (pagination: FleaMarketPagination) => void
    refreshListings: () => Promise<void>
    refreshTransactions: () => Promise<void>
    refreshMarketStats: () => Promise<void>

    // Listing operations
    listItem: (data: ListingFormData) => Promise<boolean>
    updateListing: (listingId: number, data: ListingFormData) => Promise<boolean>
    cancelListing: (listingId: number) => Promise<boolean>

    // Purchase operations
    purchaseItem: (data: PurchaseFormData) => Promise<boolean>
    purchaseMultipleItems: (data: BulkPurchaseFormData) => Promise<boolean>
    purchaseBestPrice: (data: BestPricePurchaseFormData) => Promise<boolean>

    // Query functions
    getListingsByItem: (itemId: number) => Promise<MarketListing[]>
    getListingsBySeller: (seller: string) => Promise<MarketListing[]>
    getTransactionHistory: (player: string) => Promise<MarketTransaction[]>
    getItemMarketInfo: (itemId: number) => Promise<ItemMarketInfo>
    getPlayerItemOverview: (player: string, itemId: number) => Promise<PlayerItemOverview>
    getItemListingStats: (itemId: number) => Promise<ItemListingStats>
    getPlayerListedItemsWithStats: (player: string, offset: number, limit: number) => Promise<PlayerListedItemStats[]>
    getUniqueItemsWithBestPrices: (offset: number, limit: number) => Promise<UniqueItemWithBestPrice[]>

    // Validation functions
    canPurchaseItem: (player: string, listingId: number, quantity: number) => Promise<{ success: boolean, message: string }>
    canListItem: (player: string, itemId: number, quantity: number) => Promise<{ success: boolean, message: string }>
}

const FleaMarketContext = createContext<FleaMarketContextType | undefined>(undefined)

interface FleaMarketProviderProps {
    children: ReactNode
    contract?: ethers.Contract | null
}

export function FleaMarketProvider({ children, contract }: FleaMarketProviderProps) {
    const [listings, setListings] = useState<MarketListing[]>([])
    const [transactions, setTransactions] = useState<MarketTransaction[]>([])
    const [marketStats, setMarketStats] = useState<MarketStats | null>(null)
    const [filters, setFilters] = useState<FleaMarketFilters>({
        page: 1,
        limit: 20
    })
    const [pagination, setPagination] = useState<FleaMarketPagination>({
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load initial data
    useEffect(() => {
        if (contract) {
            refreshListings()
            refreshMarketStats()
        }
    }, [contract])

    const refreshListings = async () => {
        if (!contract) return

        setIsLoading(true)
        setError(null)

        try {
            const activeListings = await contract.getActiveListings()
            setListings(activeListings)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tải danh sách listings')
        } finally {
            setIsLoading(false)
        }
    }

    const refreshTransactions = async () => {
        if (!contract) return

        setIsLoading(true)
        setError(null)

        try {
            // Lấy transaction history của current user nếu có
            // Có thể cần thêm logic để lấy address của current user
            setTransactions([])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tải lịch sử giao dịch')
        } finally {
            setIsLoading(false)
        }
    }

    const refreshMarketStats = async () => {
        if (!contract) return

        setIsLoading(true)
        setError(null)

        try {
            const stats = await contract.getMarketStats()
            setMarketStats(stats)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tải thống kê thị trường')
        } finally {
            setIsLoading(false)
        }
    }

    const listItem = async (data: ListingFormData): Promise<boolean> => {
        if (!contract) return false

        try {
            const tx = await contract.listItem(
                data.itemId,
                data.quantity,
                data.price,
                data.duration
            )
            await tx.wait()
            await refreshListings()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi đăng bán item')
            return false
        }
    }

    const updateListing = async (listingId: number, data: ListingFormData): Promise<boolean> => {
        if (!contract) return false

        try {
            const tx = await contract.updateListing(
                listingId,
                data.quantity,
                data.price,
                data.duration
            )
            await tx.wait()
            await refreshListings()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi cập nhật listing')
            return false
        }
    }

    const cancelListing = async (listingId: number): Promise<boolean> => {
        if (!contract) return false

        try {
            const tx = await contract.cancelListing(listingId)
            await tx.wait()
            await refreshListings()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi hủy listing')
            return false
        }
    }

    const purchaseItem = async (data: PurchaseFormData): Promise<boolean> => {
        if (!contract) return false

        try {
            const tx = await contract.purchaseItem(data.listingId, data.quantity)
            await tx.wait()
            await refreshListings()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi mua item')
            return false
        }
    }

    const purchaseMultipleItems = async (data: BulkPurchaseFormData): Promise<boolean> => {
        if (!contract) return false

        try {
            const tx = await contract.purchaseMultipleItems(data.listingIds, data.quantities)
            await tx.wait()
            await refreshListings()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi mua nhiều item')
            return false
        }
    }

    const purchaseBestPrice = async (data: BestPricePurchaseFormData): Promise<boolean> => {
        if (!contract) return false

        try {
            const tx = await contract.purchaseBestPrice(data.itemId, data.quantity)
            await tx.wait()
            await refreshListings()
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi mua với giá tốt nhất')
            return false
        }
    }

    const getListingsByItem = async (itemId: number): Promise<MarketListing[]> => {
        if (!contract) return []

        try {
            return await contract.getListingsByItem(itemId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy listings theo item')
            return []
        }
    }

    const getListingsBySeller = async (seller: string): Promise<MarketListing[]> => {
        if (!contract) return []

        try {
            return await contract.getListingsBySeller(seller)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy listings theo seller')
            return []
        }
    }

    const getTransactionHistory = async (player: string): Promise<MarketTransaction[]> => {
        if (!contract) return []

        try {
            return await contract.getTransactionHistory(player)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy lịch sử giao dịch')
            return []
        }
    }

    const getItemMarketInfo = async (itemId: number): Promise<ItemMarketInfo> => {
        if (!contract) return { bestPrice: 0, totalQuantity: 0, totalListings: 0, averagePrice: 0 }

        try {
            return await contract.getItemMarketInfo(itemId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy thông tin thị trường item')
            return { bestPrice: 0, totalQuantity: 0, totalListings: 0, averagePrice: 0 }
        }
    }

    const getPlayerItemOverview = async (player: string, itemId: number): Promise<PlayerItemOverview> => {
        if (!contract) return { inventoryQuantity: 0, listedQuantity: 0, availableForListing: 0, totalListings: 0 }

        try {
            return await contract.getPlayerItemOverview(player, itemId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy tổng quan item của player')
            return { inventoryQuantity: 0, listedQuantity: 0, availableForListing: 0, totalListings: 0 }
        }
    }

    const getItemListingStats = async (itemId: number): Promise<ItemListingStats> => {
        if (!contract) return { totalListings: 0, activeListings: 0, totalQuantity: 0, activeQuantity: 0, lowestPrice: 0, highestPrice: 0 }

        try {
            return await contract.getItemListingStats(itemId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy thống kê listing item')
            return { totalListings: 0, activeListings: 0, totalQuantity: 0, activeQuantity: 0, lowestPrice: 0, highestPrice: 0 }
        }
    }

    const getPlayerListedItemsWithStats = async (player: string, offset: number, limit: number): Promise<PlayerListedItemStats[]> => {
        if (!contract) return []

        try {
            const result = await contract.getPlayerListedItemsWithStatsPaginated(player, offset, limit)
            return result[0] // Assuming the contract returns [itemIds, totalQuantities, averagePrices, totalListings, hasMore]
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy items đã list của player')
            return []
        }
    }

    const getUniqueItemsWithBestPrices = async (offset: number, limit: number): Promise<UniqueItemWithBestPrice[]> => {
        if (!contract) return []

        try {
            const result = await contract.getUniqueItemsWithBestPricesPaginated(offset, limit)
            return result[0] // Assuming the contract returns [itemIds, bestPrices, totalQuantities, totalListings, hasMore]
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi lấy items với giá tốt nhất')
            return []
        }
    }

    const canPurchaseItem = async (player: string, listingId: number, quantity: number): Promise<{ success: boolean, message: string }> => {
        if (!contract) return { success: false, message: 'Contract không khả dụng' }

        try {
            const result = await contract.canPurchaseItem(player, listingId, quantity)
            return { success: result[0], message: result[1] }
        } catch (err) {
            return { success: false, message: err instanceof Error ? err.message : 'Lỗi kiểm tra khả năng mua' }
        }
    }

    const canListItem = async (player: string, itemId: number, quantity: number): Promise<{ success: boolean, message: string }> => {
        if (!contract) return { success: false, message: 'Contract không khả dụng' }

        try {
            const result = await contract.canListItem(player, itemId, quantity)
            return { success: result[0], message: result[1] }
        } catch (err) {
            return { success: false, message: err instanceof Error ? err.message : 'Lỗi kiểm tra khả năng list item' }
        }
    }

    const value: FleaMarketContextType = {
        // State
        listings,
        transactions,
        marketStats,
        filters,
        pagination,
        isLoading,
        error,

        // Actions
        setFilters,
        setPagination,
        refreshListings,
        refreshTransactions,
        refreshMarketStats,

        // Listing operations
        listItem,
        updateListing,
        cancelListing,

        // Purchase operations
        purchaseItem,
        purchaseMultipleItems,
        purchaseBestPrice,

        // Query functions
        getListingsByItem,
        getListingsBySeller,
        getTransactionHistory,
        getItemMarketInfo,
        getPlayerItemOverview,
        getItemListingStats,
        getPlayerListedItemsWithStats,
        getUniqueItemsWithBestPrices,

        // Validation functions
        canPurchaseItem,
        canListItem
    }

    return (
        <FleaMarketContext.Provider value={value}>
            {children}
        </FleaMarketContext.Provider>
    )
}

export function useFleaMarketContext() {
    const context = useContext(FleaMarketContext)
    if (context === undefined) {
        throw new Error('useFleaMarketContext must be used within a FleaMarketProvider')
    }
    return context
}
