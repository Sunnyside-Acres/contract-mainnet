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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, Store, Clock, Package, DollarSign, Users, RefreshCw, X, ShoppingCart, TrendingUp, TrendingDown, Filter, Edit3 } from "lucide-react"
import { useNPCMarketContext } from "@/context/NPCMarketContext"
import { NPCMarket, MarketItemView } from "@/types/npcmarket.type"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface NPCMarketItemsManagerProps {
    signer?: ethers.Signer | null
}

export function NPCMarketItemsManager({ signer }: NPCMarketItemsManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<MarketItemView[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [selectedNPCId, setSelectedNPCId] = React.useState<number | null>(null)
    const [isLoadingItems, setIsLoadingItems] = React.useState(false)

    // Auto-select NPC from URL parameter
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const npcIdParam = urlParams.get('npcId')
        if (npcIdParam) {
            const npcId = parseInt(npcIdParam)
            if (!isNaN(npcId)) {
                setSelectedNPCId(npcId)
            }
        }
    }, [])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const {
        npcMarkets,
        marketItems,
        isLoading,
        error,
        contract,
        refreshNPCMarkets,
        loadMarketItems,
        addItemToMarket,
        updateItemInMarket,
        removeItemFromMarket
    } = useNPCMarketContext()

    // =======================
    // 2. Dialog States
    // =======================
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = React.useState(false)
    const [isEditItemDialogOpen, setIsEditItemDialogOpen] = React.useState(false)
    const [isQuickEditPriceDialogOpen, setIsQuickEditPriceDialogOpen] = React.useState(false)
    const [isBulkPriceUpdateDialogOpen, setIsBulkPriceUpdateDialogOpen] = React.useState(false)
    const [selectedItem, setSelectedItem] = React.useState<MarketItemView | null>(null)

    const [addItemFormData, setAddItemFormData] = React.useState({
        itemId: '',
        limitPerUser: '',
        pricePerUnit: '',
        isSelling: true
    })

    const [editItemFormData, setEditItemFormData] = React.useState({
        limitPerUser: '',
        pricePerUnit: ''
    })

    const [quickEditPriceFormData, setQuickEditPriceFormData] = React.useState({
        pricePerUnit: ''
    })

    const [bulkPriceUpdateFormData, setBulkPriceUpdateFormData] = React.useState({
        pricePerUnit: '',
        percentageChange: ''
    })

    // =======================
    // 3. Data Management
    // =======================
    const currentItems = selectedNPCId && marketItems[selectedNPCId] ? marketItems[selectedNPCId] : []

    // Debug: Log current items
    React.useEffect(() => {
        console.log('currentItems updated:', currentItems)
        console.log('selectedNPCId:', selectedNPCId)
        console.log('marketItems:', marketItems)
    }, [currentItems, selectedNPCId, marketItems])

    // Load items when NPC is selected (only once)
    React.useEffect(() => {
        console.log('useEffect triggered - selectedNPCId:', selectedNPCId, 'contract:', !!contract)
        if (selectedNPCId && contract) {
            console.log('Loading market items for NPC:', selectedNPCId)
            setIsLoadingItems(true)
            loadMarketItems(selectedNPCId).finally(() => {
                setIsLoadingItems(false)
            })
        }
    }, [selectedNPCId, loadMarketItems, contract]) // Depend on selectedNPCId, loadMarketItems and contract

    // Reset selection when NPC changes
    React.useEffect(() => {
        setRowSelection({})
    }, [selectedNPCId])

    // Update selected rows when rowSelection or currentItems change
    React.useEffect(() => {
        const selectedRowIds = Object.keys(rowSelection);
        const selectedItems = currentItems.filter((_, index) => selectedRowIds.includes(index.toString()));
        setSelectedRows(selectedItems);
    }, [rowSelection]);

    // Function to load market items manually
    const handleLoadMarketItems = React.useCallback(async () => {
        if (!selectedNPCId) return
        setIsLoadingItems(true)
        try {
            await loadMarketItems(selectedNPCId)
        } finally {
            setIsLoadingItems(false)
        }
    }, [selectedNPCId, loadMarketItems])

    // =======================
    // 4. Helper Functions
    // =======================
    const getItemCountColor = (count: number) => {
        if (count >= 20) return "bg-purple-100 text-purple-800 border-purple-200"
        if (count >= 10) return "bg-blue-100 text-blue-800 border-blue-200"
        if (count >= 5) return "bg-green-100 text-green-800 border-green-200"
        return "bg-gray-100 text-gray-800 border-gray-200"
    }

    const getPriceColor = (price: number) => {
        if (price >= 1000) return "bg-red-100 text-red-800 border-red-200"
        if (price >= 500) return "bg-orange-100 text-orange-800 border-orange-200"
        if (price >= 100) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        return "bg-green-100 text-green-800 border-green-200"
    }

    // =======================
    // 5. Action Handlers
    // =======================
    const handleAddItem = async () => {
        if (!selectedNPCId) return

        try {
            const itemId = parseInt(addItemFormData.itemId)
            const limitPerUser = parseInt(addItemFormData.limitPerUser)
            const pricePerUnit = parseInt(addItemFormData.pricePerUnit)

            if (itemId <= 0) {
                alert('Item ID must be greater than 0')
                return
            }

            if (limitPerUser < 0) {
                alert('Limit per user cannot be negative')
                return
            }

            if (pricePerUnit < 0) {
                alert('Price per unit cannot be negative')
                return
            }

            await addItemToMarket(
                selectedNPCId,
                itemId,
                limitPerUser,
                pricePerUnit,
                addItemFormData.isSelling
            )

            setAddItemFormData({
                itemId: '',
                limitPerUser: '',
                pricePerUnit: '',
                isSelling: true
            })
            setIsAddItemDialogOpen(false)
        } catch (error) {
            console.error('Error adding item:', error)
            alert('Error adding item: ' + (error as Error).message)
        }
    }

    const handleEditItem = (item: MarketItemView) => {
        setSelectedItem(item)
        setEditItemFormData({
            limitPerUser: item.limitPerUser.toString(),
            pricePerUnit: item.pricePerUnit.toString()
        })
        setIsEditItemDialogOpen(true)
    }

    const handleUpdateItem = async () => {
        if (!selectedNPCId || !selectedItem) return

        try {
            const limitPerUser = parseInt(editItemFormData.limitPerUser)
            const pricePerUnit = parseInt(editItemFormData.pricePerUnit)

            if (limitPerUser < 0) {
                alert('Limit per user cannot be negative')
                return
            }

            if (pricePerUnit < 0) {
                alert('Price per unit cannot be negative')
                return
            }

            await updateItemInMarket(
                selectedNPCId,
                selectedItem.itemId,
                limitPerUser,
                pricePerUnit
            )

            setEditItemFormData({
                limitPerUser: '',
                pricePerUnit: ''
            })
            setIsEditItemDialogOpen(false)
            setSelectedItem(null)
        } catch (error) {
            console.error('Error updating item:', error)
            alert('Error updating item: ' + (error as Error).message)
        }
    }

    const handleDeleteItem = async (item: MarketItemView) => {
        if (!selectedNPCId) return

        if (confirm(`Are you sure you want to remove Item #${item.itemId} from NPC ${selectedNPCId}?`)) {
            try {
                await removeItemFromMarket(selectedNPCId, item.itemId)
            } catch (error) {
                console.error('Error removing item:', error)
                alert('Error removing item: ' + (error as Error).message)
            }
        }
    }

    const handleQuickEditPrice = (item: MarketItemView) => {
        setSelectedItem(item)
        setQuickEditPriceFormData({
            pricePerUnit: item.pricePerUnit.toString()
        })
        setIsQuickEditPriceDialogOpen(true)
    }

    const handleUpdatePrice = async () => {
        if (!selectedNPCId || !selectedItem) return

        try {
            const pricePerUnit = parseInt(quickEditPriceFormData.pricePerUnit)

            if (pricePerUnit < 0) {
                alert('Price per unit cannot be negative')
                return
            }

            await updateItemInMarket(
                selectedNPCId,
                selectedItem.itemId,
                selectedItem.limitPerUser, // Keep existing limit
                pricePerUnit
            )

            setQuickEditPriceFormData({
                pricePerUnit: ''
            })
            setIsQuickEditPriceDialogOpen(false)
            setSelectedItem(null)
        } catch (error) {
            console.error('Error updating price:', error)
            alert('Error updating price: ' + (error as Error).message)
        }
    }

    const handleBulkPriceUpdate = async () => {
        if (!selectedNPCId || selectedRows.length === 0) return

        try {
            const pricePerUnit = parseInt(bulkPriceUpdateFormData.pricePerUnit)
            const percentageChange = parseFloat(bulkPriceUpdateFormData.percentageChange)

            if (pricePerUnit < 0) {
                alert('Price per unit cannot be negative')
                return
            }

            // Update all selected items
            for (const item of selectedRows) {
                let newPrice = pricePerUnit

                // If percentage change is provided, calculate new price
                if (!isNaN(percentageChange) && percentageChange !== 0) {
                    newPrice = Math.floor(item.pricePerUnit * (1 + percentageChange / 100))
                }

                if (newPrice < 0) newPrice = 0

                await updateItemInMarket(
                    selectedNPCId,
                    item.itemId,
                    item.limitPerUser,
                    newPrice
                )
            }

            setBulkPriceUpdateFormData({
                pricePerUnit: '',
                percentageChange: ''
            })
            setIsBulkPriceUpdateDialogOpen(false)
            setSelectedRows([])
            setRowSelection({})
        } catch (error) {
            console.error('Error updating bulk prices:', error)
            alert('Error updating bulk prices: ' + (error as Error).message)
        }
    }

    // Validation functions
    const validateItemId = (itemId: string) => {
        const num = parseInt(itemId)
        return num > 0
    }

    const validatePrice = (price: string) => {
        const num = parseInt(price)
        return num >= 0
    }

    const validateLimit = (limit: string) => {
        const num = parseInt(limit)
        return num >= 0
    }

    const testContractMethod = async () => {
        if (!contract || !selectedNPCId) {
            console.log('No contract or selectedNPCId')
            return
        }

        try {
            console.log('Testing contract method...')
            // Test if we can call a simple view function
            const marketInfo = await contract.getNPCMarketInfo(selectedNPCId)
            console.log('Market info:', marketInfo)

            // Test getAllMarketItems method
            console.log('Testing getAllMarketItems...')
            const items = await contract.getAllMarketItems(selectedNPCId)
            console.log('Raw items from contract:', items)

            // Test if updateItemInMarket method exists
            console.log('Contract methods:', Object.keys(contract))
            console.log('updateItemInMarket exists:', typeof contract.updateItemInMarket)

            // Test context loadMarketItems
            console.log('Testing context loadMarketItems...')
            await loadMarketItems(selectedNPCId)
            console.log('Context loadMarketItems completed')
        } catch (error) {
            console.error('Error testing contract:', error)
        }
    }

    // =======================
    // 6. Table Columns
    // =======================
    const columns: ColumnDef<MarketItemView, any>[] = [
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
            accessorKey: "itemId",
            header: "Item ID",
            cell: ({ row }) => {
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className="font-mono text-xs">
                            #{row.getValue("itemId")}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Item identifier" }
        },
        {
            accessorKey: "pricePerUnit",
            header: "Price",
            cell: ({ row }) => {
                const price = row.getValue("pricePerUnit") as number
                const item = row.original
                return (
                    <div className="w-[120px] flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={`text-xs ${getPriceColor(price)} cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors`}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleQuickEditPrice(item)
                            }}
                            title="Click to edit price"
                        >
                            <DollarSign className="h-3 w-3 mr-1" />
                            {price}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-blue-50 z-10 relative"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleQuickEditPrice(item)
                            }}
                            title="Quick edit price"
                        >
                            <Edit3 className="h-3 w-3 text-blue-600" />
                        </Button>
                    </div>
                )
            },
            meta: { tooltip: "Price per unit - Click edit icon to change price" }
        },
        {
            accessorKey: "limitPerUser",
            header: "Limit Per User",
            cell: ({ row }) => {
                const limit = row.getValue("limitPerUser") as number
                return (
                    <div className="w-[120px]">
                        <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {limit === 0 ? 'Unlimited' : limit}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Purchase limit per user" }
        },
        {
            accessorKey: "isSelling",
            header: "Type",
            cell: ({ row }) => {
                const isSelling = row.getValue("isSelling") as boolean
                return (
                    <div className="w-[100px]">
                        <Badge variant={isSelling ? "default" : "secondary"} className="text-xs">
                            {isSelling ? (
                                <>
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    Selling
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Buying
                                </>
                            )}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "NPC is selling or buying this item" }
        },
        {
            accessorKey: "active",
            header: "Status",
            cell: ({ row }) => {
                const active = row.getValue("active") as boolean
                return (
                    <div className="w-[100px]">
                        <Badge variant={active ? "default" : "destructive"} className="text-xs">
                            {active ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Item status" }
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
                                <DropdownMenuItem onClick={() => handleQuickEditPrice(row.original)}>
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Quick Edit Price
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditItem(row.original)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit All
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDeleteItem(row.original)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
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
    // 7. Render UI
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
                                <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">
                                    Please connect MetaMask wallet to view and manage NPC market items
                                </p>
                            </div>
                        ) : (
                            <Button onClick={refreshNPCMarkets} className="w-full">
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
            {/* NPC Selector Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Select NPC Market</CardTitle>
                    <CardDescription>
                        Choose an NPC market to view and manage its items
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Select
                                value={selectedNPCId?.toString() || ""}
                                onValueChange={(value) => setSelectedNPCId(value ? parseInt(value) : null)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select NPC Market" />
                                </SelectTrigger>
                                <SelectContent>
                                    {npcMarkets.map((market) => (
                                        <SelectItem key={market.npcId} value={market.npcId.toString()}>
                                            {market.name} (NPC #{market.npcId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLoadMarketItems}
                            disabled={!selectedNPCId || isLoading || isLoadingItems}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isLoadingItems ? 'animate-spin' : ''}`} />
                            {isLoading || isLoadingItems ? 'Loading...' : 'Refresh'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Items Table Card */}
            {selectedNPCId && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Market Items</CardTitle>
                                <CardDescription>
                                    Items in NPC #{selectedNPCId} market ({currentItems.length} items)
                                    {isLoadingItems && ' - Loading...'}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedRows.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsBulkPriceUpdateDialogOpen(true)}
                                        className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                    >
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        Update {selectedRows.length} Prices
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={testContractMethod}
                                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                                >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Test Contract
                                </Button>
                                <Button onClick={() => setIsAddItemDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading || isLoadingItems ? (
                            <div className="text-center py-12">
                                <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                                <h3 className="text-lg font-medium mb-2">
                                    Loading Items...
                                </h3>
                                <p className="text-muted-foreground">
                                    Please wait while we fetch the market items
                                </p>
                            </div>
                        ) : currentItems.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">
                                    No Items Found
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    This NPC market doesn't have any items yet
                                </p>
                                <Button onClick={() => setIsAddItemDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add First Item
                                </Button>
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={currentItems}
                                searchValue={searchValue}
                                onSearch={setSearchValue}
                                pagination={{
                                    page: 1,
                                    totalPages: 1,
                                    totalItems: currentItems.length,
                                    limit: currentItems.length,
                                }}
                                onPaginationChange={() => { }}
                                selectedRows={selectedRows}
                                onRowSelectionChange={setSelectedRows}
                                showSearch={true}
                                showPagination={false}
                                showRowSelection={true}
                            />
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Add Item Dialog */}
            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Item to Market</DialogTitle>
                        <DialogDescription>
                            Add a new item to NPC #{selectedNPCId} market
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="add-itemId" className="text-sm font-medium">Item ID</Label>
                            <Input
                                id="add-itemId"
                                type="number"
                                min="1"
                                value={addItemFormData.itemId}
                                onChange={(e) => setAddItemFormData({ ...addItemFormData, itemId: e.target.value })}
                                placeholder="Enter item ID"
                                className={`mt-1 ${addItemFormData.itemId && !validateItemId(addItemFormData.itemId) ? 'border-red-500' : ''}`}
                            />
                            {addItemFormData.itemId && !validateItemId(addItemFormData.itemId) && (
                                <p className="text-red-500 text-xs mt-1">Item ID must be greater than 0</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="add-limitPerUser" className="text-sm font-medium">Limit Per User</Label>
                                <Input
                                    id="add-limitPerUser"
                                    type="number"
                                    min="0"
                                    value={addItemFormData.limitPerUser}
                                    onChange={(e) => setAddItemFormData({ ...addItemFormData, limitPerUser: e.target.value })}
                                    placeholder="0 = unlimited"
                                    className={`mt-1 ${addItemFormData.limitPerUser && !validateLimit(addItemFormData.limitPerUser) ? 'border-red-500' : ''}`}
                                />
                                {addItemFormData.limitPerUser && !validateLimit(addItemFormData.limitPerUser) && (
                                    <p className="text-red-500 text-xs mt-1">Limit cannot be negative</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="add-pricePerUnit" className="text-sm font-medium">Price Per Unit</Label>
                                <Input
                                    id="add-pricePerUnit"
                                    type="number"
                                    min="0"
                                    value={addItemFormData.pricePerUnit}
                                    onChange={(e) => setAddItemFormData({ ...addItemFormData, pricePerUnit: e.target.value })}
                                    placeholder="Price"
                                    className={`mt-1 ${addItemFormData.pricePerUnit && !validatePrice(addItemFormData.pricePerUnit) ? 'border-red-500' : ''}`}
                                />
                                {addItemFormData.pricePerUnit && !validatePrice(addItemFormData.pricePerUnit) && (
                                    <p className="text-red-500 text-xs mt-1">Price cannot be negative</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="add-isSelling"
                                checked={addItemFormData.isSelling}
                                onCheckedChange={(checked) => setAddItemFormData({ ...addItemFormData, isSelling: checked })}
                            />
                            <Label htmlFor="add-isSelling">NPC is selling this item</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddItem}
                            disabled={
                                !addItemFormData.itemId ||
                                !addItemFormData.pricePerUnit ||
                                !validateItemId(addItemFormData.itemId) ||
                                !validatePrice(addItemFormData.pricePerUnit) ||
                                !validateLimit(addItemFormData.limitPerUser)
                            }
                        >
                            Add Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Item Dialog */}
            <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Market Item</DialogTitle>
                        <DialogDescription>
                            Update item settings for Item #{selectedItem?.itemId}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm font-medium text-blue-800 mb-2">Current Settings:</div>
                            <div className="text-xs text-blue-700 space-y-1">
                                <div>Item ID: #{selectedItem?.itemId}</div>
                                <div>Current Price: {selectedItem?.pricePerUnit}</div>
                                <div>Current Limit: {selectedItem?.limitPerUser === 0 ? 'Unlimited' : selectedItem?.limitPerUser}</div>
                                <div>Type: {selectedItem?.isSelling ? 'Selling' : 'Buying'}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-limitPerUser" className="text-sm font-medium">Limit Per User</Label>
                                <Input
                                    id="edit-limitPerUser"
                                    type="number"
                                    min="0"
                                    value={editItemFormData.limitPerUser}
                                    onChange={(e) => setEditItemFormData({ ...editItemFormData, limitPerUser: e.target.value })}
                                    placeholder="0 = unlimited"
                                    className={`mt-1 ${editItemFormData.limitPerUser && !validateLimit(editItemFormData.limitPerUser) ? 'border-red-500' : ''}`}
                                />
                                {editItemFormData.limitPerUser && !validateLimit(editItemFormData.limitPerUser) && (
                                    <p className="text-red-500 text-xs mt-1">Limit cannot be negative</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit-pricePerUnit" className="text-sm font-medium">Price Per Unit</Label>
                                <Input
                                    id="edit-pricePerUnit"
                                    type="number"
                                    min="0"
                                    value={editItemFormData.pricePerUnit}
                                    onChange={(e) => setEditItemFormData({ ...editItemFormData, pricePerUnit: e.target.value })}
                                    placeholder="Price"
                                    className={`mt-1 ${editItemFormData.pricePerUnit && !validatePrice(editItemFormData.pricePerUnit) ? 'border-red-500' : ''}`}
                                />
                                {editItemFormData.pricePerUnit && !validatePrice(editItemFormData.pricePerUnit) && (
                                    <p className="text-red-500 text-xs mt-1">Price cannot be negative</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateItem}
                            disabled={
                                !editItemFormData.pricePerUnit ||
                                !validatePrice(editItemFormData.pricePerUnit) ||
                                !validateLimit(editItemFormData.limitPerUser)
                            }
                        >
                            Update Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quick Edit Price Dialog */}
            <Dialog open={isQuickEditPriceDialogOpen} onOpenChange={setIsQuickEditPriceDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Quick Edit Price</DialogTitle>
                        <DialogDescription>
                            Update price for Item #{selectedItem?.itemId}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                            <div className="flex-1">
                                <div className="text-sm font-medium">Current Price</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {selectedItem?.pricePerUnit}
                                </div>
                            </div>
                            <DollarSign className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <Label htmlFor="quick-edit-price" className="text-sm font-medium">New Price</Label>
                            <Input
                                id="quick-edit-price"
                                type="number"
                                min="0"
                                value={quickEditPriceFormData.pricePerUnit}
                                onChange={(e) => setQuickEditPriceFormData({ pricePerUnit: e.target.value })}
                                placeholder="Enter new price"
                                className={`mt-1 text-lg ${quickEditPriceFormData.pricePerUnit && !validatePrice(quickEditPriceFormData.pricePerUnit) ? 'border-red-500' : ''}`}
                                autoFocus
                            />
                            {quickEditPriceFormData.pricePerUnit && !validatePrice(quickEditPriceFormData.pricePerUnit) && (
                                <p className="text-red-500 text-xs mt-1">Price cannot be negative</p>
                            )}
                        </div>
                        {quickEditPriceFormData.pricePerUnit && validatePrice(quickEditPriceFormData.pricePerUnit) && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-sm font-medium text-green-800">Price Change:</div>
                                <div className="text-lg font-bold text-green-600">
                                    {selectedItem?.pricePerUnit} → {quickEditPriceFormData.pricePerUnit}
                                </div>
                                <div className="text-xs text-green-700">
                                    {parseInt(quickEditPriceFormData.pricePerUnit) > (selectedItem?.pricePerUnit || 0) ? 'Price increased' : 'Price decreased'}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsQuickEditPriceDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdatePrice}
                            disabled={!quickEditPriceFormData.pricePerUnit || !validatePrice(quickEditPriceFormData.pricePerUnit)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Update Price
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Price Update Dialog */}
            <Dialog open={isBulkPriceUpdateDialogOpen} onOpenChange={setIsBulkPriceUpdateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Bulk Price Update</DialogTitle>
                        <DialogDescription>
                            Update prices for {selectedRows.length} selected items
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-sm font-medium text-orange-800 mb-2">Selected Items:</div>
                            <div className="text-xs text-orange-700 space-y-1">
                                {selectedRows.slice(0, 5).map((item, index) => (
                                    <div key={index}>
                                        Item #{item.itemId}: {item.pricePerUnit} → <span className="font-medium">New Price</span>
                                    </div>
                                ))}
                                {selectedRows.length > 5 && (
                                    <div className="text-orange-600">... and {selectedRows.length - 5} more items</div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="bulk-fixed-price" className="text-sm font-medium">Fixed Price (Optional)</Label>
                                <Input
                                    id="bulk-fixed-price"
                                    type="number"
                                    min="0"
                                    value={bulkPriceUpdateFormData.pricePerUnit}
                                    onChange={(e) => setBulkPriceUpdateFormData({
                                        ...bulkPriceUpdateFormData,
                                        pricePerUnit: e.target.value
                                    })}
                                    placeholder="Set same price for all"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="bulk-percentage" className="text-sm font-medium">Percentage Change (Optional)</Label>
                                <Input
                                    id="bulk-percentage"
                                    type="number"
                                    step="0.1"
                                    value={bulkPriceUpdateFormData.percentageChange}
                                    onChange={(e) => setBulkPriceUpdateFormData({
                                        ...bulkPriceUpdateFormData,
                                        percentageChange: e.target.value
                                    })}
                                    placeholder="e.g. 10 for +10%"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            💡 Tip: Use percentage change to increase/decrease all prices by the same percentage
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkPriceUpdateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkPriceUpdate}
                            disabled={!bulkPriceUpdateFormData.pricePerUnit && !bulkPriceUpdateFormData.percentageChange}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Update {selectedRows.length} Prices
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
