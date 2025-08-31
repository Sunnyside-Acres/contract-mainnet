"use client"

import * as React from "react"
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    ColumnFiltersState,
    RowSelectionState,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "@/components/Search"
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, Zap, Shield, Heart, Star, Gauge, RefreshCw, X, Upload, Download, Clock, Hammer, CheckCircle, XCircle } from "lucide-react"
import { useCraftingContext } from "@/context/CraftingContext"
import { CraftingRecipe, CraftingIngredient } from "@/types/crafting.type"
import { useWallet } from "@/context/WalletContext"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CraftingManagerProps {
    contract?: ethers.Contract | null
    signer?: ethers.Signer | null
}

export function CraftingManager({ contract, signer }: CraftingManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<CraftingRecipe[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [selectedActiveStatus, setSelectedActiveStatus] = React.useState<string>("all")
    const { recipes, pagination, setPagination, filters, setFilters, refreshRecipes, craftItem, isLoading, error } = useCraftingContext()
    const router = useRouter()

    // Create recipe dialog state
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
    const [createFormData, setCreateFormData] = React.useState({
        resultItemId: '',
        resultQuantity: '',
        successRate: '',
        sunlightCost: '',
        sunnyCost: '',
        minPlayerLevel: '',
        ingredients: [] as Array<{ itemId: string, quantity: string }>
    })
    const [newIngredient, setNewIngredient] = React.useState({
        itemId: '',
        quantity: ''
    })

    // Edit recipe dialog state
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
    const [selectedRecipeForEdit, setSelectedRecipeForEdit] = React.useState<CraftingRecipe | null>(null)
    const [editFormData, setEditFormData] = React.useState({
        recipeId: '',
        successRate: '',
        sunlightCost: '',
        sunnyCost: '',
        minPlayerLevel: '',
        ingredients: [] as Array<{ itemId: string, quantity: string }>
    })
    const [editNewIngredient, setEditNewIngredient] = React.useState({
        itemId: '',
        quantity: ''
    })

    // Delete recipe dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [recipeToDelete, setRecipeToDelete] = React.useState<CraftingRecipe | null>(null)

    // =======================
    // 2. Filter & Bulk Actions
    // =======================
    const handleResetFilters = () => {
        setSelectedActiveStatus("all")
        setFilters({
            ...filters,
            isActive: undefined,
            minPlayerLevel: undefined,
            resultItemId: undefined
        })
    }

    const handleFilterChange = (key: string, value: any) => {
        setFilters({
            ...filters,
            [key]: value,
            page: 1 // Reset to first page when filter changes
        })
    }

    const handleActiveStatusChange = (value: string) => {
        setSelectedActiveStatus(value)
        if (value === "all") {
            handleFilterChange('isActive', undefined)
        } else {
            handleFilterChange('isActive', value === "active")
        }
    }

    const handleSearch = (value: string) => {
        setSearchValue(value);
        setFilters({
            ...filters,
            page: 1,
            search: value
        });
    };

    // Reset rowSelection when changing page
    React.useEffect(() => {
        setRowSelection({})
    }, [filters.page])

    React.useEffect(() => {
        const selectedRowIds = Object.keys(rowSelection);
        const selectedItems = recipes.filter((_, index) => selectedRowIds.includes(index.toString()));
        setSelectedRows(selectedItems);
    }, [rowSelection, recipes]);

    React.useEffect(() => {
        setFilters({
            ...filters,
            page: 1,
            limit: 10
        })
    }, []);



    const handleBulkDelete = async () => {
        try {
            console.log("Deleting recipes:", selectedRows.map(recipe => recipe.id));
            setRowSelection({});
        } catch (error) {
            console.error("Failed to delete selected recipes:", error);
        }
    };

    const handleBulkToggleActive = async (isActive: boolean) => {
        try {
            console.log(`${isActive ? 'Activating' : 'Deactivating'} recipes:`, selectedRows.map(recipe => recipe.id));
            setRowSelection({});
        } catch (error) {
            console.error(`Failed to ${isActive ? 'activate' : 'deactivate'} selected recipes:`, error);
        }
    };

    const handleCraftItem = async (recipeId: number) => {
        try {
            await craftItem(recipeId)
            alert('Crafting successful!')
        } catch (error: any) {
            alert('Crafting failed: ' + error.message)
        }
    }

    const handleCreateRecipe = async () => {
        if (!contract) return

        try {
            // Validate form data
            const resultItemId = parseInt(createFormData.resultItemId)
            const resultQuantity = parseInt(createFormData.resultQuantity)
            const successRate = parseInt(createFormData.successRate)
            const sunlightCost = parseInt(createFormData.sunlightCost)
            const sunnyCost = parseInt(createFormData.sunnyCost)
            const minPlayerLevel = parseInt(createFormData.minPlayerLevel)

            if (isNaN(resultItemId) || resultItemId <= 0) {
                alert('Result Item ID must be a positive integer')
                return
            }

            if (isNaN(resultQuantity) || resultQuantity <= 0) {
                alert('Result Quantity must be a positive integer')
                return
            }

            if (isNaN(successRate) || successRate < 0 || successRate > 10000) {
                alert('Success Rate must be between 0 and 10000 (0-100%)')
                return
            }

            if (isNaN(sunlightCost) || sunlightCost < 0) {
                alert('Sunlight Cost must be non-negative')
                return
            }

            if (isNaN(sunnyCost) || sunnyCost < 0) {
                alert('Sunny Cost must be non-negative')
                return
            }

            if (isNaN(minPlayerLevel) || minPlayerLevel < 1) {
                alert('Min Player Level must be at least 1')
                return
            }

            if (createFormData.ingredients.length === 0) {
                alert('At least one ingredient is required')
                return
            }

            // Convert ingredients to contract format
            const ingredients = createFormData.ingredients.map(ing => ({
                itemId: parseInt(ing.itemId),
                quantity: parseInt(ing.quantity)
            }))

            // Call contract to create recipe
            await contract.createRecipe(
                resultItemId,
                resultQuantity,
                successRate,
                sunlightCost,
                sunnyCost,
                ingredients,
                minPlayerLevel
            )

            // Reset form
            setCreateFormData({
                resultItemId: '',
                resultQuantity: '',
                successRate: '',
                sunlightCost: '',
                sunnyCost: '',
                minPlayerLevel: '',
                ingredients: []
            })
            setIsCreateDialogOpen(false)

            // Reload data
            await refreshRecipes()
            alert('Recipe created successfully!')
        } catch (error: any) {
            console.error('Error creating recipe:', error)
            alert('Error creating recipe: ' + (error?.reason || error?.message || 'Unknown error'))
        }
    }

    const handleAddIngredient = () => {
        if (!newIngredient.itemId || !newIngredient.quantity) {
            alert('Please fill in both Item ID and Quantity')
            return
        }

        const itemId = parseInt(newIngredient.itemId)
        const quantity = parseInt(newIngredient.quantity)

        if (isNaN(itemId) || itemId <= 0) {
            alert('Item ID must be a positive integer')
            return
        }

        if (isNaN(quantity) || quantity <= 0) {
            alert('Quantity must be a positive integer')
            return
        }

        // Check if ingredient already exists
        const existingIngredient = createFormData.ingredients.find(
            ing => parseInt(ing.itemId) === itemId
        )
        if (existingIngredient) {
            alert('This ingredient already exists in the recipe')
            return
        }

        // Add new ingredient
        setCreateFormData({
            ...createFormData,
            ingredients: [...createFormData.ingredients, { ...newIngredient }]
        })

        // Reset form
        setNewIngredient({ itemId: '', quantity: '' })
    }

    const handleRemoveIngredient = (index: number) => {
        setCreateFormData({
            ...createFormData,
            ingredients: createFormData.ingredients.filter((_, i) => i !== index)
        })
    }

    const handleClearIngredients = () => {
        setCreateFormData({
            ...createFormData,
            ingredients: []
        })
    }

    const handleEditRecipe = (recipe: CraftingRecipe) => {
        setSelectedRecipeForEdit(recipe)
        setEditFormData({
            recipeId: recipe.id.toString(),
            successRate: recipe.successRate.toString(),
            sunlightCost: recipe.sunlightCost.toString(),
            sunnyCost: recipe.sunnyCost.toString(),
            minPlayerLevel: recipe.minPlayerLevel.toString(),
            ingredients: recipe.ingredients.map(ing => ({
                itemId: ing.itemId.toString(),
                quantity: ing.quantity.toString()
            }))
        })
        setIsEditDialogOpen(true)
    }

    const handleUpdateRecipe = async () => {
        if (!contract || !selectedRecipeForEdit) return

        try {
            // Validate form data
            const successRate = parseInt(editFormData.successRate)
            const sunlightCost = parseInt(editFormData.sunlightCost)
            const sunnyCost = parseInt(editFormData.sunnyCost)
            const minPlayerLevel = parseInt(editFormData.minPlayerLevel)

            if (isNaN(successRate) || successRate < 0 || successRate > 10000) {
                alert('Success Rate must be between 0 and 10000 (0-100%)')
                return
            }

            if (isNaN(sunlightCost) || sunlightCost < 0) {
                alert('Sunlight Cost must be non-negative')
                return
            }

            if (isNaN(sunnyCost) || sunnyCost < 0) {
                alert('Sunny Cost must be non-negative')
                return
            }

            if (isNaN(minPlayerLevel) || minPlayerLevel < 1) {
                alert('Min Player Level must be at least 1')
                return
            }

            if (editFormData.ingredients.length === 0) {
                alert('At least one ingredient is required')
                return
            }

            // Convert ingredients to contract format
            const ingredients = editFormData.ingredients.map(ing => ({
                itemId: parseInt(ing.itemId),
                quantity: parseInt(ing.quantity)
            }))

            // Call contract to update recipe
            await contract.updateRecipe(
                selectedRecipeForEdit.id,
                successRate,
                sunlightCost,
                sunnyCost,
                ingredients,
                minPlayerLevel
            )

            // Reset form
            setEditFormData({
                recipeId: '',
                successRate: '',
                sunlightCost: '',
                sunnyCost: '',
                minPlayerLevel: '',
                ingredients: []
            })
            setIsEditDialogOpen(false)
            setSelectedRecipeForEdit(null)

            // Reload data
            await refreshRecipes()
            alert('Recipe updated successfully!')
        } catch (error: any) {
            console.error('Error updating recipe:', error)
            alert('Error updating recipe: ' + (error?.reason || error?.message || 'Unknown error'))
        }
    }

    const handleEditAddIngredient = () => {
        if (!editNewIngredient.itemId || !editNewIngredient.quantity) {
            alert('Please fill in both Item ID and Quantity')
            return
        }

        const itemId = parseInt(editNewIngredient.itemId)
        const quantity = parseInt(editNewIngredient.quantity)

        if (isNaN(itemId) || itemId <= 0) {
            alert('Item ID must be a positive integer')
            return
        }

        if (isNaN(quantity) || quantity <= 0) {
            alert('Quantity must be a positive integer')
            return
        }

        // Check if ingredient already exists
        const existingIngredient = editFormData.ingredients.find(
            ing => parseInt(ing.itemId) === itemId
        )
        if (existingIngredient) {
            alert('This ingredient already exists in the recipe')
            return
        }

        // Add new ingredient
        setEditFormData({
            ...editFormData,
            ingredients: [...editFormData.ingredients, { ...editNewIngredient }]
        })

        // Reset form
        setEditNewIngredient({ itemId: '', quantity: '' })
    }

    const handleEditRemoveIngredient = (index: number) => {
        setEditFormData({
            ...editFormData,
            ingredients: editFormData.ingredients.filter((_, i) => i !== index)
        })
    }

    const handleEditClearIngredients = () => {
        setEditFormData({
            ...editFormData,
            ingredients: []
        })
    }

    const handleDeleteRecipe = (recipe: CraftingRecipe) => {
        setRecipeToDelete(recipe)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDeleteRecipe = async () => {
        if (!contract || !recipeToDelete) return

        try {
            await contract.deleteRecipe(recipeToDelete.id)

            // Reset state
            setRecipeToDelete(null)
            setIsDeleteDialogOpen(false)

            // Reload data
            await refreshRecipes()
            alert('Recipe deleted successfully!')
        } catch (error: any) {
            console.error('Error deleting recipe:', error)
            alert('Error deleting recipe: ' + (error?.reason || error?.message || 'Unknown error'))
        }
    }

    // =======================
    // 3. Helper Functions
    // =======================
    const getSuccessRateColor = (successRate: number) => {
        if (successRate >= 8000) return "bg-green-100 text-green-800 border-green-200"
        if (successRate >= 6000) return "bg-blue-100 text-blue-800 border-blue-200"
        if (successRate >= 4000) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        if (successRate >= 2000) return "bg-orange-100 text-orange-800 border-orange-200"
        return "bg-red-100 text-red-800 border-red-200"
    }

    const getSuccessRateText = (successRate: number) => {
        return `${(successRate / 100).toFixed(1)}%`
    }

    const getLevelColor = (level: number) => {
        if (level <= 5) return "bg-gray-100 text-gray-800 border-gray-200"
        if (level <= 10) return "bg-green-100 text-green-800 border-green-200"
        if (level <= 20) return "bg-blue-100 text-blue-800 border-blue-200"
        if (level <= 30) return "bg-purple-100 text-purple-800 border-purple-200"
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }

    // =======================
    // 4. Table Columns
    // =======================
    const columns: ColumnDef<CraftingRecipe, any>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "id",
            header: "Recipe ID",
            cell: ({ row }) => {
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className="font-mono text-xs">
                            #{row.original.id}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Unique recipe ID" }
        },
        {
            accessorKey: "resultItemId",
            header: "Result Item",
            cell: ({ row }) => {
                return (
                    <div className="max-w-[150px]">
                        <div className="font-medium text-sm">Item #{row.original.resultItemId}</div>
                        <div className="text-xs text-muted-foreground">
                            Qty: {row.original.resultQuantity}
                        </div>
                    </div>
                )
            },
            meta: { tooltip: "Result item ID and quantity" }
        },
        {
            accessorKey: "successRate",
            header: "Success Rate",
            cell: ({ row }) => {
                const successRate = row.getValue("successRate") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${getSuccessRateColor(successRate)}`}>
                            {getSuccessRateText(successRate)}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Crafting success rate" }
        },
        {
            accessorKey: "ingredients",
            header: "Ingredients",
            cell: ({ row }) => {
                const ingredients = row.original.ingredients || []
                const ingredientCount = ingredients.length
                return (
                    <div className="w-[120px]">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                                    <Hammer className="h-3 w-3 mr-1" />
                                    {ingredientCount} items
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Required Ingredients</h4>
                                        <Badge variant="outline" className="text-xs">
                                            {ingredientCount} items
                                        </Badge>
                                    </div>
                                    <Separator />
                                    {ingredients.map((ingredient, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    #{ingredient.itemId}
                                                </Badge>
                                                <span className="text-sm font-medium">
                                                    × {ingredient.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {ingredientCount === 0 && (
                                        <div className="text-center py-4 text-muted-foreground text-sm">
                                            No ingredients required
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
            meta: { tooltip: "Required ingredients" }
        },
        {
            accessorKey: "costs",
            header: "Costs",
            cell: ({ row }) => {
                const recipe = row.original
                return (
                    <div className="w-[120px]">
                        <div className="space-y-1">
                            <div className="flex items-center text-xs">
                                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                                <span>{recipe.sunlightCost}</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <Zap className="h-3 w-3 mr-1 text-blue-500" />
                                <span>{recipe.sunnyCost}</span>
                            </div>
                        </div>
                    </div>
                )
            },
            meta: { tooltip: "Sunlight and Sunny costs" }
        },
        {
            accessorKey: "minPlayerLevel",
            header: "Min Level",
            cell: ({ row }) => {
                const level = row.getValue("minPlayerLevel") as number
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className={`text-xs ${getLevelColor(level)}`}>
                            Lv.{level}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Minimum player level required" }
        },
        {
            accessorKey: "isActive",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("isActive") as boolean
                return (
                    <div className="w-[80px]">
                        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                            {isActive ? (
                                <div className="flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                </div>
                            )}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Recipe status" }
        },
        {
            id: "actions",
            header: ({ column }) => {
                return <div className="w-[120px] text-center">Actions</div>
            },
            cell: ({ row }) => {
                return (
                    <div className="w-[120px] text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleCraftItem(row.original.id)}>
                                    <Hammer className="mr-2 h-4 w-4" />
                                    Craft Item
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditRecipe(row.original)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Recipe
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem
                                    onClick={() => handleBulkToggleActive(!row.original.isActive)}
                                    className={row.original.isActive ? "text-red-600" : "text-green-600"}
                                >
                                    {row.original.isActive ? (
                                        <>
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Activate
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDeleteRecipe(row.original)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Recipe
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
            meta: { tooltip: "Available actions" }
        },
    ]

    // =======================
    // 5. Render UI
    // =======================

    // Show loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 bg-muted rounded animate-pulse"></div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Show error state
    if (error) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-orange-600">
                            {error.includes('connect wallet') ? 'Wallet Not Connected' : 'Data Loading Error'}
                        </CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error.includes('connect wallet') ? (
                            <div className="text-center py-4">
                                <Hammer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">
                                    Please connect MetaMask wallet to view and manage crafting recipes
                                </p>
                            </div>
                        ) : (
                            <Button onClick={refreshRecipes} className="w-full">
                                Try Again
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Main Card */}
            <Card>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Search
                                placeholder="Search recipes..."
                                value={searchValue}
                                onSearch={handleSearch}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshRecipes}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="px-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                        Filters
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-6">
                                    <div className="grid gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-medium leading-none">Crafting Filters</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Select criteria to filter recipes
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleResetFilters}
                                                className="h-8"
                                            >
                                                Reset
                                            </Button>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="activeStatus" className="text-sm font-medium">Status</Label>
                                                <Select
                                                    value={selectedActiveStatus}
                                                    onValueChange={handleActiveStatusChange}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All</SelectItem>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="inactive">Inactive</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedRows.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            {selectedRows.length} selected
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => handleBulkToggleActive(true)}
                                            className="text-green-600"
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Activate selected
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleBulkToggleActive(false)}
                                            className="text-red-600"
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Deactivate selected
                                        </DropdownMenuItem>
                                        <Separator />
                                        <DropdownMenuItem
                                            onClick={() => handleBulkDelete()}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete selected
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {contract && (
                                <div className="flex gap-2">
                                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Recipe
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    {recipes.length === 0 ? (
                        <div className="text-center py-12">
                            <Hammer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                {!contract ? 'Wallet Not Connected' : 'No Recipes Found'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {!contract
                                    ? 'Please connect MetaMask wallet to view and manage crafting recipes'
                                    : 'No crafting recipes have been created in the system yet'
                                }
                            </p>
                            {contract && (
                                <Button onClick={() => { }}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create First Recipe
                                </Button>
                            )}
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={recipes}
                            searchValue={searchValue}
                            onSearch={handleSearch}
                            pagination={{
                                page: pagination.currentPage,
                                totalPages: pagination.totalPages,
                                totalItems: pagination.totalItems,
                                limit: pagination.limit,
                            }}
                            onPaginationChange={(page, limit) => setFilters({ ...filters, page, limit })}
                            selectedRows={selectedRows}
                            onRowSelectionChange={setSelectedRows}
                            showSearch={false}
                            showPagination={true}
                            showRowSelection={true}
                        />
                    )}
                </CardContent>
            </Card>



            {/* Create Recipe Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create New Crafting Recipe</DialogTitle>
                        <DialogDescription>
                            Create a new crafting recipe with required ingredients and costs
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        {/* Basic Recipe Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="resultItemId" className="text-sm font-medium">Result Item ID</Label>
                                <Input
                                    id="resultItemId"
                                    type="number"
                                    min="1"
                                    value={createFormData.resultItemId}
                                    onChange={(e) => setCreateFormData({ ...createFormData, resultItemId: e.target.value })}
                                    placeholder="Enter result item ID"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="resultQuantity" className="text-sm font-medium">Result Quantity</Label>
                                <Input
                                    id="resultQuantity"
                                    type="number"
                                    min="1"
                                    value={createFormData.resultQuantity}
                                    onChange={(e) => setCreateFormData({ ...createFormData, resultQuantity: e.target.value })}
                                    placeholder="Enter result quantity"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Success Rate */}
                        <div>
                            <Label htmlFor="successRate" className="text-sm font-medium">Success Rate (%)</Label>
                            <Input
                                id="successRate"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={createFormData.successRate ? (parseInt(createFormData.successRate) / 100).toString() : ''}
                                onChange={(e) => {
                                    const percentage = parseFloat(e.target.value)
                                    const rate = Math.round(percentage * 100)
                                    setCreateFormData({ ...createFormData, successRate: rate.toString() })
                                }}
                                placeholder="Enter success rate (0-100%)"
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Success rate from 0% to 100% (will be converted to 0-10000)
                            </p>
                        </div>

                        {/* Costs */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="sunlightCost" className="text-sm font-medium">Sunlight Cost</Label>
                                <Input
                                    id="sunlightCost"
                                    type="number"
                                    min="0"
                                    value={createFormData.sunlightCost}
                                    onChange={(e) => setCreateFormData({ ...createFormData, sunlightCost: e.target.value })}
                                    placeholder="Enter sunlight cost"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="sunnyCost" className="text-sm font-medium">Sunny Cost</Label>
                                <Input
                                    id="sunnyCost"
                                    type="number"
                                    min="0"
                                    value={createFormData.sunnyCost}
                                    onChange={(e) => setCreateFormData({ ...createFormData, sunnyCost: e.target.value })}
                                    placeholder="Enter sunny cost"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="minPlayerLevel" className="text-sm font-medium">Min Player Level</Label>
                                <Input
                                    id="minPlayerLevel"
                                    type="number"
                                    min="1"
                                    value={createFormData.minPlayerLevel}
                                    onChange={(e) => setCreateFormData({ ...createFormData, minPlayerLevel: e.target.value })}
                                    placeholder="Enter min level"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Add Ingredients */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Add Ingredients</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearIngredients}
                                    className="h-6 px-2 text-xs"
                                >
                                    Clear all
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <Label htmlFor="new-itemId" className="text-sm font-medium">Item ID</Label>
                                    <Input
                                        id="new-itemId"
                                        type="number"
                                        min="1"
                                        value={newIngredient.itemId}
                                        onChange={(e) => setNewIngredient({ ...newIngredient, itemId: e.target.value })}
                                        placeholder="ID"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="new-quantity" className="text-sm font-medium">Quantity</Label>
                                    <Input
                                        id="new-quantity"
                                        type="number"
                                        min="1"
                                        value={newIngredient.quantity}
                                        onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                                        placeholder="Qty"
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        onClick={handleAddIngredient}
                                        size="sm"
                                        disabled={!newIngredient.itemId || !newIngredient.quantity}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Current Ingredients */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Current Ingredients ({createFormData.ingredients.length})</h4>
                            </div>
                            {createFormData.ingredients.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    No ingredients added yet
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-1">
                                    {createFormData.ingredients.map((ingredient, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="text-xs">#{ingredient.itemId}</Badge>
                                                <span className="text-sm font-medium">
                                                    × {ingredient.quantity}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveIngredient(index)}
                                                className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRecipe}
                            disabled={
                                !createFormData.resultItemId ||
                                !createFormData.resultQuantity ||
                                !createFormData.successRate ||
                                createFormData.ingredients.length === 0
                            }
                        >
                            Create Recipe
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Recipe Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Crafting Recipe</DialogTitle>
                        <DialogDescription>
                            Update recipe {selectedRecipeForEdit?.id} (Result: Item #{selectedRecipeForEdit?.resultItemId} × {selectedRecipeForEdit?.resultQuantity})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        {/* Recipe Info (Read-only) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium">Recipe ID</Label>
                                <Input
                                    value={editFormData.recipeId}
                                    disabled
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Recipe ID cannot be changed
                                </p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Result Item</Label>
                                <Input
                                    value={`Item #${selectedRecipeForEdit?.resultItemId} × ${selectedRecipeForEdit?.resultQuantity}`}
                                    disabled
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Result item cannot be changed
                                </p>
                            </div>
                        </div>

                        {/* Success Rate */}
                        <div>
                            <Label htmlFor="edit-successRate" className="text-sm font-medium">Success Rate (%)</Label>
                            <Input
                                id="edit-successRate"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={editFormData.successRate ? (parseInt(editFormData.successRate) / 100).toString() : ''}
                                onChange={(e) => {
                                    const percentage = parseFloat(e.target.value)
                                    const rate = Math.round(percentage * 100)
                                    setEditFormData({ ...editFormData, successRate: rate.toString() })
                                }}
                                placeholder="Enter success rate (0-100%)"
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Success rate from 0% to 100% (will be converted to 0-10000)
                            </p>
                        </div>

                        {/* Costs */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="edit-sunlightCost" className="text-sm font-medium">Sunlight Cost</Label>
                                <Input
                                    id="edit-sunlightCost"
                                    type="number"
                                    min="0"
                                    value={editFormData.sunlightCost}
                                    onChange={(e) => setEditFormData({ ...editFormData, sunlightCost: e.target.value })}
                                    placeholder="Enter sunlight cost"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-sunnyCost" className="text-sm font-medium">Sunny Cost</Label>
                                <Input
                                    id="edit-sunnyCost"
                                    type="number"
                                    min="0"
                                    value={editFormData.sunnyCost}
                                    onChange={(e) => setEditFormData({ ...editFormData, sunnyCost: e.target.value })}
                                    placeholder="Enter sunny cost"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-minPlayerLevel" className="text-sm font-medium">Min Player Level</Label>
                                <Input
                                    id="edit-minPlayerLevel"
                                    type="number"
                                    min="1"
                                    value={editFormData.minPlayerLevel}
                                    onChange={(e) => setEditFormData({ ...editFormData, minPlayerLevel: e.target.value })}
                                    placeholder="Enter min level"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Add Ingredients */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Add Ingredients</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleEditClearIngredients}
                                    className="h-6 px-2 text-xs"
                                >
                                    Clear all
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <Label htmlFor="edit-new-itemId" className="text-sm font-medium">Item ID</Label>
                                    <Input
                                        id="edit-new-itemId"
                                        type="number"
                                        min="1"
                                        value={editNewIngredient.itemId}
                                        onChange={(e) => setEditNewIngredient({ ...editNewIngredient, itemId: e.target.value })}
                                        placeholder="ID"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-new-quantity" className="text-sm font-medium">Quantity</Label>
                                    <Input
                                        id="edit-new-quantity"
                                        type="number"
                                        min="1"
                                        value={editNewIngredient.quantity}
                                        onChange={(e) => setEditNewIngredient({ ...editNewIngredient, quantity: e.target.value })}
                                        placeholder="Qty"
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        onClick={handleEditAddIngredient}
                                        size="sm"
                                        disabled={!editNewIngredient.itemId || !editNewIngredient.quantity}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Current Ingredients */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Current Ingredients ({editFormData.ingredients.length})</h4>
                            </div>
                            {editFormData.ingredients.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    No ingredients added yet
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-1">
                                    {editFormData.ingredients.map((ingredient, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="text-xs">#{ingredient.itemId}</Badge>
                                                <span className="text-sm font-medium">
                                                    × {ingredient.quantity}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditRemoveIngredient(index)}
                                                className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateRecipe}
                            disabled={
                                !editFormData.successRate ||
                                editFormData.ingredients.length === 0
                            }
                        >
                            Update Recipe
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Recipe Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDeleteRecipe}
                title="Delete Recipe"
                description={
                    recipeToDelete ?
                        `Are you sure you want to delete recipe #${recipeToDelete.id}? This action cannot be undone.` :
                        "Are you sure you want to delete this recipe?"
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />
        </div>
    )
}
