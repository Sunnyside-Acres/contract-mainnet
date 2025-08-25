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
import { Search } from "@/components/Search"
import { MoreHorizontal, Settings, Zap, Sun, Coins, Package, Hammer, CheckCircle, XCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ethers } from "ethers"
import { CraftingRecipe, CraftingIngredient } from "@/types/crafting.type"

interface CraftingTableProps {
    contract?: ethers.Contract | null
    signer?: ethers.Signer | null
}

export function CraftingTable({ contract, signer }: CraftingTableProps) {
    // =======================
    // 1. State
    // =======================
    const [recipes, setRecipes] = React.useState<CraftingRecipe[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [searchValue, setSearchValue] = React.useState("")

    // =======================
    // 2. Load Data
    // =======================
    const loadRecipes = React.useCallback(async () => {
        if (!contract) return

        setIsLoading(true)
        setError(null)

        try {
            console.log('Loading crafting recipes...')
            const recipesData = await contract.getAllRecipes()
            console.log('Recipes loaded:', recipesData)

            const formattedRecipes: CraftingRecipe[] = recipesData.map((recipe: unknown) => {
                const r = recipe as {
                    id: { toString(): string }
                    resultItemId: { toString(): string }
                    resultQuantity: { toString(): string }
                    successRate: { toString(): string }
                    sunlightCost: { toString(): string }
                    sunnyCost: { toString(): string }
                    ingredients: Array<{
                        itemId: { toString(): string }
                        quantity: { toString(): string }
                    }>
                    isActive: boolean
                    minPlayerLevel: { toString(): string }
                }
                return {
                    id: Number(r.id),
                    resultItemId: Number(r.resultItemId),
                    resultQuantity: Number(r.resultQuantity),
                    successRate: Number(r.successRate),
                    sunlightCost: Number(r.sunlightCost),
                    sunnyCost: Number(r.sunnyCost),
                    ingredients: r.ingredients.map((ing) => ({
                        itemId: Number(ing.itemId),
                        quantity: Number(ing.quantity)
                    })),
                    isActive: r.isActive,
                    minPlayerLevel: Number(r.minPlayerLevel)
                }
            })

            setRecipes(formattedRecipes)
        } catch (err) {
            console.error('Error loading recipes:', err)
            setError('Failed to load recipes')
        } finally {
            setIsLoading(false)
        }
    }, [contract])

    React.useEffect(() => {
        loadRecipes()
    }, [loadRecipes])

    // =======================
    // 3. Helper Functions
    // =======================
    const formatSuccessRate = (rate: number) => {
        return `${(rate / 100).toFixed(1)}%`
    }

    const getStatusColor = (isActive: boolean) => {
        return isActive
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-red-100 text-red-800 border-red-200"
    }

    const getLevelColor = (level: number) => {
        if (level >= 50) return "bg-purple-100 text-purple-800 border-purple-200"
        if (level >= 30) return "bg-blue-100 text-blue-800 border-blue-200"
        if (level >= 20) return "bg-green-100 text-green-800 border-green-200"
        if (level >= 10) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        return "bg-gray-100 text-gray-800 border-gray-200"
    }

    const handleCraft = async (recipeId: number) => {
        if (!contract || !signer) {
            alert('Contract or signer not available')
            return
        }

        try {
            console.log('Crafting recipe:', recipeId)
            const tx = await contract.craftItem(recipeId)
            await tx.wait()
            console.log('Crafting completed successfully')
            alert('Crafting completed! Check your inventory.')
        } catch (error) {
            console.error('Error crafting:', error)
            alert('Error crafting: ' + (error as Error).message)
        }
    }

    const handleToggleActive = async (recipeId: number, currentStatus: boolean) => {
        if (!contract || !signer) {
            alert('Contract or signer not available')
            return
        }

        try {
            console.log('Toggling recipe status:', recipeId, !currentStatus)
            const tx = await contract.setRecipeActive(recipeId, !currentStatus)
            await tx.wait()
            console.log('Recipe status updated successfully')
            await loadRecipes() // Reload data
        } catch (error) {
            console.error('Error updating recipe status:', error)
            alert('Error updating recipe status: ' + (error as Error).message)
        }
    }

    const handleSearch = (value: string) => {
        setSearchValue(value)
        // Implement search logic here if needed
    }

    // =======================
    // 4. Table Columns
    // =======================
    const columns: ColumnDef<CraftingRecipe, unknown>[] = [
        {
            accessorKey: "id",
            header: "ID",
            cell: ({ row }) => {
                return (
                    <div className="w-[60px]">
                        <Badge variant="outline" className="font-mono text-xs">
                            #{row.getValue("id")}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "resultItemId",
            header: "Result Item",
            cell: ({ row }) => {
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            #{row.getValue("resultItemId")}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "resultQuantity",
            header: "Quantity",
            cell: ({ row }) => {
                return (
                    <div className="w-[80px] text-center">
                        <Badge variant="outline" className="text-xs">
                            x{row.getValue("resultQuantity")}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "successRate",
            header: "Success Rate",
            cell: ({ row }) => {
                const rate = row.getValue("successRate") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className="text-xs">
                            {formatSuccessRate(rate)}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "sunlightCost",
            header: "Sunlight Cost",
            cell: ({ row }) => {
                const cost = row.getValue("sunlightCost") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className="text-xs">
                            <Sun className="h-3 w-3 mr-1" />
                            {cost.toLocaleString()}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "sunnyCost",
            header: "Sunny Cost",
            cell: ({ row }) => {
                const cost = row.getValue("sunnyCost") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className="text-xs">
                            <Coins className="h-3 w-3 mr-1" />
                            {cost.toLocaleString()}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "minPlayerLevel",
            header: "Min Level",
            cell: ({ row }) => {
                const level = row.getValue("minPlayerLevel") as number
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className={`text-xs ${getLevelColor(level)}`}>
                            {level}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "isActive",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("isActive") as boolean
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(isActive)}`}>
                            {isActive ? (
                                <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                </>
                            )}
                        </Badge>
                    </div>
                )
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const recipe = row.original
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
                                <DropdownMenuItem onClick={() => handleCraft(recipe.id)}>
                                    <Hammer className="mr-2 h-4 w-4" />
                                    Craft Item
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(recipe.id, recipe.isActive)}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    {recipe.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    // =======================
    // 5. Table Configuration
    // =======================
    const table = useReactTable({
        data: recipes,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        state: {
            sorting,
            columnFilters,
        },
    })

    // =======================
    // 6. Render
    // =======================
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Crafting Recipes</CardTitle>
                    <CardDescription>Loading recipes...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Crafting Recipes</CardTitle>
                    <CardDescription>Error loading recipes</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <div className="text-red-500">{error}</div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Crafting Recipes</CardTitle>
                        <CardDescription>
                            Manage and view all crafting recipes in the system
                        </CardDescription>
                    </div>
                    <Button onClick={loadRecipes} variant="outline" size="sm">
                        <Zap className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Search */}
                    <div className="flex items-center space-x-2">
                        <Search
                            placeholder="Search recipes..."
                            value={searchValue}
                            onSearch={handleSearch}
                            className="max-w-sm"
                        />
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center"
                                        >
                                            No recipes found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            {table.getFilteredSelectedRowModel().rows.length} of{" "}
                            {table.getFilteredRowModel().rows.length} row(s) selected.
                        </div>
                        <div className="space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
