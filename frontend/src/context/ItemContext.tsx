"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Item, ItemFilters, ItemPagination, ItemType, Rarity, Attribute } from '@/types/item.type'
import { ethers } from 'ethers'

interface ItemContextType {
    items: Item[]
    pagination: ItemPagination
    filters: ItemFilters
    setPagination: (pagination: ItemPagination) => void
    setFilters: (filters: ItemFilters) => void
    isLoading: boolean
    error: string | null
    refreshItems: () => Promise<void>
}

const ItemContext = createContext<ItemContextType | undefined>(undefined)

interface ItemProviderProps {
    children: React.ReactNode
    contract?: ethers.Contract | null
}

export function ItemProvider({ children, contract }: ItemProviderProps) {
    const [allItems, setAllItems] = useState<Item[]>([])
    const [filteredItems, setFilteredItems] = useState<Item[]>([])
    const [pagination, setPagination] = useState<ItemPagination>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 10
    })
    const [filters, setFilters] = useState<ItemFilters>({
        page: 1,
        limit: 10,
        search: '',
        itemType: undefined,
        rarity: undefined,
        isTradable: undefined,
        isBanned: undefined
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load items from contract
    const loadItemsFromContract = async () => {
        if (!contract) {
            console.log('Contract not available, wallet not connected')
            // Không hiển thị mock data khi chưa connect ví
            setAllItems([])
            setFilteredItems([])
            setPagination({
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                limit: filters.limit
            })
            setError('Vui lòng kết nối ví để xem dữ liệu')
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            console.log('ItemContext: Starting loadItemsFromContract...')
            console.log('ItemContext: Contract provided:', contract)
            console.log('ItemContext: Contract address:', contract.address)

            // Kiểm tra xem contract có phương thức getAllItems không
            console.log('ItemContext: Available methods:', Object.keys(contract.interface.functions))

            // Kiểm tra xem có thể gọi phương thức đơn giản trước không
            try {
                console.log('ItemContext: Testing world() call...')
                const worldAddress = await contract.world()
                console.log('ItemContext: World address:', worldAddress)
            } catch (worldError) {
                console.error('ItemContext: Error calling world():', worldError)
            }

            // Get all item IDs from contract
            console.log('ItemContext: Calling getAllItems()...')
            const itemIds = await contract.getAllItems()
            console.log('Item IDs from contract:', itemIds)

            if (!itemIds || itemIds.length === 0) {
                setAllItems([])
                setFilteredItems([])
                setPagination({
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 0,
                    limit: filters.limit
                })
                return
            }

            // Load each item's data
            const itemsData: Item[] = []

            for (const itemId of itemIds) {
                try {
                    const itemData = await contract.getItem(itemId)

                    // Convert contract data to Item interface
                    const item: Item = {
                        id: itemData.id.toNumber(),
                        name: itemData.name,
                        itemType: itemData.itemType,
                        rarity: itemData.rarity,
                        isTradable: itemData.isTradable,
                        maxStacked: itemData.maxStacked.toNumber(),
                        isStacked: itemData.isStacked,
                        isBanned: itemData.isBanned,
                        attributes: {},
                        drops: []
                    }

                    // Load attributes for this item
                    try {
                        const [attributes, values] = await contract.getItemAttributes(itemId)
                        const attributesMap: { [key in Attribute]?: number } = {}
                        attributes.forEach((attr: number, index: number) => {
                            attributesMap[attr as Attribute] = values[index].toNumber()
                        })
                        item.attributes = attributesMap
                    } catch (attrError) {
                        console.log(`No attributes for item ${itemId}`)
                    }

                    // Load drops for this item
                    try {
                        const drops = await contract.getItemDrops(itemId)
                        item.drops = drops.map((drop: any) => ({
                            itemId: drop.itemId.toNumber(),
                            probability: drop.probability.toNumber(),
                            yield: drop.yield.toNumber()
                        }))
                    } catch (dropError) {
                        console.log(`No drops for item ${itemId}`)
                    }

                    itemsData.push(item)
                } catch (itemError) {
                    console.error(`Error loading item ${itemId}:`, itemError)
                }
            }

            console.log('Loaded items from contract:', itemsData)
            setAllItems(itemsData)
        } catch (error: any) {
            console.error('Error loading items from contract:', error)
            console.error('Error details:', {
                message: error?.message,
                code: error?.code,
                data: error?.data,
                errorArgs: error?.errorArgs,
                errorName: error?.errorName,
                errorSignature: error?.errorSignature,
                reason: error?.reason
            })
            setError('Lỗi tải dữ liệu từ contract')
        } finally {
            setIsLoading(false)
        }
    }

    // Apply filters and pagination to items
    const applyFiltersAndPagination = () => {
        console.log('ItemContext: applyFiltersAndPagination called with filters:', filters)
        let filteredItems = [...allItems]

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            filteredItems = filteredItems.filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                item.id.toString().includes(searchLower)
            )
        }

        // Apply item type filter
        if (filters.itemType !== undefined) {
            filteredItems = filteredItems.filter(item => item.itemType === filters.itemType)
        }

        // Apply rarity filter
        if (filters.rarity !== undefined) {
            filteredItems = filteredItems.filter(item => item.rarity === filters.rarity)
        }

        // Apply tradable filter
        if (filters.isTradable !== undefined) {
            filteredItems = filteredItems.filter(item => item.isTradable === filters.isTradable)
        }

        // Apply banned filter
        if (filters.isBanned !== undefined) {
            filteredItems = filteredItems.filter(item => item.isBanned === filters.isBanned)
        }

        // Calculate pagination
        const totalItems = filteredItems.length
        const totalPages = Math.ceil(totalItems / filters.limit)
        const startIndex = (filters.page - 1) * filters.limit
        const endIndex = startIndex + filters.limit
        const paginatedItems = filteredItems.slice(startIndex, endIndex)

        // Update pagination state
        const newPagination = {
            currentPage: filters.page,
            totalPages: Math.max(1, totalPages),
            totalItems,
            limit: filters.limit
        }
        console.log('ItemContext: Setting pagination to:', newPagination)
        setPagination(newPagination)

        // Update filtered items
        console.log('ItemContext: Setting filtered items:', paginatedItems.length, 'items')
        setFilteredItems(paginatedItems)

        return paginatedItems
    }

    // Refresh items function
    const refreshItems = async () => {
        await loadItemsFromContract()
    }

    // Load items when contract changes
    useEffect(() => {
        if (contract) {
            loadItemsFromContract()
        }
    }, [contract])

    // Apply filters and pagination when items or filters change
    useEffect(() => {
        if (allItems.length > 0) {
            applyFiltersAndPagination()
        }
    }, [allItems, filters.page, filters.limit, filters.search, filters.itemType, filters.rarity, filters.isTradable, filters.isBanned])

    const value = {
        items: filteredItems,
        pagination,
        filters,
        setPagination,
        setFilters: (newFilters: ItemFilters) => {
            console.log('ItemContext: setFilters called with:', newFilters)
            setFilters(newFilters)
        },
        isLoading,
        error,
        refreshItems
    }

    return (
        <ItemContext.Provider value={value}>
            {children}
        </ItemContext.Provider>
    )
}

export function useItemContext() {
    const context = useContext(ItemContext)
    if (context === undefined) {
        throw new Error('useItemContext must be used within an ItemProvider')
    }
    return context
}
