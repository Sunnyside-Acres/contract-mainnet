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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, Zap, Shield, Heart, Star, Gauge, RefreshCw, X, Upload, Download, ShoppingCart, Tag, Clock, User, Package, DollarSign, TrendingUp, BarChart3 } from "lucide-react"
import { useFleaMarketContext } from "@/context/FleaMarketContext"
import { MarketListing, ListingFormData, PurchaseFormData } from "@/types/fleamarket.type"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet } from "@/context/WalletContext"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface FleaMarketManagerProps {
    contract?: ethers.Contract | null
    signer?: ethers.Signer | null
}

export function FleaMarketManager({ contract, signer: contractSigner }: FleaMarketManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<MarketListing[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const { listings, marketStats, isLoading, error, refreshListings, refreshMarketStats, cancelListing, listItem, purchaseItem, updateListing } = useFleaMarketContext()
    const { signer } = useWallet()
    const { toast } = useToast()
    const router = useRouter()
    const [address, setAddress] = React.useState<string>('')

    // Get address from signer
    React.useEffect(() => {
        const getAddress = async () => {
            if (signer) {
                try {
                    const addr = await signer.getAddress()
                    setAddress(addr)
                } catch (error) {
                    console.error('Error getting address:', error)
                }
            }
        }
        getAddress()
    }, [signer])

    // Dialog states
    const [isListDialogOpen, setIsListDialogOpen] = React.useState(false)
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = React.useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
    const [selectedListing, setSelectedListing] = React.useState<MarketListing | null>(null)

    // Form states
    const [listFormData, setListFormData] = React.useState<ListingFormData>({
        itemId: 0,
        quantity: 1,
        price: 0,
        duration: 24 * 60 * 60 // 24 hours in seconds
    })

    const [purchaseFormData, setPurchaseFormData] = React.useState<PurchaseFormData>({
        listingId: 0,
        quantity: 1
    })

    // =======================
    // 2. Table Configuration
    // =======================
    const columns: ColumnDef<MarketListing>[] = [
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        ID
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="font-mono">#{row.getValue("id")}</div>,
        },
        {
            accessorKey: "itemId",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Item ID
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-mono">#{row.getValue("itemId")}</span>
                </div>
            ),
        },
        {
            accessorKey: "seller",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Người bán
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const seller = String(row.getValue("seller"))
                return (
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-mono text-sm">
                            {seller.slice(0, 6)}...{seller.slice(-4)}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "quantity",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Số lượng
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{row.getValue("quantity")}</span>
                </div>
            ),
        },
        {
            accessorKey: "price",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Giá (Sunny)
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const price = Number(row.getValue("price"))
                return (
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-mono">{price.toLocaleString()}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "expirationTime",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Hết hạn
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const expirationTime = Number(row.getValue("expirationTime"))
                const now = Math.floor(Date.now() / 1000)
                const timeLeft = expirationTime - now

                if (timeLeft <= 0) {
                    return <Badge variant="destructive">Hết hạn</Badge>
                }

                const hours = Math.floor(timeLeft / 3600)
                const minutes = Math.floor((timeLeft % 3600) / 60)

                return (
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{hours}h {minutes}m</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "isActive",
            header: "Trạng thái",
            cell: ({ row }) => {
                const isActive = Boolean(row.getValue("isActive"))
                const expirationTime = Number(row.getValue("expirationTime"))
                const now = Math.floor(Date.now() / 1000)
                const isExpired = expirationTime <= now

                if (!isActive || isExpired) {
                    return <Badge variant="secondary">Không hoạt động</Badge>
                }

                return <Badge variant="default">Hoạt động</Badge>
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const listing = row.original
                const isMyListing = address && listing.seller.toLowerCase() === address.toLowerCase()
                const isExpired = listing.expirationTime <= Math.floor(Date.now() / 1000)
                const canPurchase = !isMyListing && listing.isActive && !isExpired

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Mở menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewListing(listing)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Xem chi tiết
                            </DropdownMenuItem>

                            {canPurchase && (
                                <DropdownMenuItem onClick={() => handlePurchase(listing)}>
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Mua
                                </DropdownMenuItem>
                            )}

                            {isMyListing && listing.isActive && !isExpired && (
                                <>
                                    <DropdownMenuItem onClick={() => handleEditListing(listing)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Chỉnh sửa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCancelListing(listing)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hủy listing
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const table = useReactTable({
        data: listings,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            rowSelection,
        },
    })

    // =======================
    // 3. Event Handlers
    // =======================
    const handleViewListing = (listing: MarketListing) => {
        setSelectedListing(listing)
        // Có thể mở dialog hoặc navigate đến trang chi tiết
    }

    const handlePurchase = (listing: MarketListing) => {
        setSelectedListing(listing)
        setPurchaseFormData({
            listingId: listing.id,
            quantity: 1
        })
        setIsPurchaseDialogOpen(true)
    }

    const handleEditListing = (listing: MarketListing) => {
        setSelectedListing(listing)
        setListFormData({
            itemId: listing.itemId,
            quantity: listing.quantity,
            price: listing.price,
            duration: listing.expirationTime - listing.listingTime
        })
        setIsEditDialogOpen(true)
    }

    const handleCancelListing = async (listing: MarketListing) => {
        if (!confirm(`Bạn có chắc muốn hủy listing #${listing.id}?`)) return

        try {
            const success = await cancelListing(listing.id)
            if (success) {
                toast({
                    title: "Thành công",
                    description: `Đã hủy listing #${listing.id}`,
                })
            }
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Không thể hủy listing",
                variant: "destructive",
            })
        }
    }

    const handleListItem = async () => {
        try {
            const { listItem } = useFleaMarketContext()
            const success = await listItem(listFormData)
            if (success) {
                setIsListDialogOpen(false)
                setListFormData({
                    itemId: 0,
                    quantity: 1,
                    price: 0,
                    duration: 24 * 60 * 60
                })
                toast({
                    title: "Thành công",
                    description: "Đã đăng bán item",
                })
            }
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Không thể đăng bán item",
                variant: "destructive",
            })
        }
    }

    const handlePurchaseItem = async () => {
        try {
            const { purchaseItem } = useFleaMarketContext()
            const success = await purchaseItem(purchaseFormData)
            if (success) {
                setIsPurchaseDialogOpen(false)
                setPurchaseFormData({
                    listingId: 0,
                    quantity: 1
                })
                toast({
                    title: "Thành công",
                    description: "Đã mua item",
                })
            }
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Không thể mua item",
                variant: "destructive",
            })
        }
    }

    const handleUpdateListing = async () => {
        if (!selectedListing) return

        try {
            const { updateListing } = useFleaMarketContext()
            const success = await updateListing(selectedListing.id, listFormData)
            if (success) {
                setIsEditDialogOpen(false)
                setSelectedListing(null)
                toast({
                    title: "Thành công",
                    description: "Đã cập nhật listing",
                })
            }
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Không thể cập nhật listing",
                variant: "destructive",
            })
        }
    }

    // =======================
    // 4. Render
    // =======================
    return (
        <div className="space-y-6">
            {/* Header với thống kê */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng Listings</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{marketStats?.totalListings || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {marketStats?.activeListings || 0} đang hoạt động
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng Giao dịch</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{marketStats?.totalTransactions || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Khối lượng: {marketStats?.totalVolume?.toLocaleString() || 0} Sunny
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Items duy nhất</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{listings.length > 0 ? new Set(listings.map(l => l.itemId)).size : 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Đang được bán
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Giá trung bình</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {listings.length > 0
                                ? Math.round(listings.reduce((sum, l) => sum + l.price, 0) / listings.length).toLocaleString()
                                : 0
                            }
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sunny/item
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="listings" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="listings">Tất cả Listings</TabsTrigger>
                    <TabsTrigger value="my-listings">Listings của tôi</TabsTrigger>
                    <TabsTrigger value="transactions">Lịch sử giao dịch</TabsTrigger>
                </TabsList>

                <TabsContent value="listings" className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Input
                                placeholder="Tìm kiếm listings..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="w-[300px]"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Bộ lọc
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshListings}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Làm mới
                            </Button>
                            <Button
                                onClick={() => setIsListDialogOpen(true)}
                                disabled={!address}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Đăng bán Item
                            </Button>
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
                                            {isLoading ? "Đang tải..." : "Không có listings nào"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            {table.getFilteredSelectedRowModel().rows.length} trong{" "}
                            {table.getFilteredRowModel().rows.length} hàng được chọn.
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
                </TabsContent>

                <TabsContent value="my-listings" className="space-y-4">
                    <div className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">Listings của bạn</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Hiển thị tất cả listings mà bạn đã đăng bán
                        </p>
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <div className="text-center py-8">
                        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">Lịch sử giao dịch</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Hiển thị tất cả giao dịch mua bán của bạn
                        </p>
                    </div>
                </TabsContent>
            </Tabs>

            {/* List Item Dialog */}
            <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Đăng bán Item</DialogTitle>
                        <DialogDescription>
                            Nhập thông tin item bạn muốn đăng bán
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="itemId" className="text-right">
                                Item ID
                            </Label>
                            <Input
                                id="itemId"
                                type="number"
                                value={listFormData.itemId}
                                onChange={(e) => setListFormData({ ...listFormData, itemId: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quantity" className="text-right">
                                Số lượng
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                value={listFormData.quantity}
                                onChange={(e) => setListFormData({ ...listFormData, quantity: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">
                                Giá (Sunny)
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                value={listFormData.price}
                                onChange={(e) => setListFormData({ ...listFormData, price: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="duration" className="text-right">
                                Thời hạn
                            </Label>
                            <Select
                                value={listFormData.duration.toString()}
                                onValueChange={(value) => setListFormData({ ...listFormData, duration: parseInt(value) })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Chọn thời hạn" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={(1 * 60 * 60).toString()}>1 giờ</SelectItem>
                                    <SelectItem value={(6 * 60 * 60).toString()}>6 giờ</SelectItem>
                                    <SelectItem value={(12 * 60 * 60).toString()}>12 giờ</SelectItem>
                                    <SelectItem value={(24 * 60 * 60).toString()}>1 ngày</SelectItem>
                                    <SelectItem value={(3 * 24 * 60 * 60).toString()}>3 ngày</SelectItem>
                                    <SelectItem value={(7 * 24 * 60 * 60).toString()}>7 ngày</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsListDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" onClick={handleListItem}>
                            Đăng bán
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Purchase Dialog */}
            <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Mua Item</DialogTitle>
                        <DialogDescription>
                            Nhập số lượng item bạn muốn mua
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedListing && (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Item ID:</span>
                                    <span className="font-mono">#{selectedListing.itemId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Giá:</span>
                                    <span className="font-mono">{selectedListing.price.toLocaleString()} Sunny</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Có sẵn:</span>
                                    <span>{selectedListing.quantity}</span>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="purchaseQuantity" className="text-right">
                                Số lượng
                            </Label>
                            <Input
                                id="purchaseQuantity"
                                type="number"
                                min="1"
                                max={selectedListing?.quantity || 1}
                                value={purchaseFormData.quantity}
                                onChange={(e) => setPurchaseFormData({ ...purchaseFormData, quantity: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        {selectedListing && (
                            <div className="text-right text-sm text-muted-foreground">
                                Tổng: {(selectedListing.price * purchaseFormData.quantity).toLocaleString()} Sunny
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsPurchaseDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" onClick={handlePurchaseItem}>
                            Mua
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Listing Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa Listing</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin listing của bạn
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editQuantity" className="text-right">
                                Số lượng
                            </Label>
                            <Input
                                id="editQuantity"
                                type="number"
                                value={listFormData.quantity}
                                onChange={(e) => setListFormData({ ...listFormData, quantity: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editPrice" className="text-right">
                                Giá (Sunny)
                            </Label>
                            <Input
                                id="editPrice"
                                type="number"
                                value={listFormData.price}
                                onChange={(e) => setListFormData({ ...listFormData, price: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editDuration" className="text-right">
                                Thời hạn
                            </Label>
                            <Select
                                value={listFormData.duration.toString()}
                                onValueChange={(value) => setListFormData({ ...listFormData, duration: parseInt(value) })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Chọn thời hạn" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={(1 * 60 * 60).toString()}>1 giờ</SelectItem>
                                    <SelectItem value={(6 * 60 * 60).toString()}>6 giờ</SelectItem>
                                    <SelectItem value={(12 * 60 * 60).toString()}>12 giờ</SelectItem>
                                    <SelectItem value={(24 * 60 * 60).toString()}>1 ngày</SelectItem>
                                    <SelectItem value={(3 * 24 * 60 * 60).toString()}>3 ngày</SelectItem>
                                    <SelectItem value={(7 * 24 * 60 * 60).toString()}>7 ngày</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" onClick={handleUpdateListing}>
                            Cập nhật
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
