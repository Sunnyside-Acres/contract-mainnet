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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, Zap, Shield, Heart, Star, Gauge, RefreshCw, X, Hammer, Package, Sun, Coins, CheckCircle, XCircle, Crown } from "lucide-react"
import { useCraftingContext } from "@/context/CraftingContext"
import { CraftingRecipe } from "@/types/crafting.type"
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
import { ethers } from "ethers"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateRecipeDialog } from "@/components/CreateRecipeDialog"

interface CraftingManagerProps {
    signer?: ethers.Signer | null
}

export function CraftingManager({ signer }: CraftingManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<CraftingRecipe[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [minSuccessRate, setMinSuccessRate] = React.useState<string>("")
    const [maxSuccessRate, setMaxSuccessRate] = React.useState<string>("")
    const [minSunlightCost, setMinSunlightCost] = React.useState<string>("")
    const [maxSunlightCost, setMaxSunlightCost] = React.useState<string>("")
    const [minSunnyCost, setMinSunnyCost] = React.useState<string>("")
    const [maxSunnyCost, setMaxSunnyCost] = React.useState<string>("")
    const [minPlayerLevel, setMinPlayerLevel] = React.useState<string>("")
    const [maxPlayerLevel, setMaxPlayerLevel] = React.useState<string>("")
    const [statusFilter, setStatusFilter] = React.useState<string>("all")

    const {
        recipes,
        isLoading,
        error,
        refreshRecipes,
        createRecipe,
        deleteRecipe,
        setRecipeActive,
        craftItem
    } = useCraftingContext()

    // =======================
    // 2. Filter & Bulk Actions
    // =======================
    const handleResetFilters = () => {
        setMinSuccessRate("")
        setMaxSuccessRate("")
        setMinSunlightCost("")
        setMaxSunlightCost("")
        setMinSunnyCost("")
        setMaxSunnyCost("")
        setMinPlayerLevel("")
        setMaxPlayerLevel("")
        setStatusFilter("all")
    }

    const handleSearch = (value: string) => {
        setSearchValue(value);
    };

    // Reset rowSelection when changing page
    React.useEffect(() => {
        setRowSelection({})
    }, [])

    React.useEffect(() => {
        const selectedRowIds = Object.keys(rowSelection);
        const selectedRecipes = recipes.filter((_, index) => selectedRowIds.includes(index.toString()));
        setSelectedRows(selectedRecipes);
    }, [rowSelection, recipes]);

    const handleBulkDelete = async () => {
        try {
            console.log("Deleting recipes:", selectedRows.map(recipe => recipe.id));
            for (const recipe of selectedRows) {
                await deleteRecipe(recipe.id);
            }
            setRowSelection({});
            alert('Selected recipes deleted successfully!')
        } catch (error) {
            console.error("Failed to delete selected recipes:", error);
            alert('Error deleting recipes: ' + (error as Error).message)
        }
    };

    const handleCreateRecipe = async (formData: {
        resultItemId: number
        resultQuantity: number
        successRate: number
        sunlightCost: number
        sunnyCost: number
        ingredients: { itemId: number; quantity: number }[]
        minPlayerLevel: number
    }) => {
        try {
            await createRecipe(formData)
            alert('Recipe created successfully!')
        } catch (error) {
            console.error('Error creating recipe:', error)
            alert('Error creating recipe: ' + (error as Error).message)
            throw error
        }
    }

    const handleEditRecipe = (recipe: CraftingRecipe) => {
        // TODO: Implement edit functionality
        alert('Edit functionality will be implemented soon')
    }

    const handleToggleActive = async (recipeId: number, currentStatus: boolean) => {
        try {
            await setRecipeActive(recipeId, !currentStatus)
        } catch (error) {
            console.error('Error toggling recipe status:', error)
            alert('Error toggling recipe status: ' + (error as Error).message)
        }
    }

    const handleCraftItem = async (recipeId: number) => {
        try {
            await craftItem(recipeId)
            alert('Crafting completed! Check your inventory.')
        } catch (error) {
            console.error('Error crafting item:', error)
            alert('Error crafting item: ' + (error as Error).message)
        }
    }

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
            meta: { tooltip: "Recipe ID" }
        },
        {
            accessorKey: "resultItemId",
            header: "Item Kết Quả",
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
            meta: { tooltip: "Result item ID" }
        },
        {
            accessorKey: "resultQuantity",
            header: "Số Lượng",
            cell: ({ row }) => {
                return (
                    <div className="w-[80px] text-center">
                        <Badge variant="outline" className="text-xs">
                            x{row.getValue("resultQuantity")}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Result quantity" }
        },
        {
            accessorKey: "successRate",
            header: "Tỷ Lệ Thành Công",
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
            meta: { tooltip: "Success rate percentage" }
        },
        {
            accessorKey: "sunlightCost",
            header: "Chi Phí Sunlight",
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
            meta: { tooltip: "Sunlight cost" }
        },
        {
            accessorKey: "sunnyCost",
            header: "Chi Phí Sunny",
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
            meta: { tooltip: "Sunny cost" }
        },
        {
            accessorKey: "minPlayerLevel",
            header: "Cấp Độ Tối Thiểu",
            cell: ({ row }) => {
                const level = row.getValue("minPlayerLevel") as number
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className={`text-xs ${getLevelColor(level)}`}>
                            <Crown className="h-3 w-3 mr-1" />
                            {level}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Minimum player level required" }
        },
        {
            accessorKey: "isActive",
            header: "Trạng Thái",
            cell: ({ row }) => {
                const isActive = row.getValue("isActive") as boolean
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(isActive)}`}>
                            {isActive ? (
                                <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Hoạt động
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Không hoạt động
                                </>
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
                return <div className="w-[120px] text-center">Thao Tác</div>
            },
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
                                <DropdownMenuItem onClick={() => handleCraftItem(recipe.id)}>
                                    <Hammer className="mr-2 h-4 w-4" />
                                    Craft Item
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditRecipe(recipe)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Chỉnh Sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(recipe.id, recipe.isActive)}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    {recipe.isActive ? 'Tắt' : 'Bật'}
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (confirm(`Bạn có chắc chắn muốn xóa công thức #${recipe.id}?`)) {
                                            deleteRecipe(recipe.id)
                                        }
                                    }}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Xóa Công Thức
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
    // 5. Dialog State
    // =======================
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

    // =======================
    // 6. Render UI
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
                                placeholder="Tìm kiếm công thức..."
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
                                Làm mới
                            </Button>
                            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="px-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                        Bộ lọc
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[600px] p-6">
                                    <div className="grid gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-medium leading-none">Bộ Lọc Công Thức</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Chọn tiêu chí để lọc công thức
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleResetFilters}
                                                className="h-8"
                                            >
                                                Đặt lại
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="minSuccessRate" className="text-sm font-medium">Tỷ Lệ Thành Công Tối Thiểu (%)</Label>
                                                    <Input
                                                        id="minSuccessRate"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={minSuccessRate}
                                                        onChange={(e) => setMinSuccessRate(e.target.value)}
                                                        placeholder="Tỷ lệ tối thiểu"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxSuccessRate" className="text-sm font-medium">Tỷ Lệ Thành Công Tối Đa (%)</Label>
                                                    <Input
                                                        id="maxSuccessRate"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={maxSuccessRate}
                                                        onChange={(e) => setMaxSuccessRate(e.target.value)}
                                                        placeholder="Tỷ lệ tối đa"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="minSunlightCost" className="text-sm font-medium">Chi Phí Sunlight Tối Thiểu</Label>
                                                    <Input
                                                        id="minSunlightCost"
                                                        type="number"
                                                        min="0"
                                                        value={minSunlightCost}
                                                        onChange={(e) => setMinSunlightCost(e.target.value)}
                                                        placeholder="Chi phí tối thiểu"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxSunlightCost" className="text-sm font-medium">Chi Phí Sunlight Tối Đa</Label>
                                                    <Input
                                                        id="maxSunlightCost"
                                                        type="number"
                                                        min="0"
                                                        value={maxSunlightCost}
                                                        onChange={(e) => setMaxSunlightCost(e.target.value)}
                                                        placeholder="Chi phí tối đa"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="minSunnyCost" className="text-sm font-medium">Chi Phí Sunny Tối Thiểu</Label>
                                                    <Input
                                                        id="minSunnyCost"
                                                        type="number"
                                                        min="0"
                                                        value={minSunnyCost}
                                                        onChange={(e) => setMinSunnyCost(e.target.value)}
                                                        placeholder="Chi phí tối thiểu"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxSunnyCost" className="text-sm font-medium">Chi Phí Sunny Tối Đa</Label>
                                                    <Input
                                                        id="maxSunnyCost"
                                                        type="number"
                                                        min="0"
                                                        value={maxSunnyCost}
                                                        onChange={(e) => setMaxSunnyCost(e.target.value)}
                                                        placeholder="Chi phí tối đa"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="minPlayerLevel" className="text-sm font-medium">Cấp Độ Player Tối Thiểu</Label>
                                                    <Input
                                                        id="minPlayerLevel"
                                                        type="number"
                                                        min="1"
                                                        value={minPlayerLevel}
                                                        onChange={(e) => setMinPlayerLevel(e.target.value)}
                                                        placeholder="Cấp độ tối thiểu"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxPlayerLevel" className="text-sm font-medium">Cấp Độ Player Tối Đa</Label>
                                                    <Input
                                                        id="maxPlayerLevel"
                                                        type="number"
                                                        min="1"
                                                        value={maxPlayerLevel}
                                                        onChange={(e) => setMaxPlayerLevel(e.target.value)}
                                                        placeholder="Cấp độ tối đa"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="statusFilter" className="text-sm font-medium">Trạng Thái</Label>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn trạng thái" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tất cả</SelectItem>
                                                    <SelectItem value="active">Hoạt động</SelectItem>
                                                    <SelectItem value="inactive">Không hoạt động</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={() => setIsFilterOpen(false)}>
                                                Áp Dụng Bộ Lọc
                                            </Button>
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
                                            {selectedRows.length} đã chọn
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Xóa công thức đã chọn
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo Công Thức Mới
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    {recipes.length === 0 ? (
                        <div className="text-center py-12">
                            <Hammer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                Không Tìm Thấy Công Thức
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Chưa có công thức nào được tạo trong hệ thống
                            </p>
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo Công Thức Đầu Tiên
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={recipes}
                            searchValue={searchValue}
                            onSearch={handleSearch}
                            pagination={{
                                page: 1,
                                totalPages: 1,
                                totalItems: recipes.length,
                                limit: 10,
                            }}
                            onPaginationChange={() => { }}
                            selectedRows={selectedRows}
                            onRowSelectionChange={setSelectedRows}
                            showSearch={false}
                            showPagination={true}
                            showRowSelection={true}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialogs */}
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleBulkDelete}
                title="Xóa Công Thức"
                description={`Bạn có chắc chắn muốn xóa ${selectedRows.length} công thức đã chọn? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                variant="destructive"
            />

            {/* Create Recipe Dialog */}
            <CreateRecipeDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSubmit={handleCreateRecipe}
                isLoading={isLoading}
            />
        </div>
    )
}
