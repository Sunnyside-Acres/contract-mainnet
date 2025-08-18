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
    const [items, setItems] = useState<Item[]>([])
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
            setItems([])
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

            // Get all item IDs from contract
            const itemIds = await contract.getAllItems()
            console.log('Item IDs from contract:', itemIds)

            if (!itemIds || itemIds.length === 0) {
                setItems([])
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
            setItems(itemsData)
            setPagination({
                currentPage: 1,
                totalPages: Math.ceil(itemsData.length / filters.limit),
                totalItems: itemsData.length,
                limit: filters.limit
            })
        } catch (error) {
            console.error('Error loading items from contract:', error)
            setError('Lỗi tải dữ liệu từ contract')
        } finally {
            setIsLoading(false)
        }
    }

    // Refresh items function
    const refreshItems = async () => {
        await loadItemsFromContract()
    }

    // Load items when contract changes
    useEffect(() => {
        loadItemsFromContract()
    }, [contract])

    const value = {
        items,
        pagination,
        filters,
        setPagination,
        setFilters,
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
