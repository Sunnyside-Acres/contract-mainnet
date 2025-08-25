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
import { Input } from "@/components/ui/input"
import { Search } from "@/components/Search"
import { RefreshCw, User, Package, Clock, CheckCircle, XCircle, Sun, DollarSign, TrendingUp } from "lucide-react"
import { useCraftingContext } from "@/context/CraftingContext"
import { CraftingHistory, CraftingStats } from "@/types/crafting.type"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@/context/WalletContext"
import { ethers } from "ethers"

interface CraftingHistoryManagerProps {
    contract?: ethers.Contract | null
    signer?: ethers.Signer | null
}

export function CraftingHistoryManager({ contract, signer: contractSigner }: CraftingHistoryManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [searchValue, setSearchValue] = React.useState("")
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [playerAddress, setPlayerAddress] = React.useState("")
    const [playerStats, setPlayerStats] = React.useState<CraftingStats | null>(null)
    const { craftingHistory, isLoading, error, refreshCraftingHistory, getPlayerCraftingStats } = useCraftingContext()
    const { signer } = useWallet()

    // Get address from signer
    React.useEffect(() => {
        const getAddress = async () => {
            if (signer) {
                try {
                    const addr = await signer.getAddress()
                    setPlayerAddress(addr)
                } catch (error) {
                    console.error('Error getting address:', error)
                }
            }
        }
        getAddress()
    }, [signer])

    // Load player stats when address changes
    React.useEffect(() => {
        const loadPlayerStats = async () => {
            if (playerAddress && contract) {
                try {
                    const stats = await getPlayerCraftingStats(playerAddress)
                    setPlayerStats(stats)
                } catch (error) {
                    console.error('Error loading player stats:', error)
                }
            }
        }
        loadPlayerStats()
    }, [playerAddress, contract, getPlayerCraftingStats])

    // =======================
    // 2. Table Configuration
    // =======================
    const columns: ColumnDef<CraftingHistory>[] = [
        {
            accessorKey: "recipeId",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Recipe ID
                    </Button>
                )
            },
            cell: ({ row }) => <div className="font-medium">#{row.getValue("recipeId")}</div>,
        },
        {
            accessorKey: "player",
            header: "Người Chơi",
            cell: ({ row }) => {
                const player = row.getValue("player") as string
                return (
                    <div className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span className="font-mono text-sm">
                            {`${player.slice(0, 6)}...${player.slice(-4)}`}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "resultItemId",
            header: "Item Kết Quả",
            cell: ({ row }) => (
                <div className="flex items-center">
                    <Package className="mr-2 h-4 w-4" />
                    <span>Item #{row.getValue("resultItemId")}</span>
                </div>
            ),
        },
        {
            accessorKey: "resultQuantity",
            header: "Số Lượng",
            cell: ({ row }) => <div>{row.getValue("resultQuantity")}</div>,
        },
        {
            accessorKey: "isSuccess",
            header: "Kết Quả",
            cell: ({ row }) => {
                const isSuccess = row.getValue("isSuccess") as boolean
                return (
                    <Badge variant={isSuccess ? "default" : "secondary"}>
                        {isSuccess ? (
                            <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Thành công
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-1 h-3 w-3" />
                                Thất bại
                            </>
                        )}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "sunlightSpent",
            header: "Sunlight Tiêu",
            cell: ({ row }) => (
                <div className="flex items-center">
                    <Sun className="mr-2 h-4 w-4 text-yellow-500" />
                    <span>{row.getValue("sunlightSpent")}</span>
                </div>
            ),
        },
        {
            accessorKey: "sunnySpent",
            header: "Sunny Tiêu",
            cell: ({ row }) => (
                <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                    <span>{row.getValue("sunnySpent")}</span>
                </div>
            ),
        },
        {
            accessorKey: "timestamp",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Thời Gian
                    </Button>
                )
            },
            cell: ({ row }) => {
                const timestamp = row.getValue("timestamp") as number
                const date = new Date(timestamp * 1000)
                return (
                    <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        <span className="text-sm">
                            {date.toLocaleString('vi-VN')}
                        </span>
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: craftingHistory,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    })

    // =======================
    // 3. Event Handlers
    // =======================
    const handleRefresh = async () => {
        await refreshCraftingHistory(playerAddress)
        if (playerAddress && contract) {
            try {
                const stats = await getPlayerCraftingStats(playerAddress)
                setPlayerStats(stats)
            } catch (error) {
                console.error('Error loading player stats:', error)
            }
        }
    }

    // =======================
    // 4. Render
    // =======================
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Lịch Sử Crafting</h2>
                    <p className="text-muted-foreground">
                        Theo dõi lịch sử crafting của người chơi
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Làm mới
                    </Button>
                </div>
            </div>

            {/* Player Stats Cards */}
            {playerStats && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Tổng Lần Craft
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{playerStats.totalCrafts}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Thành Công
                            </CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{playerStats.successfulCrafts}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Tỉ Lệ Thành Công
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {((playerStats.successRate / 100)).toFixed(1)}%
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Search
                        placeholder="Tìm kiếm lịch sử..."
                        value={searchValue}
                        onSearch={(value) => {
                            setSearchValue(value)
                            table.getColumn("recipeId")?.setFilterValue(value)
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
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
                                    {isLoading ? "Đang tải..." : "Không có dữ liệu"}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    Hiển thị {table.getFilteredRowModel().rows.length} trong tổng số {craftingHistory.length} bản ghi.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Trước
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Sau
                    </Button>
                </div>
            </div>
        </div>
    )
}
