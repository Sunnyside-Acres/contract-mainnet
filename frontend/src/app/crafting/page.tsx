"use client"

import * as React from "react"
import { useContractAddresses } from "@/hooks/useContractAddresses"
import { useWallet } from "@/context/WalletContext"
import { ethers } from "ethers"
import { PageLayout } from "@/components/PageLayout"
import { PageHeader } from "@/components/PageHeader"
import { WalletSelector } from "@/components/WalletSelector"
import { CraftingProvider } from "@/context/CraftingContext"
import { CraftingManager } from "@/views/crafting/CraftingManager"

// ABI cho CraftingLogic contract
const CRAFTING_ABI = [
    // Events
    "event CraftingCompleted(address indexed player, uint256 indexed recipeId, uint256 resultItemId, uint256 resultQuantity, bool isSuccess)",
    "event RecipeCreated(uint256 indexed recipeId, uint256 indexed resultItemId, uint256 successRate, uint256 sunlightCost, uint256 sunnyCost)",
    "event RecipeUpdated(uint256 indexed recipeId, uint256 successRate, uint256 sunlightCost, uint256 sunnyCost)",
    "event RecipeDeleted(uint256 indexed recipeId)",
    "event RecipeStatusChanged(uint256 indexed recipeId, bool isActive)",

    // Admin functions
    "function createRecipe(uint256 _resultItemId, uint256 _resultQuantity, uint256 _successRate, uint256 _sunlightCost, uint256 _sunnyCost, tuple(uint256 itemId, uint256 quantity)[] _ingredients, uint256 _minPlayerLevel) external returns (uint256)",
    "function updateRecipe(uint256 _recipeId, uint256 _successRate, uint256 _sunlightCost, uint256 _sunnyCost, tuple(uint256 itemId, uint256 quantity)[] _ingredients, uint256 _minPlayerLevel) external",
    "function deleteRecipe(uint256 _recipeId) external",
    "function setRecipeActive(uint256 _recipeId, bool _isActive) external",

    // Player functions
    "function craftItem(uint256 _recipeId) external",

    // View functions
    "function getAllRecipes() external view returns (tuple(uint256 id, uint256 resultItemId, uint256 resultQuantity, uint256 successRate, uint256 sunlightCost, uint256 sunnyCost, tuple(uint256 itemId, uint256 quantity)[] ingredients, bool isActive, uint256 minPlayerLevel)[] memory)",
    "function getActiveRecipes() external view returns (tuple(uint256 id, uint256 resultItemId, uint256 resultQuantity, uint256 successRate, uint256 sunlightCost, uint256 sunnyCost, tuple(uint256 itemId, uint256 quantity)[] ingredients, bool isActive, uint256 minPlayerLevel)[] memory)",
    "function getPlayerCraftingHistory(address _player) external view returns (tuple(address player, uint256 recipeId, uint256 resultItemId, uint256 resultQuantity, bool isSuccess, uint256 timestamp, uint256 sunlightSpent, uint256 sunnySpent)[] memory)",
    "function canCraftRecipe(address _player, uint256 _recipeId) external view returns (bool, string memory)",
    "function getRecipeDetails(uint256 _recipeId) external view returns (tuple(uint256 id, uint256 resultItemId, uint256 resultQuantity, uint256 successRate, uint256 sunlightCost, uint256 sunnyCost, tuple(uint256 itemId, uint256 quantity)[] ingredients, bool isActive, uint256 minPlayerLevel) memory recipe)",
    "function getPlayerCraftingStats(address _player) external view returns (uint256 totalCrafts, uint256 successfulCrafts, uint256 successRate)",
    "function getAvailableRecipesForPlayer(address _player) external view returns (tuple(uint256 id, uint256 resultItemId, uint256 resultQuantity, uint256 successRate, uint256 sunlightCost, uint256 sunnyCost, tuple(uint256 itemId, uint256 quantity)[] ingredients, bool isActive, uint256 minPlayerLevel)[] memory)",
    "function getCraftingSystemStats() external view returns (uint256 totalRecipes, uint256 activeRecipes, uint256 totalCrafts, uint256 totalSuccessfulCrafts)"
]

export default function CraftingPage() {
    const { signer, provider, selectedNetwork } = useWallet()
    const { addresses: contractAddresses } = useContractAddresses(selectedNetwork || 'local')

    // Debug logging
    React.useEffect(() => {
        console.log('CraftingPage Debug Info:')
        console.log('- selectedNetwork:', selectedNetwork)
        console.log('- contractAddresses:', contractAddresses)
        console.log('- CraftingLogic address:', contractAddresses?.contracts.CraftingLogic)
        console.log('- provider:', provider)
        console.log('- signer:', signer)
    }, [selectedNetwork, contractAddresses, provider, signer])

    // Tạo contract instance với signer cho write operations
    const craftingContractWithSigner = React.useMemo(() => {
        if (!contractAddresses?.contracts.CraftingLogic || !signer) {
            console.log('Missing CraftingLogic address or signer for write operations')
            console.log('- CraftingLogic address:', contractAddresses?.contracts.CraftingLogic)
            console.log('- signer:', signer)
            return null
        }

        try {
            console.log('Creating CraftingLogic contract with signer for write operations')
            return new ethers.Contract(
                contractAddresses.contracts.CraftingLogic,
                CRAFTING_ABI,
                signer
            )
        } catch (error) {
            console.error('Error creating crafting contract with signer:', error)
            return null
        }
    }, [contractAddresses?.contracts.CraftingLogic, signer])

    if (!contractAddresses?.contracts.CraftingLogic || contractAddresses.contracts.CraftingLogic === '0x0000000000000000000000000000000000000000') {
        return (
            <PageLayout title="Crafting System">
                <PageHeader title="Crafting System" />
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Crafting System chưa sẵn sàng</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Crafting contracts chưa được deploy hoặc không tìm thấy địa chỉ.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Vui lòng deploy các contract CraftingComponent, CraftingLogic, và CraftingProxy trước.
                        </p>
                        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
                            <p><strong>Debug Info:</strong></p>
                            <p>Network: {selectedNetwork || 'Not selected'}</p>
                            <p>Contract Address: {contractAddresses?.contracts.CraftingLogic || 'Not found'}</p>
                        </div>
                    </div>
                </div>
            </PageLayout>
        )
    }

    if (!signer) {
        return (
            <PageLayout title="Crafting System">
                <PageHeader title="Crafting System" />
                <div className="flex flex-col items-center justify-center h-64 space-y-6">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Kết nối Ví</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Vui lòng kết nối wallet để sử dụng Crafting System.
                        </p>
                    </div>
                    <WalletSelector />
                </div>
            </PageLayout>
        )
    }

    return (
        <PageLayout
            title="Quản lý Crafting"
            networkInfo={contractAddresses ? {
                network: contractAddresses.network,
                chainId: contractAddresses.chainId
            } : undefined}
        >
            <CraftingProvider contract={craftingContractWithSigner} signer={signer}>
                <CraftingManager signer={signer} />
            </CraftingProvider>
        </PageLayout>
    )
}
