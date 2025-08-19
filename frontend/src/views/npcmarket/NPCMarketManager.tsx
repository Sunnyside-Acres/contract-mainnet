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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, Store, Clock, Package, DollarSign, Users, RefreshCw, X, ShoppingCart, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
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

interface NPCMarketManagerProps {
    signer?: ethers.Signer | null
}

export function NPCMarketManager({ signer }: NPCMarketManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<NPCMarket[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [isActiveFilter, setIsActiveFilter] = React.useState<boolean | undefined>(undefined)
    const [minItemCount, setMinItemCount] = React.useState<string>("")
    const [maxItemCount, setMaxItemCount] = React.useState<string>("")

    const {
        npcMarkets,
        marketItems,
        pagination,
        setPagination,
        filters,
        setFilters,
        refreshNPCMarkets,
        loadMarketItems,
        isLoading,
        error,
        contract,
        createNPCMarket,
        addItemToMarket,
        updateItemInMarket,
        removeItemFromMarket,

        buyItemFromNPC,
        sellItemToNPC
    } = useNPCMarketContext()

    // =======================
    // 2. Dialog States
    // =======================
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = React.useState(false)
    const [isTradeDialogOpen, setIsTradeDialogOpen] = React.useState(false)

    const [selectedMarket, setSelectedMarket] = React.useState<NPCMarket | null>(null)
    const [selectedMarketItem, setSelectedMarketItem] = React.useState<MarketItemView | null>(null)

    const [createFormData, setCreateFormData] = React.useState({
        npcId: '',
        name: ''
    })

    const [editFormData, setEditFormData] = React.useState({})

    const [addItemFormData, setAddItemFormData] = React.useState({
        itemId: '',
        limitPerUser: '',
        pricePerUnit: '',
        isSelling: true
    })

    const [tradeFormData, setTradeFormData] = React.useState({
        quantity: '',
        playerAddress: ''
    })

    // =======================
    // 3. Filter & Bulk Actions
    // =======================
    const handleResetFilters = () => {
        setIsActiveFilter(undefined)
        setMinItemCount("")
        setMaxItemCount("")
        setFilters({
            ...filters,
            isActive: undefined,
            minItemCount: undefined,
            maxItemCount: undefined
        })
    }

    const handleFilterChange = (key: string, value: any) => {
        setFilters({
            ...filters,
            [key]: value,
            page: 1
        })
    }

    const handleItemCountFilterChange = () => {
        const minItemCountNum = minItemCount ? parseInt(minItemCount) : undefined
        const maxItemCountNum = maxItemCount ? parseInt(maxItemCount) : undefined
        handleFilterChange('minItemCount', minItemCountNum)
        handleFilterChange('maxItemCount', maxItemCountNum)
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
        const selectedMarkets = npcMarkets.filter((_, index) => selectedRowIds.includes(index.toString()));
        setSelectedRows(selectedMarkets);
    }, [rowSelection, npcMarkets]);

    // =======================
    // 4. Helper Functions
    // =======================
    const getMarketStatusColor = (isActive: boolean) => {
        return isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"
    }

    const getItemCountColor = (count: number) => {
        if (count >= 20) return "bg-purple-100 text-purple-800 border-purple-200"
        if (count >= 10) return "bg-blue-100 text-blue-800 border-blue-200"
        if (count >= 5) return "bg-green-100 text-green-800 border-green-200"
        return "bg-gray-100 text-gray-800 border-gray-200"
    }

    const isMarketOpen = (market: NPCMarket) => {
        return market.isActive
    }

    // =======================
    // 5. Action Handlers
    // =======================
    const handleCreateMarket = async () => {
        try {
            if (!createFormData.name.trim()) {
                alert('Market name cannot be empty')
                return
            }

            if (!contract) {
                alert('Contract not available. Please try again.')
                return
            }

            const npcId = parseInt(createFormData.npcId)

            if (npcId <= 0) {
                alert('NPC ID must be greater than 0')
                return
            }

            console.log('Creating NPC market:', createFormData)
            await createNPCMarket(npcId, createFormData.name.trim())
            console.log('NPC market created successfully')

            // Reset form
            setCreateFormData({
                npcId: '',
                name: ''
            })
            setIsCreateDialogOpen(false)
        } catch (error) {
            console.error('Error creating NPC market:', error)
            alert('Error creating NPC market: ' + (error as Error).message)
        }
    }





    const handleAddItem = async () => {
        if (!selectedMarket) return

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
                selectedMarket.npcId,
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

    const handleTrade = async (isBuying: boolean) => {
        if (!selectedMarket || !selectedMarketItem) return

        try {
            const quantity = parseInt(tradeFormData.quantity)
            const playerAddress = tradeFormData.playerAddress

            if (quantity <= 0) {
                alert('Quantity must be greater than 0')
                return
            }

            if (!playerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
                alert('Invalid player address')
                return
            }

            if (isBuying) {
                await buyItemFromNPC(selectedMarket.npcId, selectedMarketItem.itemId, quantity)
            } else {
                await sellItemToNPC(selectedMarket.npcId, selectedMarketItem.itemId, quantity)
            }

            setTradeFormData({
                quantity: '',
                playerAddress: ''
            })
            setIsTradeDialogOpen(false)
        } catch (error) {
            console.error('Error trading:', error)
            alert('Error trading: ' + (error as Error).message)
        }
    }

    // =======================
    // 6. Table Columns
    // =======================
    const columns: ColumnDef<NPCMarket, any>[] = [
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
            accessorKey: "npcId",
            header: "NPC ID",
            cell: ({ row }) => {
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className="font-mono text-xs">
                            #{row.getValue("npcId")}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "NPC identifier" }
        },
        {
            accessorKey: "name",
            header: "Market Name",
            cell: ({ row }) => {
                return (
                    <div className="max-w-[200px]">
                        <div className="font-medium text-sm">{row.getValue("name")}</div>
                    </div>
                )
            },
            meta: { tooltip: "Market name" }
        },
        {
            accessorKey: "isActive",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("isActive") as boolean

                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${getMarketStatusColor(isActive)}`}>
                            {isActive ? (
                                <>
                                    <Store className="h-3 w-3 mr-1" />
                                    Active
                                </>
                            ) : (
                                <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Inactive
                                </>
                            )}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Market status" }
        },
        {
            accessorKey: "itemCount",
            header: "Items",
            cell: ({ row }) => {
                const itemCount = row.getValue("itemCount") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${getItemCountColor(itemCount)}`}>
                            <Package className="h-3 w-3 mr-1" />
                            {itemCount}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Number of items in market" }
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
                                <DropdownMenuItem asChild>
                                    <a href={`/npcmarket/items?npcId=${row.original.npcId}`}>
                                        <Package className="mr-2 h-4 w-4" />
                                        View Items
                                        <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setSelectedMarket(row.original)
                                    setIsAddItemDialogOpen(true)
                                }}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </DropdownMenuItem>

                                <Separator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedMarket(row.original)
                                        setIsTradeDialogOpen(true)
                                    }}
                                    className="text-blue-600"
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Trade
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
                                    Please connect MetaMask wallet to view and manage NPC markets
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
            {/* Main Card */}
            <Card>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Search
                                placeholder="Search markets..."
                                value={searchValue}
                                onSearch={handleSearch}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshNPCMarkets}
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
                                                <h4 className="text-lg font-medium leading-none">Market Filters</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Select criteria to filter markets
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
                                                <Label className="text-sm font-medium">Status</Label>
                                                <Select
                                                    value={isActiveFilter?.toString() || "all"}
                                                    onValueChange={(value) => {
                                                        const boolValue = value === "all" ? undefined : value === "true"
                                                        setIsActiveFilter(boolValue)
                                                        handleFilterChange('isActive', boolValue)
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All</SelectItem>
                                                        <SelectItem value="true">Active</SelectItem>
                                                        <SelectItem value="false">Inactive</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="minItemCount" className="text-sm font-medium">Min Items</Label>
                                                    <Input
                                                        id="minItemCount"
                                                        type="number"
                                                        min="0"
                                                        value={minItemCount}
                                                        onChange={(e) => setMinItemCount(e.target.value)}
                                                        placeholder="Min items"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxItemCount" className="text-sm font-medium">Max Items</Label>
                                                    <Input
                                                        id="maxItemCount"
                                                        type="number"
                                                        min="0"
                                                        value={maxItemCount}
                                                        onChange={(e) => setMaxItemCount(e.target.value)}
                                                        placeholder="Max items"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={() => {
                                                handleItemCountFilterChange()
                                                setIsFilterOpen(false)
                                            }}>
                                                Apply Filters
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Market
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    {npcMarkets.length === 0 ? (
                        <div className="text-center py-12">
                            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                No NPC Markets Found
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                No NPC markets have been created in the system yet
                            </p>
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Market
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={npcMarkets}
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

            {/* Create Market Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New NPC Market</DialogTitle>
                        <DialogDescription>
                            Create a new NPC market with basic information
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="create-npcId" className="text-sm font-medium">NPC ID</Label>
                            <Input
                                id="create-npcId"
                                type="number"
                                min="1"
                                value={createFormData.npcId}
                                onChange={(e) => setCreateFormData({ ...createFormData, npcId: e.target.value })}
                                placeholder="Enter NPC ID"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="create-name" className="text-sm font-medium">Market Name</Label>
                            <Input
                                id="create-name"
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                placeholder="Enter market name"
                                className="mt-1"
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateMarket} disabled={!createFormData.name.trim() || !createFormData.npcId}>
                            Create Market
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>





            {/* Add Item Dialog */}
            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Item to Market</DialogTitle>
                        <DialogDescription>
                            Add a new item to {selectedMarket?.name}
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
                                className="mt-1"
                            />
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
                                    className="mt-1"
                                />
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
                                    className="mt-1"
                                />
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
                        <Button onClick={handleAddItem} disabled={!addItemFormData.itemId || !addItemFormData.pricePerUnit}>
                            Add Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Trade Dialog */}
            <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Trade with NPC</DialogTitle>
                        <DialogDescription>
                            Trade items with {selectedMarket?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="trade-playerAddress" className="text-sm font-medium">Player Address</Label>
                            <Input
                                id="trade-playerAddress"
                                value={tradeFormData.playerAddress}
                                onChange={(e) => setTradeFormData({ ...tradeFormData, playerAddress: e.target.value })}
                                placeholder="Enter player wallet address"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="trade-quantity" className="text-sm font-medium">Quantity</Label>
                            <Input
                                id="trade-quantity"
                                type="number"
                                min="1"
                                value={tradeFormData.quantity}
                                onChange={(e) => setTradeFormData({ ...tradeFormData, quantity: e.target.value })}
                                placeholder="Enter quantity"
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTradeDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleTrade(true)}
                            disabled={!tradeFormData.playerAddress || !tradeFormData.quantity}
                            className="mr-2"
                        >
                            <TrendingDown className="mr-2 h-4 w-4" />
                            Buy
                        </Button>
                        <Button
                            onClick={() => handleTrade(false)}
                            disabled={!tradeFormData.playerAddress || !tradeFormData.quantity}
                        >
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Sell
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
