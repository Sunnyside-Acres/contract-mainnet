"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { CraftingRecipe, CraftingFilters, CraftingPagination } from '@/types/crafting.type'
import { ethers } from 'ethers'

interface CraftingContextType {
    recipes: CraftingRecipe[]
    pagination: CraftingPagination
    filters: CraftingFilters
    setPagination: (pagination: CraftingPagination) => void
    setFilters: (filters: CraftingFilters) => void
    isLoading: boolean
    error: string | null
    refreshRecipes: () => Promise<void>
    craftItem: (recipeId: number) => Promise<void>
}

const CraftingContext = createContext<CraftingContextType | undefined>(undefined)

interface CraftingProviderProps {
    children: React.ReactNode
    contract?: ethers.Contract | null
}

export function CraftingProvider({ children, contract }: CraftingProviderProps) {
    const [allRecipes, setAllRecipes] = useState<CraftingRecipe[]>([])
    const [filteredRecipes, setFilteredRecipes] = useState<CraftingRecipe[]>([])
    const [pagination, setPagination] = useState<CraftingPagination>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 10
    })
    const [filters, setFilters] = useState<CraftingFilters>({
        page: 1,
        limit: 10,
        search: '',
        isActive: undefined,
        minPlayerLevel: undefined,
        resultItemId: undefined
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load recipes from contract
    const loadRecipesFromContract = async () => {
        if (!contract) {
            console.log('Contract not available, wallet not connected')
            setAllRecipes([])
            setFilteredRecipes([])
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

            console.log('CraftingContext: Starting loadRecipesFromContract...')
            console.log('CraftingContext: Contract provided:', contract)
            console.log('CraftingContext: Contract address:', contract.address)

            // Get all recipes from contract
            console.log('CraftingContext: Calling getAllRecipes()...')
            const recipes = await contract.getAllRecipes()
            console.log('Recipes from contract:', recipes)

            if (!recipes || recipes.length === 0) {
                setAllRecipes([])
                setFilteredRecipes([])
                setPagination({
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 0,
                    limit: filters.limit
                })
                return
            }

            // Convert contract data to CraftingRecipe interface
            const recipesData: CraftingRecipe[] = recipes.map((recipe: any) => ({
                id: recipe.id.toNumber(),
                resultItemId: recipe.resultItemId.toNumber(),
                resultQuantity: recipe.resultQuantity.toNumber(),
                successRate: recipe.successRate.toNumber(),
                sunlightCost: recipe.sunlightCost.toNumber(),
                sunnyCost: recipe.sunnyCost.toNumber(),
                ingredients: recipe.ingredients.map((ingredient: any) => ({
                    itemId: ingredient.itemId.toNumber(),
                    quantity: ingredient.quantity.toNumber()
                })),
                isActive: recipe.isActive,
                minPlayerLevel: recipe.minPlayerLevel.toNumber()
            }))

            console.log('Loaded recipes from contract:', recipesData)
            setAllRecipes(recipesData)
        } catch (error: any) {
            console.error('Error loading recipes from contract:', error)
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

    // Apply filters and pagination to recipes
    const applyFiltersAndPagination = () => {
        console.log('CraftingContext: applyFiltersAndPagination called with filters:', filters)
        let filteredRecipes = [...allRecipes]

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            filteredRecipes = filteredRecipes.filter(recipe =>
                recipe.id.toString().includes(searchLower) ||
                recipe.resultItemId.toString().includes(searchLower)
            )
        }

        // Apply active filter
        if (filters.isActive !== undefined) {
            filteredRecipes = filteredRecipes.filter(recipe => recipe.isActive === filters.isActive)
        }

        // Apply min player level filter
        if (filters.minPlayerLevel !== undefined) {
            filteredRecipes = filteredRecipes.filter(recipe => recipe.minPlayerLevel === filters.minPlayerLevel)
        }

        // Apply result item filter
        if (filters.resultItemId !== undefined) {
            filteredRecipes = filteredRecipes.filter(recipe => recipe.resultItemId === filters.resultItemId)
        }

        // Calculate pagination
        const totalItems = filteredRecipes.length
        const totalPages = Math.ceil(totalItems / filters.limit)
        const startIndex = (filters.page - 1) * filters.limit
        const endIndex = startIndex + filters.limit
        const paginatedRecipes = filteredRecipes.slice(startIndex, endIndex)

        // Update pagination state
        const newPagination = {
            currentPage: filters.page,
            totalPages: Math.max(1, totalPages),
            totalItems,
            limit: filters.limit
        }
        console.log('CraftingContext: Setting pagination to:', newPagination)
        setPagination(newPagination)

        // Update filtered recipes
        console.log('CraftingContext: Setting filtered recipes:', paginatedRecipes.length, 'recipes')
        setFilteredRecipes(paginatedRecipes)

        return paginatedRecipes
    }

    // Craft item function
    const craftItem = async (recipeId: number) => {
        if (!contract) {
            throw new Error('Contract not available')
        }

        try {
            console.log('CraftingContext: Crafting item with recipe ID:', recipeId)
            const tx = await contract.craftItem(recipeId)
            await tx.wait()
            console.log('CraftingContext: Crafting successful')
        } catch (error: any) {
            console.error('Error crafting item:', error)
            throw new Error('Lỗi craft item: ' + (error?.reason || error?.message || 'Unknown error'))
        }
    }



    // Refresh recipes function
    const refreshRecipes = async () => {
        await loadRecipesFromContract()
    }

    // Load recipes when contract changes
    useEffect(() => {
        if (contract) {
            loadRecipesFromContract()
        }
    }, [contract])

    // Apply filters and pagination when recipes or filters change
    useEffect(() => {
        if (allRecipes.length > 0) {
            applyFiltersAndPagination()
        }
    }, [allRecipes, filters.page, filters.limit, filters.search, filters.isActive, filters.minPlayerLevel, filters.resultItemId])

    const value = {
        recipes: filteredRecipes,
        pagination,
        filters,
        setPagination,
        setFilters: (newFilters: CraftingFilters) => {
            console.log('CraftingContext: setFilters called with:', newFilters)
            setFilters(newFilters)
        },
        isLoading,
        error,
        refreshRecipes,
        craftItem
    }

    return (
        <CraftingContext.Provider value={value}>
            {children}
        </CraftingContext.Provider>
    )
}

export function useCraftingContext() {
    const context = useContext(CraftingContext)
    if (context === undefined) {
        throw new Error('useCraftingContext must be used within a CraftingProvider')
    }
    return context
}
