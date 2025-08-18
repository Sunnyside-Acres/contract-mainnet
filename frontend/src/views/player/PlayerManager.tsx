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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, Zap, Shield, Heart, Star, Gauge, RefreshCw, X, User, Crown, Coins, Sun, Package } from "lucide-react"
import { usePlayerContext } from "@/context/PlayerContext"
import { Player } from "@/types/player.type"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { PlayerInventoryDialog } from "@/components/PlayerInventoryDialog"
import { AddItemDialog } from "@/components/AddItemDialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PlayerManagerProps {
    signer?: ethers.Signer | null
}

export function PlayerManager({ signer }: PlayerManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<Player[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [minLevel, setMinLevel] = React.useState<string>("")
    const [maxLevel, setMaxLevel] = React.useState<string>("")
    const [minXp, setMinXp] = React.useState<string>("")
    const [maxXp, setMaxXp] = React.useState<string>("")
    const [minSunlight, setMinSunlight] = React.useState<string>("")
    const [maxSunlight, setMaxSunlight] = React.useState<string>("")
    const [minSunny, setMinSunny] = React.useState<string>("")
    const [maxSunny, setMaxSunny] = React.useState<string>("")
    const { players, pagination, setPagination, filters, setFilters, refreshPlayers, isLoading, error, contract } = usePlayerContext()
    const router = useRouter()

    // =======================
    // 2. Filter & Bulk Actions
    // =======================
    const handleResetFilters = () => {
        setMinLevel("")
        setMaxLevel("")
        setMinXp("")
        setMaxXp("")
        setMinSunlight("")
        setMaxSunlight("")
        setMinSunny("")
        setMaxSunny("")
        setFilters({
            ...filters,
            minLevel: undefined,
            maxLevel: undefined,
            minXp: undefined,
            maxXp: undefined,
            minSunlight: undefined,
            maxSunlight: undefined,
            minSunny: undefined,
            maxSunny: undefined
        })
    }

    const handleFilterChange = (key: string, value: any) => {
        setFilters({
            ...filters,
            [key]: value,
            page: 1 // Reset to first page when filter changes
        })
    }

    const handleLevelFilterChange = () => {
        const minLevelNum = minLevel ? parseInt(minLevel) : undefined
        const maxLevelNum = maxLevel ? parseInt(maxLevel) : undefined
        handleFilterChange('minLevel', minLevelNum)
        handleFilterChange('maxLevel', maxLevelNum)
    }

    const handleXpFilterChange = () => {
        const minXpNum = minXp ? parseInt(minXp) : undefined
        const maxXpNum = maxXp ? parseInt(maxXp) : undefined
        handleFilterChange('minXp', minXpNum)
        handleFilterChange('maxXp', maxXpNum)
    }

    const handleSunlightFilterChange = () => {
        const minSunlightNum = minSunlight ? parseInt(minSunlight) : undefined
        const maxSunlightNum = maxSunlight ? parseInt(maxSunlight) : undefined
        handleFilterChange('minSunlight', minSunlightNum)
        handleFilterChange('maxSunlight', maxSunlightNum)
    }

    const handleSunnyFilterChange = () => {
        const minSunnyNum = minSunny ? parseInt(minSunny) : undefined
        const maxSunnyNum = maxSunny ? parseInt(maxSunny) : undefined
        handleFilterChange('minSunny', minSunnyNum)
        handleFilterChange('maxSunny', maxSunnyNum)
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
        const selectedPlayers = players.filter((_, index) => selectedRowIds.includes(index.toString()));
        setSelectedRows(selectedPlayers);
    }, [rowSelection, players]);

    React.useEffect(() => {
        setFilters({
            ...filters,
            page: 1,
            limit: 10
        })
    }, []);

    const handleBulkDelete = async () => {
        try {
            // Mock API call
            console.log("Deleting players:", selectedRows.map(player => player.playerAddress));
            // await Promise.all(selectedRows.map(player => deletePlayer(player.playerAddress)));
            // toast.success("Selected players deleted successfully");
            // queryClient.invalidateQueries({ queryKey: ['players'] });
            setRowSelection({});
        } catch (error) {
            // toast.error("Failed to delete selected players");
            console.error("Failed to delete selected players:", error);
        }
    };

    const handleCreatePlayer = async () => {
        try {
            if (!createFormData.name.trim()) {
                alert('Player name cannot be empty')
                return
            }

            if (createFormData.name.length > 32) {
                alert('Player name must be 32 characters or less')
                return
            }

            if (!contract) {
                alert('Contract not available. Please try again.')
                return
            }

            console.log('Creating player with name:', createFormData.name)
            const tx = await contract.createPlayer(createFormData.name.trim())
            await tx.wait()
            console.log('Player created successfully')

            // Reset form
            setCreateFormData({
                name: ''
            })
            setIsCreateDialogOpen(false)

            // Reload data from contract
            await refreshPlayers()
        } catch (error) {
            console.error('Error creating player:', error)
            alert('Error creating player: ' + (error as Error).message)
        }
    }

    const handleEditPlayer = (player: Player) => {
        setSelectedPlayerForEdit(player)
        setEditFormData({
            name: player.name,
            level: player.level,
            xp: player.xp,
            mana: player.mana,
            maxMana: player.maxMana,
            sunlight: player.sunlight,
            sunny: player.sunny
        })
        setIsEditDialogOpen(true)
    }

    const handleUpdatePlayer = async () => {
        if (!selectedPlayerForEdit) return

        try {
            if (!editFormData.name.trim()) {
                alert('Player name cannot be empty')
                return
            }

            if (editFormData.name.length > 32) {
                alert('Player name must be 32 characters or less')
                return
            }

            // Note: This would require additional contract functions to update player data
            // For now, we'll just show a message
            alert('Player update functionality requires additional contract functions')

            // Reset form
            setEditFormData({
                name: '',
                level: 1,
                xp: 0,
                mana: 1000,
                maxMana: 1000,
                sunlight: 500,
                sunny: 0
            })
            setIsEditDialogOpen(false)
            setSelectedPlayerForEdit(null)

            // Reload data from contract
            await refreshPlayers()
        } catch (error) {
            console.error('Error updating player:', error)
            alert('Error updating player: ' + (error as Error).message)
        }
    }

    // =======================
    // 3. Helper Functions
    // =======================
    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString()
    }

    const getLevelColor = (level: number) => {
        if (level >= 50) return "bg-purple-100 text-purple-800 border-purple-200"
        if (level >= 30) return "bg-blue-100 text-blue-800 border-blue-200"
        if (level >= 20) return "bg-green-100 text-green-800 border-green-200"
        if (level >= 10) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        return "bg-gray-100 text-gray-800 border-gray-200"
    }

    const getManaPercentage = (mana: number, maxMana: number) => {
        return Math.round((mana / maxMana) * 100)
    }

    const getManaColor = (percentage: number) => {
        if (percentage >= 80) return "bg-green-100 text-green-800 border-green-200"
        if (percentage >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        if (percentage >= 20) return "bg-orange-100 text-orange-800 border-orange-200"
        return "bg-red-100 text-red-800 border-red-200"
    }

    // =======================
    // 4. Table Columns
    // =======================
    const columns: ColumnDef<Player, any>[] = [
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
            accessorKey: "playerAddress",
            header: "Address",
            cell: ({ row }) => {
                return (
                    <div className="w-[120px]">
                        <Badge variant="outline" className="font-mono text-xs">
                            {formatAddress(row.getValue("playerAddress"))}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Player wallet address" }
        },
        {
            accessorKey: "name",
            header: "Player Name",
            cell: ({ row }) => {
                return (
                    <div className="max-w-[200px]">
                        <div className="font-medium text-sm">{row.getValue("name")}</div>
                    </div>
                )
            },
            meta: { tooltip: "Player name" }
        },
        {
            accessorKey: "level",
            header: "Level",
            cell: ({ row }) => {
                const level = row.getValue("level") as number
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className={`text-xs ${getLevelColor(level)}`}>
                            <Crown className="h-3 w-3 mr-1" />
                            {level}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Player level" }
        },
        {
            accessorKey: "xp",
            header: "XP",
            cell: ({ row }) => {
                const xp = row.getValue("xp") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {xp.toLocaleString()}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Experience points" }
        },
        {
            accessorKey: "mana",
            header: "Mana",
            cell: ({ row }) => {
                const mana = row.getValue("mana") as number
                const maxMana = row.original.maxMana
                const percentage = getManaPercentage(mana, maxMana)
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${getManaColor(percentage)}`}>
                            <Zap className="h-3 w-3 mr-1" />
                            {mana}/{maxMana}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Current/Max Mana" }
        },
        {
            accessorKey: "sunlight",
            header: "Sunlight",
            cell: ({ row }) => {
                const sunlight = row.getValue("sunlight") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className="text-xs">
                            <Sun className="h-3 w-3 mr-1" />
                            {sunlight.toLocaleString()}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Sunlight currency" }
        },
        {
            accessorKey: "sunny",
            header: "Sunny",
            cell: ({ row }) => {
                const sunny = row.getValue("sunny") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className="text-xs">
                            <Coins className="h-3 w-3 mr-1" />
                            {sunny.toLocaleString()}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Sunny currency" }
        },
        {
            accessorKey: "lastLogin",
            header: "Last Login",
            cell: ({ row }) => {
                const lastLogin = row.getValue("lastLogin") as number
                return (
                    <div className="w-[150px]">
                        <div className="text-xs text-muted-foreground">
                            {formatDate(lastLogin)}
                        </div>
                    </div>
                )
            },
            meta: { tooltip: "Last login timestamp" }
        },
        {
            id: "actions",
            header: ({ column }) => {
                return <div className="w-[100px] text-center">Actions</div>
            },
            cell: ({ row }) => {
                return (
                    <div className="w-[100px] text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                    setSelectedPlayerForInventory(row.original)
                                    setIsInventoryDialogOpen(true)
                                }}>
                                    <Package className="mr-2 h-4 w-4" />
                                    View Inventory
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setSelectedPlayerForAddItem(row.original)
                                    setIsAddItemDialogOpen(true)
                                }}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditPlayer(row.original)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem
                                    onClick={() => handleBulkDelete()}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Player
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
    const [createFormData, setCreateFormData] = React.useState({
        name: ''
    })

    // Edit dialog state
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
    const [selectedPlayerForEdit, setSelectedPlayerForEdit] = React.useState<Player | null>(null)
    const [isInventoryDialogOpen, setIsInventoryDialogOpen] = React.useState(false)
    const [selectedPlayerForInventory, setSelectedPlayerForInventory] = React.useState<Player | null>(null)
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = React.useState(false)
    const [selectedPlayerForAddItem, setSelectedPlayerForAddItem] = React.useState<Player | null>(null)
    const [editFormData, setEditFormData] = React.useState({
        name: '',
        level: 1,
        xp: 0,
        mana: 1000,
        maxMana: 1000,
        sunlight: 500,
        sunny: 0
    })

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
                                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">
                                    Please connect MetaMask wallet to view and manage players
                                </p>
                            </div>
                        ) : (
                            <Button onClick={refreshPlayers} className="w-full">
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
                                placeholder="Search players..."
                                value={searchValue}
                                onSearch={handleSearch}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshPlayers}
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
                                <PopoverContent className="w-[600px] p-6">
                                    <div className="grid gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-medium leading-none">Player Filters</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Select criteria to filter players
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
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="minLevel" className="text-sm font-medium">Min Level</Label>
                                                    <Input
                                                        id="minLevel"
                                                        type="number"
                                                        min="1"
                                                        value={minLevel}
                                                        onChange={(e) => setMinLevel(e.target.value)}
                                                        placeholder="Min level"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxLevel" className="text-sm font-medium">Max Level</Label>
                                                    <Input
                                                        id="maxLevel"
                                                        type="number"
                                                        min="1"
                                                        value={maxLevel}
                                                        onChange={(e) => setMaxLevel(e.target.value)}
                                                        placeholder="Max level"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="minXp" className="text-sm font-medium">Min XP</Label>
                                                    <Input
                                                        id="minXp"
                                                        type="number"
                                                        min="0"
                                                        value={minXp}
                                                        onChange={(e) => setMinXp(e.target.value)}
                                                        placeholder="Min XP"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxXp" className="text-sm font-medium">Max XP</Label>
                                                    <Input
                                                        id="maxXp"
                                                        type="number"
                                                        min="0"
                                                        value={maxXp}
                                                        onChange={(e) => setMaxXp(e.target.value)}
                                                        placeholder="Max XP"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="minSunlight" className="text-sm font-medium">Min Sunlight</Label>
                                                    <Input
                                                        id="minSunlight"
                                                        type="number"
                                                        min="0"
                                                        value={minSunlight}
                                                        onChange={(e) => setMinSunlight(e.target.value)}
                                                        placeholder="Min sunlight"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxSunlight" className="text-sm font-medium">Max Sunlight</Label>
                                                    <Input
                                                        id="maxSunlight"
                                                        type="number"
                                                        min="0"
                                                        value={maxSunlight}
                                                        onChange={(e) => setMaxSunlight(e.target.value)}
                                                        placeholder="Max sunlight"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="minSunny" className="text-sm font-medium">Min Sunny</Label>
                                                    <Input
                                                        id="minSunny"
                                                        type="number"
                                                        min="0"
                                                        value={minSunny}
                                                        onChange={(e) => setMinSunny(e.target.value)}
                                                        placeholder="Min sunny"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxSunny" className="text-sm font-medium">Max Sunny</Label>
                                                    <Input
                                                        id="maxSunny"
                                                        type="number"
                                                        min="0"
                                                        value={maxSunny}
                                                        onChange={(e) => setMaxSunny(e.target.value)}
                                                        placeholder="Max sunny"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={() => {
                                                handleLevelFilterChange()
                                                handleXpFilterChange()
                                                handleSunlightFilterChange()
                                                handleSunnyFilterChange()
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
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete selected players
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Player
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    {players.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                No Players Found
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                No players have been created in the system yet
                            </p>
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Player
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={players}
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

            {/* Confirmation Dialogs */}
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleBulkDelete}
                title="Delete Players"
                description={`Are you sure you want to delete ${selectedRows.length} selected players? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />

            {/* Create Player Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Player</DialogTitle>
                        <DialogDescription>
                            Enter information to create a new player in the system
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="create-name" className="text-sm font-medium">Player Name</Label>
                            <Input
                                id="create-name"
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                placeholder="Enter player name"
                                className="mt-1"
                                maxLength={32}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Maximum 32 characters
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreatePlayer} disabled={!createFormData.name.trim()}>
                            Create Player
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Player Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Player</DialogTitle>
                        <DialogDescription>
                            Update information for player {selectedPlayerForEdit?.name} (Address: {selectedPlayerForEdit?.playerAddress})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name" className="text-sm font-medium">Player Name</Label>
                            <Input
                                id="edit-name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                placeholder="Enter player name"
                                className="mt-1"
                                maxLength={32}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Maximum 32 characters
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-level" className="text-sm font-medium">Level</Label>
                                <Input
                                    id="edit-level"
                                    type="number"
                                    min="1"
                                    value={editFormData.level}
                                    onChange={(e) => setEditFormData({ ...editFormData, level: parseInt(e.target.value) || 1 })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-xp" className="text-sm font-medium">XP</Label>
                                <Input
                                    id="edit-xp"
                                    type="number"
                                    min="0"
                                    value={editFormData.xp}
                                    onChange={(e) => setEditFormData({ ...editFormData, xp: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-mana" className="text-sm font-medium">Mana</Label>
                                <Input
                                    id="edit-mana"
                                    type="number"
                                    min="0"
                                    value={editFormData.mana}
                                    onChange={(e) => setEditFormData({ ...editFormData, mana: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-maxMana" className="text-sm font-medium">Max Mana</Label>
                                <Input
                                    id="edit-maxMana"
                                    type="number"
                                    min="1"
                                    value={editFormData.maxMana}
                                    onChange={(e) => setEditFormData({ ...editFormData, maxMana: parseInt(e.target.value) || 1000 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-sunlight" className="text-sm font-medium">Sunlight</Label>
                                <Input
                                    id="edit-sunlight"
                                    type="number"
                                    min="0"
                                    value={editFormData.sunlight}
                                    onChange={(e) => setEditFormData({ ...editFormData, sunlight: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-sunny" className="text-sm font-medium">Sunny</Label>
                                <Input
                                    id="edit-sunny"
                                    type="number"
                                    min="0"
                                    value={editFormData.sunny}
                                    onChange={(e) => setEditFormData({ ...editFormData, sunny: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdatePlayer} disabled={!editFormData.name.trim()}>
                            Update Player
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Inventory Dialog */}
            <PlayerInventoryDialog
                isOpen={isInventoryDialogOpen}
                onOpenChange={setIsInventoryDialogOpen}
                player={selectedPlayerForInventory}
            />

            {/* Add Item Dialog */}
            <AddItemDialog
                isOpen={isAddItemDialogOpen}
                onOpenChange={setIsAddItemDialogOpen}
                player={selectedPlayerForAddItem}
                onSuccess={() => {
                    // Refresh inventory view if it's open
                    if (isInventoryDialogOpen) {
                        setIsInventoryDialogOpen(false)
                        setTimeout(() => setIsInventoryDialogOpen(true), 100)
                    }
                }}
            />
        </div>
    )
}
