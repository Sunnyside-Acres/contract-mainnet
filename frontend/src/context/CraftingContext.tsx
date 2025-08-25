"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import {
    CraftingRecipe,
    CraftingHistory,
    CraftingStats,
    CraftingSystemStats,
    RecipeFormData,
    UpdateRecipeFormData,
    CraftingIngredient
} from '@/types/crafting.type'

interface CraftingContextType {
    // State
    recipes: CraftingRecipe[]
    craftingHistory: CraftingHistory[]
    systemStats: CraftingSystemStats | null
    isLoading: boolean
    error: string | null

    // Functions
    refreshRecipes: () => Promise<void>
    refreshCraftingHistory: (playerAddress?: string) => Promise<void>
    refreshSystemStats: () => Promise<void>
    createRecipe: (formData: RecipeFormData) => Promise<number>
    updateRecipe: (recipeId: number, formData: UpdateRecipeFormData) => Promise<void>
    deleteRecipe: (recipeId: number) => Promise<void>
    setRecipeActive: (recipeId: number, isActive: boolean) => Promise<void>
    getPlayerCraftingStats: (playerAddress: string) => Promise<CraftingStats>
    canCraftRecipe: (playerAddress: string, recipeId: number) => Promise<{ success: boolean; message: string }>
    craftItem: (recipeId: number) => Promise<void>
}

const CraftingContext = createContext<CraftingContextType | undefined>(undefined)

interface CraftingProviderProps {
    children: ReactNode
    contract?: ethers.Contract | null
    signer?: ethers.Signer | null
}

export function CraftingProvider({ children, contract, signer }: CraftingProviderProps) {
    const [recipes, setRecipes] = useState<CraftingRecipe[]>([])
    const [craftingHistory, setCraftingHistory] = useState<CraftingHistory[]>([])
    const [systemStats, setSystemStats] = useState<CraftingSystemStats | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Convert BigNumber arrays to regular arrays
    const convertRecipe = (recipe: any): CraftingRecipe => ({
        id: Number(recipe.id),
        resultItemId: Number(recipe.resultItemId),
        resultQuantity: Number(recipe.resultQuantity),
        successRate: Number(recipe.successRate),
        sunlightCost: Number(recipe.sunlightCost),
        sunnyCost: Number(recipe.sunnyCost),
        ingredients: recipe.ingredients.map((ingredient: any) => ({
            itemId: Number(ingredient.itemId),
            quantity: Number(ingredient.quantity)
        })),
        isActive: recipe.isActive,
        minPlayerLevel: Number(recipe.minPlayerLevel)
    })

    const convertHistory = (history: any): CraftingHistory => ({
        player: history.player,
        recipeId: Number(history.recipeId),
        resultItemId: Number(history.resultItemId),
        resultQuantity: Number(history.resultQuantity),
        isSuccess: history.isSuccess,
        timestamp: Number(history.timestamp),
        sunlightSpent: Number(history.sunlightSpent),
        sunnySpent: Number(history.sunnySpent)
    })

    const refreshRecipes = async () => {
        if (!contract) return

        try {
            setIsLoading(true)
            setError(null)

            const allRecipes = await contract.getAllRecipes()
            const convertedRecipes = allRecipes.map(convertRecipe)
            setRecipes(convertedRecipes)
        } catch (err) {
            console.error('Error fetching recipes:', err)
            setError('Failed to fetch recipes')
        } finally {
            setIsLoading(false)
        }
    }

    const refreshCraftingHistory = async (playerAddress?: string) => {
        if (!contract) return

        try {
            setIsLoading(true)
            setError(null)

            let history: any[]
            if (playerAddress) {
                history = await contract.getPlayerCraftingHistory(playerAddress)
            } else {
                // For now, we'll get history for the current signer
                if (signer) {
                    const address = await signer.getAddress()
                    history = await contract.getPlayerCraftingHistory(address)
                } else {
                    history = []
                }
            }

            const convertedHistory = history.map(convertHistory)
            setCraftingHistory(convertedHistory)
        } catch (err) {
            console.error('Error fetching crafting history:', err)
            setError('Failed to fetch crafting history')
        } finally {
            setIsLoading(false)
        }
    }

    const refreshSystemStats = async () => {
        if (!contract) return

        try {
            setIsLoading(true)
            setError(null)

            const stats = await contract.getCraftingSystemStats()
            setSystemStats({
                totalRecipes: Number(stats.totalRecipes),
                activeRecipes: Number(stats.activeRecipes),
                totalCrafts: Number(stats.totalCrafts),
                totalSuccessfulCrafts: Number(stats.totalSuccessfulCrafts)
            })
        } catch (err) {
            console.error('Error fetching system stats:', err)
            setError('Failed to fetch system stats')
        } finally {
            setIsLoading(false)
        }
    }

    const createRecipe = async (formData: RecipeFormData): Promise<number> => {
        if (!contract || !signer) {
            throw new Error('Contract or signer not available')
        }

        try {
            setIsLoading(true)
            setError(null)

            const tx = await contract.createRecipe(
                formData.resultItemId,
                formData.resultQuantity,
                formData.successRate,
                formData.sunlightCost,
                formData.sunnyCost,
                formData.ingredients,
                formData.minPlayerLevel
            )

            await tx.wait()
            await refreshRecipes()
            await refreshSystemStats()

            // Get the recipe ID from the event
            const receipt = await contract.provider.getTransactionReceipt(tx.hash)
            const event = receipt.logs.find((log: any) =>
                log.topics[0] === contract.interface.getEventTopic('RecipeCreated')
            )

            if (event) {
                const decoded = contract.interface.parseLog(event)
                return Number(decoded.args.recipeId)
            }

            return 0
        } catch (err) {
            console.error('Error creating recipe:', err)
            setError('Failed to create recipe')
            throw err
        } finally {
            setIsLoading(false)
        }
    }

    const updateRecipe = async (recipeId: number, formData: UpdateRecipeFormData): Promise<void> => {
        if (!contract || !signer) {
            throw new Error('Contract or signer not available')
        }

        try {
            setIsLoading(true)
            setError(null)

            const tx = await contract.updateRecipe(
                recipeId,
                formData.successRate,
                formData.sunlightCost,
                formData.sunnyCost,
                formData.ingredients,
                formData.minPlayerLevel
            )

            await tx.wait()
            await refreshRecipes()
        } catch (err) {
            console.error('Error updating recipe:', err)
            setError('Failed to update recipe')
            throw err
        } finally {
            setIsLoading(false)
        }
    }

    const deleteRecipe = async (recipeId: number): Promise<void> => {
        if (!contract || !signer) {
            throw new Error('Contract or signer not available')
        }

        try {
            setIsLoading(true)
            setError(null)

            const tx = await contract.deleteRecipe(recipeId)
            await tx.wait()
            await refreshRecipes()
            await refreshSystemStats()
        } catch (err) {
            console.error('Error deleting recipe:', err)
            setError('Failed to delete recipe')
            throw err
        } finally {
            setIsLoading(false)
        }
    }

    const setRecipeActive = async (recipeId: number, isActive: boolean): Promise<void> => {
        if (!contract || !signer) {
            throw new Error('Contract or signer not available')
        }

        try {
            setIsLoading(true)
            setError(null)

            const tx = await contract.setRecipeActive(recipeId, isActive)
            await tx.wait()
            await refreshRecipes()
            await refreshSystemStats()
        } catch (err) {
            console.error('Error setting recipe active:', err)
            setError('Failed to set recipe active')
            throw err
        } finally {
            setIsLoading(false)
        }
    }

    const getPlayerCraftingStats = async (playerAddress: string): Promise<CraftingStats> => {
        if (!contract) {
            throw new Error('Contract not available')
        }

        try {
            const stats = await contract.getPlayerCraftingStats(playerAddress)
            return {
                totalCrafts: Number(stats.totalCrafts),
                successfulCrafts: Number(stats.successfulCrafts),
                successRate: Number(stats.successRate)
            }
        } catch (err) {
            console.error('Error getting player crafting stats:', err)
            throw err
        }
    }

    const canCraftRecipe = async (playerAddress: string, recipeId: number): Promise<{ success: boolean; message: string }> => {
        if (!contract) {
            throw new Error('Contract not available')
        }

        try {
            const result = await contract.canCraftRecipe(playerAddress, recipeId)
            return {
                success: result[0],
                message: result[1]
            }
        } catch (err) {
            console.error('Error checking if can craft recipe:', err)
            throw err
        }
    }

    const craftItem = async (recipeId: number): Promise<void> => {
        if (!contract || !signer) {
            throw new Error('Contract or signer not available')
        }

        try {
            setIsLoading(true)
            setError(null)

            const tx = await contract.craftItem(recipeId)
            await tx.wait()
            await refreshCraftingHistory()
        } catch (err) {
            console.error('Error crafting item:', err)
            setError('Failed to craft item')
            throw err
        } finally {
            setIsLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        if (contract) {
            refreshRecipes()
            refreshSystemStats()
        }
    }, [contract])

    const value: CraftingContextType = {
        recipes,
        craftingHistory,
        systemStats,
        isLoading,
        error,
        refreshRecipes,
        refreshCraftingHistory,
        refreshSystemStats,
        createRecipe,
        updateRecipe,
        deleteRecipe,
        setRecipeActive,
        getPlayerCraftingStats,
        canCraftRecipe,
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
