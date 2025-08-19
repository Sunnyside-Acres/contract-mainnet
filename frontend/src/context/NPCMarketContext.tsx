'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { ethers } from 'ethers'
import { NPCMarket, MarketItem, MarketItemView, NPCMarketFilters, NPCMarketPagination } from '@/types/npcmarket.type'

interface NPCMarketContextType {
    // State
    npcMarkets: NPCMarket[]
    marketItems: { [npcId: number]: MarketItemView[] }
    pagination: NPCMarketPagination
    filters: NPCMarketFilters
    isLoading: boolean
    error: string | null
    contract: ethers.Contract | null

    // Actions
    setPagination: (pagination: NPCMarketPagination) => void
    setFilters: (filters: NPCMarketFilters) => void
    refreshNPCMarkets: () => Promise<void>
    loadMarketItems: (npcId: number) => Promise<void>
    createNPCMarket: (npcId: number, name: string) => Promise<void>
    addItemToMarket: (npcId: number, itemId: number, limitPerUser: number, pricePerUnit: number, isSelling: boolean) => Promise<void>
    updateItemInMarket: (npcId: number, itemId: number, limitPerUser: number, pricePerUnit: number) => Promise<void>
    removeItemFromMarket: (npcId: number, itemId: number) => Promise<void>

    buyItemFromNPC: (npcId: number, itemId: number, quantity: number) => Promise<void>
    sellItemToNPC: (npcId: number, itemId: number, quantity: number) => Promise<void>
    getMarketItem: (npcId: number, itemId: number) => Promise<MarketItemView | null>
    getAllMarketItems: (npcId: number) => Promise<MarketItemView[]>
    canPlayerBuyItem: (player: string, npcId: number, itemId: number, quantity: number) => Promise<{ canBuy: boolean, reason: string }>
    canPlayerSellItem: (player: string, npcId: number, itemId: number, quantity: number) => Promise<{ canSell: boolean, reason: string }>
    calculateBuyPrice: (npcId: number, itemId: number, quantity: number) => Promise<number>
    calculateSellPrice: (npcId: number, itemId: number, quantity: number) => Promise<number>
    getUserPurchases: (npcId: number, itemId: number, user: string) => Promise<number>
    canUserPurchaseMore: (npcId: number, itemId: number, user: string, additionalQuantity: number) => Promise<boolean>
    resetUserPurchases: (npcId: number, itemId: number, user: string) => Promise<void>
    getItemLimitPerUser: (npcId: number, itemId: number) => Promise<number>
    getRemainingUserLimit: (npcId: number, itemId: number, user: string) => Promise<number>
}

const NPCMarketContext = createContext<NPCMarketContextType | undefined>(undefined)

interface NPCMarketProviderProps {
    children: ReactNode
    contract: ethers.Contract | null
}

export function NPCMarketProvider({ children, contract }: NPCMarketProviderProps) {
    const [npcMarkets, setNPCMarkets] = useState<NPCMarket[]>([])
    const [marketItems, setMarketItems] = useState<{ [npcId: number]: MarketItemView[] }>({})
    const [pagination, setPagination] = useState<NPCMarketPagination>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 10
    })
    const [filters, setFilters] = useState<NPCMarketFilters>({
        page: 1,
        limit: 10
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Helper function to reload market items
    const reloadMarketItems = useCallback(async (npcId: number) => {
        if (!contract) return

        try {
            const items = await contract.getAllMarketItems(npcId)
            setMarketItems(prev => ({
                ...prev,
                [npcId]: items.map((item: any) => ({
                    itemId: item.itemId.toNumber(),
                    limitPerUser: item.limitPerUser.toNumber(),
                    pricePerUnit: item.pricePerUnit.toNumber(),
                    isSelling: item.isSelling,
                    active: item.active
                }))
            }))
        } catch (error) {
            console.error('Error reloading market items:', error)
        }
    }, [contract])

    // Load NPC Markets
    const refreshNPCMarkets = useCallback(async () => {
        console.log('refreshNPCMarkets called, contract:', contract)

        if (!contract) {
            console.log('Contract is null, setting error')
            setError('Contract not available. Please connect wallet.')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            console.log('Loading NPC markets...')
            // Note: This is a simplified implementation
            // In a real scenario, you might need to implement pagination and filtering
            // based on your contract's capabilities

            // For now, we'll load a fixed set of NPC markets (1-10)
            const markets: NPCMarket[] = []

            for (let i = 1; i <= 10; i++) {
                try {
                    console.log(`Checking NPC market ${i}...`)
                    const marketInfo = await contract.getNPCMarketInfo(i)
                    console.log(`Market ${i} info:`, marketInfo)

                    if (marketInfo.isActive) {
                        markets.push({
                            npcId: marketInfo.npcId.toNumber(),
                            name: marketInfo.name,
                            isActive: marketInfo.isActive,
                            itemCount: marketInfo.itemCount.toNumber()
                        })
                    }
                } catch (error) {
                    console.log(`NPC market ${i} doesn't exist or is not active:`, error)
                    // NPC market doesn't exist or is not active
                    continue
                }
            }

            console.log('Loaded markets:', markets)
            setNPCMarkets(markets)
            setPagination({
                currentPage: 1,
                totalPages: Math.ceil(markets.length / filters.limit),
                totalItems: markets.length,
                limit: filters.limit
            })
        } catch (error) {
            console.error('Error loading NPC markets:', error)
            setError('Failed to load NPC markets: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }, [contract, filters.limit])

    // Load market items for a specific NPC
    const loadMarketItems = useCallback(async (npcId: number) => {
        await reloadMarketItems(npcId)
    }, [reloadMarketItems])

    // Create NPC Market
    const createNPCMarket = useCallback(async (npcId: number, name: string) => {
        console.log('createNPCMarket called with:', { npcId, name })
        console.log('Contract:', contract)

        if (!contract) {
            console.log('Contract is null, throwing error')
            throw new Error('Contract not available. Please connect wallet and try again.')
        }

        try {
            console.log('Calling contract.createNPCMarket...')
            const tx = await contract.createNPCMarket(npcId, name)
            console.log('Transaction sent:', tx)

            console.log('Waiting for transaction...')
            await tx.wait()
            console.log('Transaction confirmed')

            console.log('Refreshing markets...')
            await refreshNPCMarkets()
        } catch (error) {
            console.error('Error creating NPC market:', error)
            throw error
        }
    }, [contract, refreshNPCMarkets])

    // Add item to market
    const addItemToMarket = useCallback(async (npcId: number, itemId: number, limitPerUser: number, pricePerUnit: number, isSelling: boolean) => {
        if (!contract) throw new Error('Contract not available')

        const tx = await contract.addItemToMarket(npcId, itemId, limitPerUser, pricePerUnit, isSelling)
        await tx.wait()
        await reloadMarketItems(npcId)
    }, [contract, reloadMarketItems])

    // Update item in market
    const updateItemInMarket = useCallback(async (npcId: number, itemId: number, limitPerUser: number, pricePerUnit: number) => {
        if (!contract) throw new Error('Contract not available')

        const tx = await contract.updateItemInMarket(npcId, itemId, limitPerUser, pricePerUnit)
        await tx.wait()
        await reloadMarketItems(npcId)
    }, [contract, reloadMarketItems])

    // Remove item from market
    const removeItemFromMarket = useCallback(async (npcId: number, itemId: number) => {
        if (!contract) throw new Error('Contract not available')

        const tx = await contract.removeItemFromMarket(npcId, itemId)
        await tx.wait()
        await reloadMarketItems(npcId)
    }, [contract, reloadMarketItems])

    // Buy item from NPC
    const buyItemFromNPC = useCallback(async (npcId: number, itemId: number, quantity: number) => {
        if (!contract) throw new Error('Contract not available')

        const tx = await contract.buyItemFromNPC(npcId, itemId, quantity)
        await tx.wait()
        await reloadMarketItems(npcId)
    }, [contract, reloadMarketItems])

    // Sell item to NPC
    const sellItemToNPC = useCallback(async (npcId: number, itemId: number, quantity: number) => {
        if (!contract) throw new Error('Contract not available')

        const tx = await contract.sellItemToNPC(npcId, itemId, quantity)
        await tx.wait()
        await reloadMarketItems(npcId)
    }, [contract, reloadMarketItems])

    // Get market item
    const getMarketItem = useCallback(async (npcId: number, itemId: number): Promise<MarketItemView | null> => {
        if (!contract) return null

        try {
            const item = await contract.getMarketItem(npcId, itemId)
            return {
                itemId: item.itemId.toNumber(),
                limitPerUser: item.limitPerUser.toNumber(),
                pricePerUnit: item.pricePerUnit.toNumber(),
                isSelling: item.isSelling,
                active: item.active
            }
        } catch (error) {
            console.error('Error getting market item:', error)
            return null
        }
    }, [contract])

    // Get all market items
    const getAllMarketItems = useCallback(async (npcId: number): Promise<MarketItemView[]> => {
        if (!contract) return []

        try {
            const items = await contract.getAllMarketItems(npcId)
            return items.map((item: any) => ({
                itemId: item.itemId.toNumber(),
                limitPerUser: item.limitPerUser.toNumber(),
                pricePerUnit: item.pricePerUnit.toNumber(),
                isSelling: item.isSelling,
                active: item.active
            }))
        } catch (error) {
            console.error('Error getting all market items:', error)
            return []
        }
    }, [contract])

    // Check if player can buy item
    const canPlayerBuyItem = useCallback(async (player: string, npcId: number, itemId: number, quantity: number): Promise<{ canBuy: boolean, reason: string }> => {
        if (!contract) return { canBuy: false, reason: 'Contract not available' }

        try {
            const result = await contract.canPlayerBuyItem(player, npcId, itemId, quantity)
            return { canBuy: result.canBuy, reason: result.reason }
        } catch (error) {
            console.error('Error checking if player can buy item:', error)
            return { canBuy: false, reason: 'Error checking purchase ability' }
        }
    }, [contract])

    // Check if player can sell item
    const canPlayerSellItem = useCallback(async (player: string, npcId: number, itemId: number, quantity: number): Promise<{ canSell: boolean, reason: string }> => {
        if (!contract) return { canSell: false, reason: 'Contract not available' }

        try {
            const result = await contract.canPlayerSellItem(player, npcId, itemId, quantity)
            return { canSell: result.canSell, reason: result.reason }
        } catch (error) {
            console.error('Error checking if player can sell item:', error)
            return { canSell: false, reason: 'Error checking sale ability' }
        }
    }, [contract])

    // Calculate buy price
    const calculateBuyPrice = useCallback(async (npcId: number, itemId: number, quantity: number): Promise<number> => {
        if (!contract) return 0

        try {
            const price = await contract.calculateBuyPrice(npcId, itemId, quantity)
            return price.toNumber()
        } catch (error) {
            console.error('Error calculating buy price:', error)
            return 0
        }
    }, [contract])

    // Calculate sell price
    const calculateSellPrice = useCallback(async (npcId: number, itemId: number, quantity: number): Promise<number> => {
        if (!contract) return 0

        try {
            const price = await contract.calculateSellPrice(npcId, itemId, quantity)
            return price.toNumber()
        } catch (error) {
            console.error('Error calculating sell price:', error)
            return 0
        }
    }, [contract])

    // Get user purchases
    const getUserPurchases = useCallback(async (npcId: number, itemId: number, user: string): Promise<number> => {
        if (!contract) return 0

        try {
            const purchases = await contract.getUserPurchases(npcId, itemId, user)
            return purchases.toNumber()
        } catch (error) {
            console.error('Error getting user purchases:', error)
            return 0
        }
    }, [contract])

    // Check if user can purchase more
    const canUserPurchaseMore = useCallback(async (npcId: number, itemId: number, user: string, additionalQuantity: number): Promise<boolean> => {
        if (!contract) return false

        try {
            const canPurchase = await contract.canUserPurchaseMore(npcId, itemId, user, additionalQuantity)
            return canPurchase
        } catch (error) {
            console.error('Error checking if user can purchase more:', error)
            return false
        }
    }, [contract])

    // Reset user purchases
    const resetUserPurchases = useCallback(async (npcId: number, itemId: number, user: string) => {
        if (!contract) throw new Error('Contract not available')

        const tx = await contract.resetUserPurchases(npcId, itemId, user)
        await tx.wait()
    }, [contract])

    // Get item limit per user
    const getItemLimitPerUser = useCallback(async (npcId: number, itemId: number): Promise<number> => {
        if (!contract) return 0

        try {
            const limit = await contract.getItemLimitPerUser(npcId, itemId)
            return limit.toNumber()
        } catch (error) {
            console.error('Error getting item limit per user:', error)
            return 0
        }
    }, [contract])

    // Get remaining user limit
    const getRemainingUserLimit = useCallback(async (npcId: number, itemId: number, user: string): Promise<number> => {
        if (!contract) return 0

        try {
            const remaining = await contract.getRemainingUserLimit(npcId, itemId, user)
            return remaining.toNumber()
        } catch (error) {
            console.error('Error getting remaining user limit:', error)
            return 0
        }
    }, [contract])

    // Load data when contract changes
    useEffect(() => {
        console.log('useEffect triggered, contract:', contract)
        if (contract) {
            console.log('Contract available, refreshing markets...')
            refreshNPCMarkets()
        } else {
            console.log('Contract not available, setting error')
            setError('Contract not available. Please connect wallet.')
        }
    }, [contract, refreshNPCMarkets])

    const value = {
        // State
        npcMarkets,
        marketItems,
        pagination,
        filters,
        isLoading,
        error,
        contract,

        // Actions
        setPagination,
        setFilters,
        refreshNPCMarkets,
        loadMarketItems,
        createNPCMarket,
        addItemToMarket,
        updateItemInMarket,
        removeItemFromMarket,
        buyItemFromNPC,
        sellItemToNPC,
        getMarketItem,
        getAllMarketItems,
        canPlayerBuyItem,
        canPlayerSellItem,
        calculateBuyPrice,
        calculateSellPrice,
        getUserPurchases,
        canUserPurchaseMore,
        resetUserPurchases,
        getItemLimitPerUser,
        getRemainingUserLimit,
    }

    return (
        <NPCMarketContext.Provider value={value}>
            {children}
        </NPCMarketContext.Provider>
    )
}

export function useNPCMarketContext() {
    const context = useContext(NPCMarketContext)
    if (context === undefined) {
        throw new Error('useNPCMarketContext must be used within a NPCMarketProvider')
    }
    return context
}
