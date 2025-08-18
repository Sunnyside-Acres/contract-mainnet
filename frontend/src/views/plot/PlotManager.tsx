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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, MapPin, Sprout, Lock, Unlock, RefreshCw, X, Map, Layers, Scissors, Heart, Flower2, Users, Search as SearchIcon } from "lucide-react"
import { usePlotContext } from "@/context/PlotContext"
import { Plot, PlotTypeNames } from "@/types/plot.type"
import { Plant, getPlantStatus, getGrowthProgress, formatTimeRemaining, getRemainingTime } from "@/types/plant.type"
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

interface PlotManagerProps {
    signer?: ethers.Signer | null
    onUserChange?: (userAddress: string) => void
    playerContract?: ethers.Contract | null
    plantContract?: ethers.Contract | null
}

interface PlotWithPlant extends Plot {
    plant?: Plant | null
}

export function PlotManager({ signer, onUserChange, playerContract, plantContract }: PlotManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<Plot[]>([])
    const [plotsWithPlants, setPlotsWithPlants] = React.useState<PlotWithPlant[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [minFertility, setMinFertility] = React.useState<string>("")
    const [maxFertility, setMaxFertility] = React.useState<string>("")
    const [selectedPlotType, setSelectedPlotType] = React.useState<string>("")
    const [selectedActiveStatus, setSelectedActiveStatus] = React.useState<string>("")
    const [selectedLockStatus, setSelectedLockStatus] = React.useState<string>("")
    const [plantIdSearch, setPlantIdSearch] = React.useState<string>("")
    const { plots, pagination, setPagination, filters, setFilters, refreshPlots, isLoading, error, contract } = usePlotContext()
    const router = useRouter()

    // =======================
    // 2. Filter & Bulk Actions
    // =======================
    const handleResetFilters = () => {
        setMinFertility("")
        setMaxFertility("")
        setSelectedPlotType("")
        setSelectedActiveStatus("")
        setSelectedLockStatus("")
        setPlantIdSearch("")
        setFilters({
            ...filters,
            plotType: undefined,
            minFertility: undefined,
            maxFertility: undefined,
            isActive: undefined,
            isLocked: undefined
        })
    }

    const handleFilterChange = (key: string, value: any) => {
        setFilters({
            ...filters,
            [key]: value,
            page: 1 // Reset to first page when filter changes
        })
    }

    const handleFertilityFilterChange = () => {
        const minFertilityNum = minFertility ? parseInt(minFertility) : undefined
        const maxFertilityNum = maxFertility ? parseInt(maxFertility) : undefined
        handleFilterChange('minFertility', minFertilityNum)
        handleFilterChange('maxFertility', maxFertilityNum)
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
        const selectedPlots = plots.filter((_, index) => selectedRowIds.includes(index.toString()));
        setSelectedRows(selectedPlots);
    }, [rowSelection, plots]);

    React.useEffect(() => {
        setFilters({
            ...filters,
            page: 1,
            limit: 10
        })
    }, []);

    const handleBulkDelete = async () => {
        try {
            // Mock API call - thực tế sẽ cần contract function để xóa plots
            console.log("Deleting plots:", selectedRows.map(plot => plot.id));
            // await Promise.all(selectedRows.map(plot => deletePlot(plot.id)));
            alert("Chức năng xóa plots hàng loạt chưa được implement trong contract");
            setRowSelection({});
        } catch (error) {
            console.error("Failed to delete selected plots:", error);
            alert("Lỗi khi xóa plots được chọn");
        }
    };

    const handleCreatePlot = async () => {
        try {
            if (!createFormData.xCoordinate && createFormData.xCoordinate !== 0) {
                alert('Tọa độ X không được để trống')
                return
            }

            if (!createFormData.yCoordinate && createFormData.yCoordinate !== 0) {
                alert('Tọa độ Y không được để trống')
                return
            }

            if (!contract) {
                alert('Contract không khả dụng. Vui lòng thử lại.')
                return
            }

            console.log('Creating plot with coordinates:', createFormData.xCoordinate, createFormData.yCoordinate)
            const tx = await contract.createPlot(createFormData.xCoordinate, createFormData.yCoordinate)
            await tx.wait()
            console.log('Plot created successfully')

            // Reset form
            setCreateFormData({
                xCoordinate: 0,
                yCoordinate: 0
            })
            setIsCreateDialogOpen(false)

            // Reload data from contract
            await refreshPlots()
        } catch (error) {
            console.error('Error creating plot:', error)
            alert('Lỗi khi tạo ô đất: ' + (error as Error).message)
        }
    }

    // =======================
    // 3. Farming Actions
    // =======================
    const handlePlantSeed = async () => {
        if (!selectedPlotForPlant || !seedIdInput.trim()) {
            alert('Vui lòng nhập ID hạt giống để trồng')
            return
        }

        // Validate seed ID is a number
        const seedId = parseInt(seedIdInput.trim())
        if (isNaN(seedId) || seedId <= 0) {
            alert('ID hạt giống phải là số nguyên dương')
            return
        }

        try {
            if (!plantContract) {
                alert('Plant contract không khả dụng. Vui lòng thử lại.')
                return
            }

            console.log('Planting seed:', seedId, 'on plot:', selectedPlotForPlant.id)
            const tx = await plantContract.plantCrop(selectedPlotForPlant.id, seedId)
            await tx.wait()
            console.log('Seed planted successfully')

            // Reset dialog
            setSelectedPlotForPlant(null)
            setSeedIdInput("")
            setIsPlantDialogOpen(false)

            // Refresh plots to load new plant data
            await refreshPlots()
            alert('Trồng cây thành công!')
        } catch (error) {
            console.error('Error planting seed:', error)
            alert('Lỗi khi trồng cây: ' + (error as Error).message)
        }
    }

    const handleTendPlant = async (plotWithPlant: PlotWithPlant) => {
        try {
            if (!plantContract) {
                alert('Plant contract không khả dụng. Vui lòng thử lại.')
                return
            }

            if (!plotWithPlant.plant) {
                alert('Không có cây trồng trên ô đất này.')
                return
            }

            console.log('Tending plant:', plotWithPlant.plant.id, 'on plot:', plotWithPlant.id)
            const tx = await plantContract.plantTended(plotWithPlant.plant.id)
            await tx.wait()
            console.log('Plant tended successfully')

            // Refresh plots to update plant data
            await refreshPlots()
            alert('Chăm sóc cây thành công!')
        } catch (error) {
            console.error('Error tending plant:', error)
            alert('Lỗi khi chăm sóc cây: ' + (error as Error).message)
        }
    }

    const handleHarvestPlant = async (plotWithPlant: PlotWithPlant) => {
        try {
            if (!plantContract) {
                alert('Plant contract không khả dụng. Vui lòng thử lại.')
                return
            }

            if (!plotWithPlant.plant) {
                alert('Không có cây trồng trên ô đất này.')
                return
            }

            // Check if plant is ready to harvest
            const currentTime = Math.floor(Date.now() / 1000)
            const timeElapsed = currentTime - plotWithPlant.plant.plantedTime
            if (timeElapsed < plotWithPlant.plant.growthTime) {
                alert('Cây chưa sẵn sàng để thu hoạch.')
                return
            }

            console.log('Harvesting plant:', plotWithPlant.plant.id, 'on plot:', plotWithPlant.id)
            const tx = await plantContract.plantHarvest(plotWithPlant.plant.id)
            await tx.wait()
            console.log('Plant harvested successfully')

            // Refresh plots to update after harvest
            await refreshPlots()
            alert('Thu hoạch thành công!')
        } catch (error) {
            console.error('Error harvesting plant:', error)
            alert('Lỗi khi thu hoạch: ' + (error as Error).message)
        }
    }

    // =======================
    // 4. User Management Functions
    // =======================
    const loadAvailableUsers = async () => {
        if (!playerContract || !signer) {
            return
        }

        try {
            setIsLoadingUsers(true)
            console.log('Loading available users from PlayerLogic contract...')

            // Get all player addresses from PlayerLogic contract (similar to PlayerContext)
            const playerAddresses = await playerContract.getPlayerList()
            console.log('Player addresses from contract:', playerAddresses)

            if (!playerAddresses || playerAddresses.length === 0) {
                // Only show current user if no players exist
                const currentUser = await signer.getAddress()
                setAvailableUsers([
                    {
                        address: currentUser,
                        name: "Bạn (Current User)",
                        plotCount: 0
                    }
                ])

                if (!currentUserAddress) {
                    setCurrentUserAddress(currentUser)
                    setSelectedUserAddress(currentUser)
                }
                return
            }

            // Load user data for each address
            const usersData: { address: string, name: string, plotCount: number }[] = []
            const currentUser = await signer.getAddress()

            for (const address of playerAddresses) {
                try {
                    console.log('Getting user data for address:', address)

                    // Get player data
                    const playerData = await playerContract.getPlayerData(address)
                    console.log('Player data for', address, ':', playerData)

                    // Get plot count for this user (if available)
                    let plotCount = 0
                    try {
                        if (contract) {
                            const plotsData = await contract.getPlots(address)
                            plotCount = plotsData ? plotsData.length : 0
                        }
                    } catch (plotError) {
                        console.log(`No plots found for user ${address}`)
                        plotCount = 0
                    }

                    const isCurrentUser = address.toLowerCase() === currentUser.toLowerCase()
                    const user = {
                        address: address,
                        name: isCurrentUser ? `${playerData.name} (Bạn)` : playerData.name,
                        plotCount: plotCount
                    }

                    // Put current user first in the list
                    if (isCurrentUser) {
                        usersData.unshift(user)
                    } else {
                        usersData.push(user)
                    }

                } catch (userError) {
                    console.error(`Error loading user data for ${address}:`, userError)
                    // Still add user with basic info
                    const isCurrentUser = address.toLowerCase() === currentUser.toLowerCase()
                    const user = {
                        address: address,
                        name: isCurrentUser ? "Bạn (Current User)" : formatAddress(address),
                        plotCount: 0
                    }

                    if (isCurrentUser) {
                        usersData.unshift(user)
                    } else {
                        usersData.push(user)
                    }
                }
            }

            console.log('Loaded users data:', usersData)
            setAvailableUsers(usersData)

            // Set current user as default if not set
            if (!currentUserAddress) {
                setCurrentUserAddress(currentUser)
                setSelectedUserAddress(currentUser)
            }
        } catch (error) {
            console.error('Error loading users from contract:', error)
            // Fallback to current user only
            try {
                const currentUser = await signer.getAddress()
                setAvailableUsers([
                    {
                        address: currentUser,
                        name: "Bạn (Current User)",
                        plotCount: 0
                    }
                ])

                if (!currentUserAddress) {
                    setCurrentUserAddress(currentUser)
                    setSelectedUserAddress(currentUser)
                }
            } catch (fallbackError) {
                console.error('Error in fallback user loading:', fallbackError)
            }
        } finally {
            setIsLoadingUsers(false)
        }
    }

    const handleUserSelect = async () => {
        if (!selectedUserAddress) {
            alert('Vui lòng chọn user')
            return
        }

        try {
            setCurrentUserAddress(selectedUserAddress)
            setIsUserSelectDialogOpen(false)

            // Notify parent component about user change
            if (onUserChange) {
                onUserChange(selectedUserAddress)
            }

            const selectedUser = availableUsers.find(u => u.address === selectedUserAddress)
            // alert(`Đã chuyển sang xem plots của ${selectedUser?.name || 'User'}`)
        } catch (error) {
            console.error('Error selecting user:', error)
            alert('Lỗi khi chọn user: ' + (error as Error).message)
        }
    }

    // Load plots with plant data
    const loadPlotsWithPlants = React.useCallback(async () => {
        if (!plots || plots.length === 0) {
            setPlotsWithPlants([])
            return
        }

        const plotsWithPlantData: PlotWithPlant[] = []

        for (const plot of plots) {
            try {
                let plantData: Plant | null = null

                if (plantContract) {
                    // Get plant ID for this plot
                    const plantId = await plantContract.getPlotPlants(plot.id)

                    if (plantId && parseInt(plantId.toString()) > 0) {
                        // Get plant details
                        const plant = await plantContract.getPlantedCrop(plantId)

                        plantData = {
                            id: plant.id.toString(),
                            plotId: plant.plotId.toString(),
                            itemId: plant.itemId.toString(),
                            plantedTime: plant.plantedTime.toNumber(),
                            lastTendedTime: plant.lastTendedTime.toNumber(),
                            qualityModifier: plant.qualityModifier.toNumber(),
                            growthTime: plant.growthTime.toNumber(),
                            tendCount: plant.tendCount.toNumber(),
                            isHarvested: plant.isHarvested
                        }
                    }
                }

                plotsWithPlantData.push({
                    ...plot,
                    plant: plantData
                })

            } catch (error) {
                console.log(`No plant found for plot ${plot.id}`)
                plotsWithPlantData.push({
                    ...plot,
                    plant: null
                })
            }
        }

        // Apply plant ID filter if specified
        let filteredPlots = plotsWithPlantData
        if (plantIdSearch.trim()) {
            filteredPlots = plotsWithPlantData.filter(plot => {
                if (!plot.plant) return false
                return plot.plant.id.toLowerCase().includes(plantIdSearch.toLowerCase())
            })
        }

        setPlotsWithPlants(filteredPlots)
    }, [plots, plantContract, plantIdSearch])

    // Load plots with plants when plots or plantContract changes
    React.useEffect(() => {
        loadPlotsWithPlants()
    }, [loadPlotsWithPlants])

    // Load users when component mounts
    React.useEffect(() => {
        loadAvailableUsers()
    }, [playerContract, signer])

    // =======================
    // 5. Helper Functions
    // =======================
    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString()
    }

    const getPlotTypeColor = (plotType: number) => {
        switch (plotType) {
            case 0: return "bg-gray-100 text-gray-800 border-gray-200" // Thường
            case 1: return "bg-green-100 text-green-800 border-green-200" // Phì nhiêu
            case 2: return "bg-purple-100 text-purple-800 border-purple-200" // Ma thuật
            default: return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    const getFertilityColor = (fertility: number) => {
        if (fertility >= 80) return "bg-green-100 text-green-800 border-green-200"
        if (fertility >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        if (fertility >= 40) return "bg-orange-100 text-orange-800 border-orange-200"
        return "bg-red-100 text-red-800 border-red-200"
    }

    const getPlantStatusColor = (plant: Plant | null) => {
        if (!plant) return "bg-gray-100 text-gray-800 border-gray-200"
        if (plant.isHarvested) return "bg-yellow-100 text-yellow-800 border-yellow-200"

        const currentTime = Math.floor(Date.now() / 1000)
        const timeElapsed = currentTime - plant.plantedTime

        if (timeElapsed >= plant.growthTime) return "bg-green-100 text-green-800 border-green-200"
        return "bg-blue-100 text-blue-800 border-blue-200"
    }

    const getPlantStatusText = (plant: Plant | null) => {
        if (!plant) return "Trống"
        if (plant.isHarvested) return "Đã thu hoạch"

        const currentTime = Math.floor(Date.now() / 1000)
        const timeElapsed = currentTime - plant.plantedTime

        if (timeElapsed >= plant.growthTime) return "Sẵn sàng"
        return "Đang phát triển"
    }

    // =======================
    // 6. Table Columns
    // =======================
    const columns: ColumnDef<PlotWithPlant, any>[] = [
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
            header: "Plot ID",
            cell: ({ row }) => {
                const id = row.getValue("id") as string
                return (
                    <div className="w-[120px]">
                        <Badge variant="outline" className="font-mono text-xs">
                            {id.slice(0, 8)}...{id.slice(-4)}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "ID duy nhất của ô đất" }
        },
        {
            accessorKey: "owner",
            header: "Owner",
            cell: ({ row }) => {
                return (
                    <div className="w-[120px]">
                        <Badge variant="outline" className="font-mono text-xs">
                            {formatAddress(row.getValue("owner"))}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Địa chỉ chủ sở hữu ô đất" }
        },
        {
            accessorKey: "plotType",
            header: "Loại đất",
            cell: ({ row }) => {
                const plotType = row.getValue("plotType") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${getPlotTypeColor(plotType)}`}>
                            <Layers className="h-3 w-3 mr-1" />
                            {PlotTypeNames[plotType as keyof typeof PlotTypeNames]}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Loại đất (Thường/Phì nhiêu/Ma thuật)" }
        },
        {
            accessorKey: "fertility",
            header: "Độ phì nhiêu",
            cell: ({ row }) => {
                const fertility = row.getValue("fertility") as number
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${getFertilityColor(fertility)}`}>
                            <Sprout className="h-3 w-3 mr-1" />
                            {fertility}%
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Độ phì nhiêu của đất (0-100%)" }
        },
        {
            accessorKey: "xCoordinate",
            header: "Tọa độ X",
            cell: ({ row }) => {
                const x = row.getValue("xCoordinate") as number
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className="text-xs">
                            {x}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Tọa độ X trên lưới" }
        },
        {
            accessorKey: "yCoordinate",
            header: "Tọa độ Y",
            cell: ({ row }) => {
                const y = row.getValue("yCoordinate") as number
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className="text-xs">
                            {y}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Tọa độ Y trên lưới" }
        },
        {
            accessorKey: "isActive",
            header: "Trạng thái",
            cell: ({ row }) => {
                const isActive = row.getValue("isActive") as boolean
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {isActive ? 'Hoạt động' : 'Không hoạt động'}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Trạng thái hoạt động của ô đất" }
        },
        {
            accessorKey: "isLocked",
            header: "Khóa",
            cell: ({ row }) => {
                const isLocked = row.getValue("isLocked") as boolean
                return (
                    <div className="w-[80px]">
                        <Badge variant="outline" className={`text-xs ${isLocked ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Trạng thái khóa của ô đất" }
        },
        {
            accessorKey: "creationTime",
            header: "Thời gian tạo",
            cell: ({ row }) => {
                const creationTime = row.getValue("creationTime") as number
                return (
                    <div className="w-[150px]">
                        <div className="text-xs text-muted-foreground">
                            {formatDate(creationTime)}
                        </div>
                    </div>
                )
            },
            meta: { tooltip: "Thời gian tạo ô đất" }
        },
        {
            accessorKey: "plant",
            header: "Cây trồng",
            cell: ({ row }) => {
                const plant = row.original.plant || null

                const PlantStatusBadge = () => (
                    <Badge variant="outline" className={`text-xs ${getPlantStatusColor(plant)}`}>
                        <Sprout className="h-3 w-3 mr-1" />
                        {getPlantStatusText(plant)}
                    </Badge>
                )

                if (!plant) {
                    return (
                        <div className="w-[120px]">
                            <PlantStatusBadge />
                        </div>
                    )
                }

                // Calculate progress for popover
                const currentTime = Math.floor(Date.now() / 1000)
                const timeElapsed = currentTime - plant.plantedTime
                const progress = Math.min(100, Math.round((timeElapsed / plant.growthTime) * 100))
                const displayQuality = Math.min(150, plant.qualityModifier) // Giới hạn hiển thị tối đa 150%
                const qualityColor = displayQuality >= 120 ? "text-purple-600" :
                    displayQuality >= 100 ? "text-green-600" :
                        displayQuality >= 80 ? "text-blue-600" :
                            displayQuality >= 60 ? "text-yellow-600" :
                                displayQuality >= 40 ? "text-orange-600" : "text-red-600"

                return (
                    <div className="">
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="cursor-help flex items-center gap-2 hover:bg-accent/50 p-1 rounded transition-colors">
                                    <div className="text-xs text-muted-foreground mt-1">
                                        ID: {plant.itemId}
                                    </div>
                                    <PlantStatusBadge />

                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3" side="right">
                                <div className="space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center gap-2 pb-2 border-b">
                                        <Sprout className="h-4 w-4 text-green-600" />
                                        <h4 className="font-medium text-sm">Chi tiết cây trồng</h4>
                                    </div>

                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Plant ID:</span>
                                            <div className="font-mono text-xs">
                                                {plant.id.length > 8 ? `${plant.id.slice(0, 6)}...${plant.id.slice(-4)}` : plant.id}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Item ID:</span>
                                            <div className="font-mono text-xs">{plant.itemId}</div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Trạng thái:</span>
                                            <div className={getPlantStatusColor(plant).includes('green') ? 'text-green-600' :
                                                getPlantStatusColor(plant).includes('blue') ? 'text-blue-600' :
                                                    getPlantStatusColor(plant).includes('yellow') ? 'text-yellow-600' : 'text-gray-600'}>
                                                {getPlantStatusText(plant)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Chăm sóc:</span>
                                            <div>{plant.tendCount} lần</div>
                                        </div>
                                    </div>

                                    {/* Progress Section */}
                                    {!plant.isHarvested && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Tiến độ:</span>
                                                <span className="text-xs font-medium">{progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                                                        }`}
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            {progress < 100 && (
                                                <div className="text-xs text-muted-foreground">
                                                    Còn: {formatTimeRemaining(plant.growthTime - timeElapsed)}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Quality Section */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">Chất lượng:</span>
                                            <span className={`text-xs font-medium ${qualityColor}`}>
                                                {displayQuality}%
                                                {plant.qualityModifier > 150 && (
                                                    <span className="text-xs text-purple-500 ml-1">MAX</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${displayQuality >= 120 ? 'bg-purple-500' :
                                                    displayQuality >= 100 ? 'bg-green-500' :
                                                        displayQuality >= 80 ? 'bg-blue-500' :
                                                            displayQuality >= 60 ? 'bg-yellow-500' :
                                                                displayQuality >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${Math.min(100, (displayQuality / 150) * 100)}%` }}
                                            ></div>
                                        </div>
                                        {displayQuality >= 120 && (
                                            <div className="text-xs text-purple-600 font-medium">
                                                🌟 Chất lượng xuất sắc!
                                            </div>
                                        )}
                                    </div>

                                    {/* Timestamps */}
                                    <div className="space-y-1 pt-2 border-t">
                                        <div className="text-xs space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Trồng:</span>
                                                <span>{new Date(plant.plantedTime * 1000).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            {plant.lastTendedTime > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Chăm sóc:</span>
                                                    <span>{new Date(plant.lastTendedTime * 1000).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
            meta: { tooltip: "Trạng thái cây trồng - Hover để xem chi tiết" }
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
                                    // TODO: Implement view plot details
                                    alert("Chức năng xem chi tiết ô đất chưa được implement")
                                }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Xem chi tiết
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedPlotForPlant(row.original)
                                        setIsPlantDialogOpen(true)
                                    }}
                                    disabled={!row.original.isActive || row.original.isLocked || !!row.original.plant}
                                >
                                    <Flower2 className="mr-2 h-4 w-4" />
                                    Trồng cây
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleTendPlant(row.original)}
                                    disabled={!row.original.isActive || row.original.isLocked || !row.original.plant || row.original.plant.isHarvested}
                                >
                                    <Heart className="mr-2 h-4 w-4" />
                                    Chăm sóc
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleHarvestPlant(row.original)}
                                    disabled={!row.original.isActive || row.original.isLocked || !row.original.plant || row.original.plant.isHarvested || (() => {
                                        if (!row.original.plant) return true
                                        const currentTime = Math.floor(Date.now() / 1000)
                                        const timeElapsed = currentTime - row.original.plant.plantedTime
                                        return timeElapsed < row.original.plant.growthTime
                                    })()}
                                >
                                    <Scissors className="mr-2 h-4 w-4" />
                                    Thu hoạch
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        // TODO: Implement delete plot
                                        alert("Chức năng xóa ô đất chưa được implement trong contract")
                                    }}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Xóa ô đất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
            meta: { tooltip: "Các hành động có thể thực hiện" }
        },
    ]

    // =======================
    // 7. Dialog State
    // =======================
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
    const [createFormData, setCreateFormData] = React.useState({
        xCoordinate: 0,
        yCoordinate: 0
    })

    // Farm action dialogs
    const [isPlantDialogOpen, setIsPlantDialogOpen] = React.useState(false)
    const [selectedPlotForPlant, setSelectedPlotForPlant] = React.useState<Plot | null>(null)
    const [seedIdInput, setSeedIdInput] = React.useState<string>("")

    // User selection dialogs
    const [isUserSelectDialogOpen, setIsUserSelectDialogOpen] = React.useState(false)
    const [selectedUserAddress, setSelectedUserAddress] = React.useState<string>("")
    const [currentUserAddress, setCurrentUserAddress] = React.useState<string>("")
    const [userSearchValue, setUserSearchValue] = React.useState<string>("")
    const [availableUsers, setAvailableUsers] = React.useState<{ address: string, name: string, plotCount: number }[]>([])
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(false)

    // =======================
    // 8. Render UI
    // =======================

    const filteredUsers = availableUsers.filter(user => {
        if (!userSearchValue) return true
        return user.name.toLowerCase().includes(userSearchValue.toLowerCase()) ||
            user.address.toLowerCase().includes(userSearchValue.toLowerCase())
    })

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
                            {error.includes('kết nối ví') ? 'Ví chưa được kết nối' : 'Lỗi tải dữ liệu'}
                        </CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error.includes('kết nối ví') ? (
                            <div className="text-center py-4">
                                <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">
                                    Vui lòng kết nối ví MetaMask để xem và quản lý ô đất
                                </p>
                            </div>
                        ) : (
                            <Button onClick={refreshPlots} className="w-full">
                                Thử lại
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
                    {/* User Selection Header */}
                    {currentUserAddress && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Đang xem plots của:</span>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {availableUsers.find(u => u.address === currentUserAddress)?.name || formatAddress(currentUserAddress)}
                                    </Badge>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsUserSelectDialogOpen(true)}
                                >
                                    <Users className="h-4 w-4 mr-2" />
                                    Đổi user
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Search
                                placeholder="Tìm kiếm ô đất..."
                                value={searchValue}
                                onSearch={handleSearch}
                            />
                            <Input
                                placeholder="Tìm Plant ID..."
                                value={plantIdSearch}
                                onChange={(e) => setPlantIdSearch(e.target.value)}
                                className="w-48"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshPlots}
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
                                <PopoverContent className="w-[500px] p-6">
                                    <div className="grid gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-medium leading-none">Bộ lọc ô đất</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Chọn tiêu chí để lọc ô đất
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
                                                    <Label htmlFor="plotType" className="text-sm font-medium">Loại đất</Label>
                                                    <Select value={selectedPlotType} onValueChange={setSelectedPlotType}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Chọn loại đất" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">Thường</SelectItem>
                                                            <SelectItem value="1">Phì nhiêu</SelectItem>
                                                            <SelectItem value="2">Ma thuật</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="minFertility" className="text-sm font-medium">Độ phì nhiêu tối thiểu</Label>
                                                    <Input
                                                        id="minFertility"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={minFertility}
                                                        onChange={(e) => setMinFertility(e.target.value)}
                                                        placeholder="Độ phì nhiêu tối thiểu"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="maxFertility" className="text-sm font-medium">Độ phì nhiêu tối đa</Label>
                                                    <Input
                                                        id="maxFertility"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={maxFertility}
                                                        onChange={(e) => setMaxFertility(e.target.value)}
                                                        placeholder="Độ phì nhiêu tối đa"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="activeStatus" className="text-sm font-medium">Trạng thái hoạt động</Label>
                                                    <Select value={selectedActiveStatus} onValueChange={setSelectedActiveStatus}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Chọn trạng thái" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="true">Hoạt động</SelectItem>
                                                            <SelectItem value="false">Không hoạt động</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="lockStatus" className="text-sm font-medium">Trạng thái khóa</Label>
                                                    <Select value={selectedLockStatus} onValueChange={setSelectedLockStatus}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Chọn trạng thái khóa" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="true">Bị khóa</SelectItem>
                                                            <SelectItem value="false">Không bị khóa</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={() => {
                                                if (selectedPlotType) {
                                                    handleFilterChange('plotType', parseInt(selectedPlotType))
                                                }
                                                if (selectedActiveStatus) {
                                                    handleFilterChange('isActive', selectedActiveStatus === 'true')
                                                }
                                                if (selectedLockStatus) {
                                                    handleFilterChange('isLocked', selectedLockStatus === 'true')
                                                }
                                                handleFertilityFilterChange()
                                                setIsFilterOpen(false)
                                            }}>
                                                Áp dụng bộ lọc
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
                                            Xóa ô đất đã chọn
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo ô đất mới
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    {plotsWithPlants.length === 0 ? (
                        <div className="text-center py-12">
                            <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                Không tìm thấy ô đất
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Chưa có ô đất nào được tạo trong hệ thống
                            </p>
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo ô đất đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={plotsWithPlants}
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
                title="Xóa ô đất"
                description={`Bạn có chắc chắn muốn xóa ${selectedRows.length} ô đất đã chọn? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                variant="destructive"
            />

            {/* Create Plot Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Tạo ô đất mới</DialogTitle>
                        <DialogDescription>
                            Nhập tọa độ để tạo ô đất mới trên lưới
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="create-x" className="text-sm font-medium">Tọa độ X</Label>
                                <Input
                                    id="create-x"
                                    type="number"
                                    value={createFormData.xCoordinate}
                                    onChange={(e) => setCreateFormData({ ...createFormData, xCoordinate: parseInt(e.target.value) || 0 })}
                                    placeholder="Nhập tọa độ X"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="create-y" className="text-sm font-medium">Tọa độ Y</Label>
                                <Input
                                    id="create-y"
                                    type="number"
                                    value={createFormData.yCoordinate}
                                    onChange={(e) => setCreateFormData({ ...createFormData, yCoordinate: parseInt(e.target.value) || 0 })}
                                    placeholder="Nhập tọa độ Y"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Loại đất sẽ được xác định ngẫu nhiên dựa trên thời tiết hiện tại
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreatePlot}>
                            Tạo ô đất
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Plant Seed Dialog */}
            <Dialog open={isPlantDialogOpen} onOpenChange={setIsPlantDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Trồng hạt giống</DialogTitle>
                        <DialogDescription>
                            Nhập ID hạt giống để trồng trên ô đất tại tọa độ ({selectedPlotForPlant?.xCoordinate}, {selectedPlotForPlant?.yCoordinate})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="seed-id-input" className="text-sm font-medium">ID Hạt giống</Label>
                            <Input
                                id="seed-id-input"
                                type="number"
                                min="1"
                                value={seedIdInput}
                                onChange={(e) => setSeedIdInput(e.target.value)}
                                placeholder="Nhập ID hạt giống (ví dụ: 1, 2, 3...)"
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Nhập ID của hạt giống bạn muốn trồng. ID phải là số nguyên dương.
                            </p>
                        </div>

                        {seedIdInput && (
                            <div className="p-3 bg-muted rounded-lg">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="font-medium">ID Hạt giống:</span>
                                        <span className="font-mono">{seedIdInput}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Loại đất:</span>
                                        <span>{PlotTypeNames[selectedPlotForPlant?.plotType as keyof typeof PlotTypeNames]}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Độ phì nhiêu:</span>
                                        <span>{selectedPlotForPlant?.fertility}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Tọa độ:</span>
                                        <span>({selectedPlotForPlant?.xCoordinate}, {selectedPlotForPlant?.yCoordinate})</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">💡 Lưu ý:</p>
                                <ul className="text-xs space-y-1 list-disc list-inside">
                                    <li>ID hạt giống phải tồn tại trong hệ thống</li>
                                    <li>Mỗi loại hạt giống có thời gian trồng khác nhau</li>
                                    <li>Sau khi trồng, bạn có thể chăm sóc để tăng chất lượng</li>
                                    <li>Hãy kiểm tra kho đồ để xem ID các hạt giống có sẵn</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsPlantDialogOpen(false)
                            setSelectedPlotForPlant(null)
                            setSeedIdInput("")
                        }}>
                            Hủy
                        </Button>
                        <Button onClick={handlePlantSeed} disabled={!seedIdInput.trim()}>
                            <Flower2 className="mr-2 h-4 w-4" />
                            Trồng cây
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Selection Dialog */}
            <Dialog open={isUserSelectDialogOpen} onOpenChange={setIsUserSelectDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Chọn User để xem Plots</DialogTitle>
                        <DialogDescription>
                            Chọn user để xem danh sách ô đất của họ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Search Users */}
                        <div className="space-y-2">
                            <Label htmlFor="user-search" className="text-sm font-medium">Tìm kiếm user</Label>
                            <div className="relative">
                                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="user-search"
                                    placeholder="Tìm theo tên hoặc địa chỉ..."
                                    value={userSearchValue}
                                    onChange={(e) => setUserSearchValue(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* User List */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            <Label className="text-sm font-medium">Danh sách users ({filteredUsers.length})</Label>
                            {isLoadingUsers ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">Đang tải users...</span>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-sm">Không tìm thấy user nào</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredUsers.map((user) => (
                                        <div
                                            key={user.address}
                                            className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${selectedUserAddress === user.address ? 'border-primary bg-primary/5' : 'border-border'
                                                }`}
                                            onClick={() => setSelectedUserAddress(user.address)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{user.name}</span>
                                                        {user.address === currentUserAddress && (
                                                            <Badge variant="secondary" className="text-xs">Hiện tại</Badge>
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        {formatAddress(user.address)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">{user.plotCount} plots</div>
                                                    <div className="text-xs text-muted-foreground">ô đất</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedUserAddress && (
                            <div className="p-3 bg-muted rounded-lg">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="font-medium">User đã chọn:</span>
                                        <span>{availableUsers.find(u => u.address === selectedUserAddress)?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Địa chỉ:</span>
                                        <span className="font-mono text-xs">{formatAddress(selectedUserAddress)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Số plots:</span>
                                        <span>{availableUsers.find(u => u.address === selectedUserAddress)?.plotCount || 0} ô đất</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsUserSelectDialogOpen(false)
                            setSelectedUserAddress(currentUserAddress)
                            setUserSearchValue("")
                        }}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleUserSelect}
                            disabled={!selectedUserAddress || selectedUserAddress === currentUserAddress}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Chọn User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
