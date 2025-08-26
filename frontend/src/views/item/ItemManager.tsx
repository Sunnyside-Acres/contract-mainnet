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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eye, ChevronsUpDown, Settings, Zap, Shield, Heart, Star, Gauge, RefreshCw, X, Upload, Download, Clock } from "lucide-react"
import { useItemContext } from "@/context/ItemContext"
import { Item, ItemType, Rarity, Attribute } from "@/types/item.type"
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

interface ItemManagerProps {
    contract?: ethers.Contract | null
    signer?: ethers.Signer | null
}

export function ItemManager({ contract, signer }: ItemManagerProps) {
    // =======================
    // 1. State & Context
    // =======================
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [selectedRows, setSelectedRows] = React.useState<Item[]>([])
    const [searchValue, setSearchValue] = React.useState("")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [selectedItemType, setSelectedItemType] = React.useState<string>("all")
    const [selectedRarity, setSelectedRarity] = React.useState<string>("all")
    const { items, pagination, setPagination, filters, setFilters, refreshItems, isLoading, error } = useItemContext()
    const router = useRouter()

    // =======================
    // 2. Filter & Bulk Actions
    // =======================
    const handleResetFilters = () => {
        setSelectedItemType("all")
        setSelectedRarity("all")
        setFilters({
            ...filters,
            itemType: undefined,
            rarity: undefined,
            isTradable: undefined,
            isBanned: undefined
        })
    }

    const handleFilterChange = (key: string, value: any) => {
        setFilters({
            ...filters,
            [key]: value,
            page: 1 // Reset to first page when filter changes
        })
    }

    const handleItemTypeChange = (value: string) => {
        setSelectedItemType(value)
        if (value === "all") {
            handleFilterChange('itemType', undefined)
        } else {
            handleFilterChange('itemType', ItemType[value as keyof typeof ItemType])
        }
    }

    const handleRarityChange = (value: string) => {
        setSelectedRarity(value)
        if (value === "all") {
            handleFilterChange('rarity', undefined)
        } else {
            handleFilterChange('rarity', Rarity[value as keyof typeof Rarity])
        }
    }

    const handleTradableFilterChange = (checked: boolean) => {
        handleFilterChange('isTradable', checked ? true : undefined)
    }

    const handleBannedFilterChange = (checked: boolean) => {
        handleFilterChange('isBanned', checked ? true : undefined)
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
        const selectedItems = items.filter((_, index) => selectedRowIds.includes(index.toString()));
        setSelectedRows(selectedItems);
    }, [rowSelection, items]);

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
            console.log("Deleting items:", selectedRows.map(item => item.id));
            // await Promise.all(selectedRows.map(item => deleteItem(item.id)));
            // toast.success("Selected items deleted successfully");
            // queryClient.invalidateQueries({ queryKey: ['items'] });
            setRowSelection({});
        } catch (error) {
            // toast.error("Failed to delete selected items");
            console.error("Failed to delete selected items:", error);
        }
    };

    const handleBulkBan = async () => {
        try {
            // Mock API call
            console.log("Banning items:", selectedRows.map(item => item.id));
            // await Promise.all(selectedRows.map(item => banItem(item.id)));
            // toast.success("Selected items banned successfully");
            // queryClient.invalidateQueries({ queryKey: ['items'] });
            setRowSelection({});
        } catch (error) {
            // toast.error("Failed to ban selected items");
            console.error("Failed to ban selected items:", error);
        }
    };

    const handleBulkUnban = async () => {
        try {
            // Mock API call
            console.log("Unbanning items:", selectedRows.map(item => item.id));
            // await Promise.all(selectedRows.map(item => unbanItem(item.id)));
            // toast.success("Selected items unbanned successfully");
            // queryClient.invalidateQueries({ queryKey: ['items'] });
            setRowSelection({});
        } catch (error) {
            // toast.error("Failed to unban selected items");
            console.error("Failed to unban selected items:", error);
        }
    };

    const handleCreateItem = async () => {
        if (!contract) return

        try {
            const itemId = parseInt(createFormData.itemId)
            if (isNaN(itemId) || itemId <= 0) {
                alert('Item ID must be a positive integer')
                return
            }

            if (!createFormData.name.trim()) {
                alert('Item name cannot be empty')
                return
            }

            await contract.createItem(
                itemId,
                createFormData.name.trim(),
                createFormData.itemType,
                createFormData.rarity,
                parseInt(createFormData.maxStacked),
                createFormData.isStacked,
                createFormData.isTradable
            )

            // Reset form
            setCreateFormData({
                itemId: '',
                name: '',
                itemType: ItemType.Other,
                rarity: Rarity.Common,
                maxStacked: '1',
                isStacked: false,
                isTradable: false
            })
            setIsCreateDialogOpen(false)

            // Reload data from contract
            await refreshItems()
        } catch (error) {
            console.error('Error creating item:', error)
            alert('Error creating item')
        }
    }

    const handleEditItem = (item: Item) => {
        setSelectedItemForEdit(item)
        setEditFormData({
            itemId: item.id.toString(),
            name: item.name,
            itemType: item.itemType,
            rarity: item.rarity,
            maxStacked: item.maxStacked.toString(),
            isStacked: item.isStacked,
            isTradable: item.isTradable,
            isBanned: item.isBanned
        })
        setIsEditDialogOpen(true)
    }

    const handleUpdateItem = async () => {
        if (!contract || !selectedItemForEdit) return

        try {
            const itemId = parseInt(editFormData.itemId)
            if (isNaN(itemId) || itemId <= 0) {
                alert('Item ID must be a positive integer')
                return
            }

            if (!editFormData.name.trim()) {
                alert('Item name cannot be empty')
                return
            }

            await contract.updateItem(
                itemId,
                editFormData.name.trim(),
                editFormData.itemType,
                editFormData.rarity,
                parseInt(editFormData.maxStacked),
                editFormData.isStacked,
                editFormData.isTradable,
                editFormData.isBanned
            )

            // Reset form
            setEditFormData({
                itemId: '',
                name: '',
                itemType: ItemType.Other,
                rarity: Rarity.Common,
                maxStacked: '1',
                isStacked: false,
                isTradable: false,
                isBanned: false
            })
            setIsEditDialogOpen(false)
            setSelectedItemForEdit(null)

            // Reload data from contract
            await refreshItems()
        } catch (error) {
            console.error('Error updating item:', error)
            alert('Error updating item: ' + (error as Error).message)
        }
    }

    const handleManageAttributes = (item: Item) => {
        setSelectedItemForAttribute(item)
        setIsAddAttributeDialogOpen(true)
    }

    const handleAddAttribute = async () => {
        if (!contract || !selectedItemForAttribute) return

        try {
            const value = parseInt(attributeFormData.value)
            if (isNaN(value) || value <= 0) {
                alert('Attribute value must be a positive integer')
                return
            }

            await contract.setAttr(
                selectedItemForAttribute.id,
                attributeFormData.attribute,
                value
            )

            // Reset form
            setAttributeFormData({
                attribute: Attribute.Damage,
                value: ''
            })
            setIsAddAttributeDialogOpen(false)
            setSelectedItemForAttribute(null)

            // Reload data
            await refreshItems()
        } catch (error) {
            console.error('Error adding attribute:', error)
            alert('Error adding attribute: ' + (error as Error).message)
        }
    }

    const handleRemoveAttribute = (itemId: number, attribute: Attribute) => {
        setAttributeToRemove({ itemId, attribute })
        setIsRemoveAttributeDialogOpen(true)
    }

    const handleConfirmRemoveAttribute = async () => {
        if (!contract || !attributeToRemove) return

        try {
            await contract.removeAttr(
                attributeToRemove.itemId,
                attributeToRemove.attribute
            )

            // Reset state
            setAttributeToRemove(null)
            setIsRemoveAttributeDialogOpen(false)

            // Reload data
            await refreshItems()
        } catch (error) {
            console.error('Error removing attribute:', error)
            alert('Error removing attribute: ' + (error as Error).message)
        }
    }

    const handleManageDrops = (item: Item) => {
        setSelectedItemForDrops(item)
        // Load current drops for this item
        if (item.drops && item.drops.length > 0) {
            setDropsFormData(item.drops.map(drop => ({
                itemId: drop.itemId,
                probability: drop.probability,
                yieldAmount: drop.yield
            })))
        } else {
            setDropsFormData([])
        }
        setIsManageDropsDialogOpen(true)
    }

    const handleAddDrop = () => {
        if (!dropFormData.itemId || !dropFormData.probability || !dropFormData.yieldAmount) {
            alert('Please fill in all drop information')
            return
        }

        const itemId = parseInt(dropFormData.itemId)
        const probability = Math.round(parseFloat(dropFormData.probability) * 100) // Convert % to x100
        const yieldAmount = parseInt(dropFormData.yieldAmount)

        if (isNaN(itemId) || itemId <= 0) {
            alert('Item ID must be a positive integer')
            return
        }

        if (isNaN(probability) || probability <= 0 || probability > 10000) {
            alert('Probability must be from 1 to 10000 (0.01% to 100%)')
            return
        }

        if (isNaN(yieldAmount) || yieldAmount <= 0) {
            alert('Yield must be a positive integer')
            return
        }

        // Check if itemId already exists in drops
        const existingDrop = dropsFormData.find(drop => drop.itemId === itemId)
        if (existingDrop) {
            alert('This item already exists in the drops list')
            return
        }

        // Add new drop
        setDropsFormData([...dropsFormData, { itemId, probability, yieldAmount }])

        // Reset form
        setDropFormData({
            itemId: '',
            probability: '',
            yieldAmount: ''
        })
    }



    const handleRemoveDrop = (index: number) => {
        setDropsFormData(dropsFormData.filter((_, i) => i !== index))
    }

    const handleClearAllDrops = () => {
        setDropsFormData([])
    }

    const handleDownloadTemplate = () => {
        const link = document.createElement('a')
        link.href = '/templates/item-template.csv'
        link.download = 'item-template.csv'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleDownloadReadme = () => {
        const link = document.createElement('a')
        link.href = '/templates/README.md'
        link.download = 'CSV-Format-Guide.md'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const parseCSV = (csvText: string) => {
        const lines = csvText.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        const data = []

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const values = line.split(',').map(v => v.trim())
            const row: any = {}

            headers.forEach((header, index) => {
                let value = values[index] || ''

                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1)
                }

                row[header] = value
            })

            data.push(row)
        }

        return data
    }

    const parseAttributes = (attributesStr: string) => {
        if (!attributesStr) return {}

        const attributes: { [key: string]: number } = {}
        const pairs = attributesStr.split(',').map(p => p.trim())

        pairs.forEach(pair => {
            const [attr, value] = pair.split(':').map(p => p.trim())
            if (attr && value) {
                const numValue = parseInt(value)
                if (!isNaN(numValue)) {
                    attributes[attr] = numValue
                }
            }
        })

        return attributes
    }

    const parseDrops = (dropsStr: string) => {
        if (!dropsStr) return []

        const drops: Array<{ itemId: number, probability: number, yieldAmount: number }> = []
        const pairs = dropsStr.split(',').map(p => p.trim())

        pairs.forEach(pair => {
            const [itemId, probability, yieldAmount] = pair.split(':').map(p => p.trim())
            if (itemId && probability && yieldAmount) {
                const numItemId = parseInt(itemId)
                const numProbability = Math.round(parseFloat(probability) * 100)
                const numYieldAmount = parseInt(yieldAmount)

                if (!isNaN(numItemId) && !isNaN(numProbability) && !isNaN(numYieldAmount)) {
                    drops.push({
                        itemId: numItemId,
                        probability: numProbability,
                        yieldAmount: numYieldAmount
                    })
                }
            }
        })

        return drops
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            alert('Vui lòng chọn file CSV')
            return
        }

        setSelectedFile(file)
        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            setImportData(content)
        }
        reader.onerror = () => {
            alert('Lỗi đọc file. Vui lòng thử lại.')
        }
        reader.readAsText(file)
    }

    const handleImportPreview = () => {
        if (!importData.trim()) {
            alert('Vui lòng tải lên file CSV hoặc nhập dữ liệu')
            return
        }

        try {
            const parsedData = parseCSV(importData)
            const preview = parsedData.map(row => ({
                itemId: parseInt(row.item_id),
                name: row.item_name,
                itemType: parseInt(row.item_type),
                rarity: parseInt(row.rarity),
                maxStacked: parseInt(row.max_stacked) || 1,
                isStacked: row.is_stacked === 'true',
                isTradable: row.is_tradable === 'true',
                attributes: parseAttributes(row.attributes),
                drops: parseDrops(row.drops)
            }))

            setImportPreview(preview)
        } catch (error) {
            alert('Lỗi phân tích CSV: ' + (error as Error).message)
        }
    }

    const handleImportItems = async () => {
        if (!contract || importPreview.length === 0) return

        setIsImporting(true)
        try {
            for (const item of importPreview) {
                // Create item
                await contract.createItem(
                    item.itemId,
                    item.name,
                    item.itemType,
                    item.rarity,
                    item.maxStacked,
                    item.isStacked,
                    item.isTradable
                )

                // Add attributes
                for (const [attr, value] of Object.entries(item.attributes)) {
                    const attributeKey = attr as keyof typeof Attribute
                    if (Attribute[attributeKey] !== undefined) {
                        await contract.setAttr(item.itemId, Attribute[attributeKey], value)
                    }
                }

                // Add drops if any
                if (item.drops.length > 0) {
                    await contract.createDrops(item.itemId, item.drops.map((drop: { itemId: number, probability: number, yieldAmount: number }) => ({
                        itemId: drop.itemId,
                        probability: drop.probability,
                        yield: drop.yieldAmount
                    })))
                }
            }

            // Reset and close dialog
            setImportData('')
            setImportPreview([])
            setSelectedFile(null)
            setIsImportDialogOpen(false)

            // Reload data
            await refreshItems()

            alert(`Đã import thành công ${importPreview.length} items`)
        } catch (error) {
            console.error('Import error:', error)
            alert('Lỗi import: ' + (error as Error).message)
        } finally {
            setIsImporting(false)
        }
    }

    const handleCreateDrops = async () => {
        if (!contract || !selectedItemForDrops) return

        try {
            // Check total probability = 10000 (100%)
            const totalProbability = dropsFormData.reduce((sum, drop) => sum + drop.probability, 0)
            if (totalProbability !== 10000) {
                alert(`Total probability must be 100% (10000). Current: ${totalProbability / 100}%`)
                return
            }

            // Call contract to create drops
            await contract.createDrops(selectedItemForDrops.id, dropsFormData.map(drop => ({
                itemId: drop.itemId,
                probability: drop.probability,
                yield: drop.yieldAmount
            })))

            // Reset state
            setDropsFormData([])
            setDropFormData({
                itemId: '',
                probability: '',
                yieldAmount: ''
            })
            setIsManageDropsDialogOpen(false)
            setSelectedItemForDrops(null)

            // Reload data
            await refreshItems()
        } catch (error) {
            console.error('Error creating drops:', error)
            alert('Error creating drops: ' + (error as Error).message)
        }
    }

    // =======================
    // 3. Helper Functions
    // =======================
    const getAttributeIcon = (attribute: Attribute) => {
        const iconMap: Record<Attribute, React.ReactElement> = {
            [Attribute.Damage]: <Zap className="h-3 w-3" />,
            [Attribute.Durability]: <Shield className="h-3 w-3" />,
            [Attribute.GrowthRate]: <Gauge className="h-3 w-3" />,
            [Attribute.YieldBonus]: <Star className="h-3 w-3" />,
            [Attribute.Health]: <Heart className="h-3 w-3" />,
            [Attribute.Speed]: <Gauge className="h-3 w-3" />,
            [Attribute.Resistance]: <Shield className="h-3 w-3" />,
            [Attribute.Strength]: <Zap className="h-3 w-3" />,
            [Attribute.Agility]: <Gauge className="h-3 w-3" />,
            [Attribute.Stamina]: <Heart className="h-3 w-3" />,
            [Attribute.Fertility]: <Star className="h-3 w-3" />,
            [Attribute.WaterUsage]: <Gauge className="h-3 w-3" />,
            [Attribute.FeedEfficiency]: <Star className="h-3 w-3" />,
            [Attribute.Quality]: <Star className="h-3 w-3" />,
            [Attribute.HarvestCooldown]: <Clock className="h-3 w-3" />,
        }
        return iconMap[attribute] || <Settings className="h-3 w-3" />
    }

    const getAttributeName = (attribute: Attribute) => {
        const nameMap = {
            [Attribute.Damage]: "Damage",
            [Attribute.Durability]: "Durability",
            [Attribute.GrowthRate]: "Growth Rate",
            [Attribute.YieldBonus]: "Yield Bonus",
            [Attribute.Health]: "Health",
            [Attribute.Speed]: "Speed",
            [Attribute.Resistance]: "Resistance",
            [Attribute.Strength]: "Strength",
            [Attribute.Agility]: "Agility",
            [Attribute.Stamina]: "Stamina",
            [Attribute.Fertility]: "Fertility",
            [Attribute.WaterUsage]: "Water Usage",
            [Attribute.FeedEfficiency]: "Feed Efficiency",
            [Attribute.Quality]: "Quality",
            [Attribute.HarvestCooldown]: "Harvest Cooldown"
        }
        return nameMap[attribute] || `Attribute ${attribute}`
    }

    const getRarityColor = (rarity: Rarity) => {
        const colorMap = {
            [Rarity.Common]: "bg-gray-100 text-gray-800 border-gray-200",
            [Rarity.Uncommon]: "bg-green-100 text-green-800 border-green-200",
            [Rarity.Rare]: "bg-blue-100 text-blue-800 border-blue-200",
            [Rarity.Epic]: "bg-purple-100 text-purple-800 border-purple-200",
            [Rarity.Legendary]: "bg-yellow-100 text-yellow-800 border-yellow-200"
        }
        return colorMap[rarity]
    }

    const getItemTypeColor = (itemType: ItemType) => {
        const colorMap = {
            [ItemType.Weapon]: "bg-red-100 text-red-800 border-red-200",
            [ItemType.Consumable]: "bg-orange-100 text-orange-800 border-orange-200",
            [ItemType.Material]: "bg-gray-100 text-gray-800 border-gray-200",
            [ItemType.Seed]: "bg-green-100 text-green-800 border-green-200",
            [ItemType.Crop]: "bg-emerald-100 text-emerald-800 border-emerald-200",
            [ItemType.Livestock]: "bg-pink-100 text-pink-800 border-pink-200",
            [ItemType.AnimalFeed]: "bg-amber-100 text-amber-800 border-amber-200",
            [ItemType.Tool]: "bg-blue-100 text-blue-800 border-blue-200",
            [ItemType.Quest]: "bg-purple-100 text-purple-800 border-purple-200",
            [ItemType.Other]: "bg-slate-100 text-slate-800 border-slate-200"
        }
        return colorMap[itemType]
    }

    const getItemTypeName = (itemType: ItemType) => {
        const typeNames = {
            [ItemType.Weapon]: "Weapon",
            [ItemType.Consumable]: "Consumable",
            [ItemType.Material]: "Material",
            [ItemType.Seed]: "Seed",
            [ItemType.Crop]: "Crop",
            [ItemType.Livestock]: "Livestock",
            [ItemType.AnimalFeed]: "Animal Feed",
            [ItemType.Tool]: "Tool",
            [ItemType.Quest]: "Quest",
            [ItemType.Other]: "Other"
        }
        return typeNames[itemType]
    }

    const getRarityName = (rarity: Rarity) => {
        const rarityNames = {
            [Rarity.Common]: "Common",
            [Rarity.Uncommon]: "Uncommon",
            [Rarity.Rare]: "Rare",
            [Rarity.Epic]: "Epic",
            [Rarity.Legendary]: "Legendary"
        }
        return rarityNames[rarity]
    }

    // =======================
    // 4. Table Columns
    // =======================
    const columns: ColumnDef<Item, any>[] = [
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
                            #{row.original.id}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Unique item ID" }
        },
        {
            accessorKey: "name",
            header: "Item Name",
            cell: ({ row }) => {
                return (
                    <div className="max-w-[200px]">
                        <div className="font-medium text-sm">{row.getValue("name")}</div>
                        {row.original.isBanned && (
                            <Badge variant="destructive" className="text-xs mt-1">
                                Banned
                            </Badge>
                        )}
                    </div>
                )
            },
            meta: { tooltip: "Item name" }
        },
        {
            accessorKey: "itemType",
            header: "Type",
            cell: ({ row }) => {
                const itemType = row.getValue("itemType") as ItemType
                return (
                    <div className="w-[100px]">
                        <Badge variant="outline" className={`text-xs ${getItemTypeColor(itemType)}`}>
                            {getItemTypeName(itemType)}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Item type" }
        },
        {
            accessorKey: "rarity",
            header: "Rarity",
            cell: ({ row }) => {
                const rarity = row.getValue("rarity") as Rarity
                return (
                    <div className="w-[120px]">
                        <Badge variant="outline" className={`text-xs ${getRarityColor(rarity)}`}>
                            {getRarityName(rarity)}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Item rarity" }
        },
        {
            accessorKey: "isTradable",
            header: "Trade",
            cell: ({ row }) => {
                const isTradable = row.getValue("isTradable") as boolean
                return (
                    <div className="w-[80px]">
                        <Badge variant={isTradable ? "default" : "secondary"} className="text-xs">
                            {isTradable ? "Yes" : "No"}
                        </Badge>
                    </div>
                )
            },
            meta: { tooltip: "Whether the item can be traded" }
        },
        {
            accessorKey: "attributes",
            header: "Attributes",
            cell: ({ row }) => {
                const attributes = row.original.attributes || {}
                const attributeCount = Object.keys(attributes).length
                return (
                    <div className="w-[100px]">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                                    <Settings className="h-3 w-3 mr-1" />
                                    {attributeCount} attributes
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Item Attributes</h4>
                                        <Badge variant="outline" className="text-xs">
                                            {attributeCount} attributes
                                        </Badge>
                                    </div>
                                    <Separator />
                                    {Object.entries(attributes).map(([key, value]) => {
                                        const attribute = Number(key) as Attribute
                                        return (
                                            <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                                <div className="flex items-center space-x-2">
                                                    {getAttributeIcon(attribute)}
                                                    <span className="text-sm font-medium">
                                                        {getAttributeName(attribute)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {value}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveAttribute(row.original.id, attribute)}
                                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {attributeCount === 0 && (
                                        <div className="text-center py-4 text-muted-foreground text-sm">
                                            No attributes
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
            meta: { tooltip: "Item attributes" }
        },
        {
            accessorKey: "drops",
            header: "Drops",
            cell: ({ row }) => {
                const drops = row.original.drops || []
                const dropCount = drops.length
                return (
                    <div className="w-[100px]">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                                    <Zap className="h-3 w-3 mr-1" />
                                    {dropCount} drops
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Item Drops</h4>
                                        <Badge variant="outline" className="text-xs">
                                            {dropCount} drops
                                        </Badge>
                                    </div>
                                    <Separator />
                                    {drops.map((drop, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    #{drop.itemId}
                                                </Badge>
                                                <span className="text-sm font-medium">
                                                    {(drop.probability / 100).toFixed(1)}% × {drop.yield}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {dropCount === 0 && (
                                        <div className="text-center py-4 text-muted-foreground text-sm">
                                            No drops
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
            meta: { tooltip: "Item drops" }
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
                                <DropdownMenuItem onClick={() => handleEditItem(row.original)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageAttributes(row.original)}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Manage Attributes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageDrops(row.original)}>
                                    <Zap className="mr-2 h-4 w-4" />
                                    Create Drops
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem
                                    onClick={() => handleBulkBan()}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {row.original.isBanned ? "Unban" : "Ban Item"}
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
    // 5. Handlers
    // =======================
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [isBanDialogOpen, setIsBanDialogOpen] = React.useState(false)
    const [isUnbanDialogOpen, setIsUnbanDialogOpen] = React.useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
    const [createFormData, setCreateFormData] = React.useState({
        itemId: '',
        name: '',
        itemType: ItemType.Other,
        rarity: Rarity.Common,
        maxStacked: '1',
        isStacked: false,
        isTradable: false
    })

    // Attribute dialog state
    const [isAddAttributeDialogOpen, setIsAddAttributeDialogOpen] = React.useState(false)
    const [selectedItemForAttribute, setSelectedItemForAttribute] = React.useState<Item | null>(null)
    const [attributeFormData, setAttributeFormData] = React.useState({
        attribute: Attribute.Damage,
        value: ''
    })

    // Remove attribute dialog state
    const [isRemoveAttributeDialogOpen, setIsRemoveAttributeDialogOpen] = React.useState(false)
    const [attributeToRemove, setAttributeToRemove] = React.useState<{ itemId: number, attribute: Attribute } | null>(null)

    // Manage drops dialog state
    const [isManageDropsDialogOpen, setIsManageDropsDialogOpen] = React.useState(false)
    const [selectedItemForDrops, setSelectedItemForDrops] = React.useState<Item | null>(null)
    const [dropsFormData, setDropsFormData] = React.useState<Array<{ itemId: number, probability: number, yieldAmount: number }>>([])
    const [dropFormData, setDropFormData] = React.useState({
        itemId: '',
        probability: '',
        yieldAmount: ''
    })

    // Import dialog state
    const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false)
    const [importData, setImportData] = React.useState<string>('')
    const [importPreview, setImportPreview] = React.useState<any[]>([])
    const [isImporting, setIsImporting] = React.useState(false)
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)

    // Edit dialog state
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
    const [selectedItemForEdit, setSelectedItemForEdit] = React.useState<Item | null>(null)
    const [editFormData, setEditFormData] = React.useState({
        itemId: '',
        name: '',
        itemType: ItemType.Other,
        rarity: Rarity.Common,
        maxStacked: '1',
        isStacked: false,
        isTradable: false,
        isBanned: false
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
                                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">
                                    Please connect MetaMask wallet to view and manage items
                                </p>
                            </div>
                        ) : (
                            <Button onClick={refreshItems} className="w-full">
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
                                placeholder="Search items..."
                                value={searchValue}
                                onSearch={handleSearch}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshItems}
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
                                <PopoverContent className="w-[500px] p-6">
                                    <div className="grid gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-medium leading-none">Item Filters</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Select criteria to filter items
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
                                                    <Label htmlFor="itemType" className="text-sm font-medium">Item Type</Label>
                                                    <Select
                                                        value={selectedItemType}
                                                        onValueChange={handleItemTypeChange}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select item type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">All</SelectItem>
                                                            <SelectItem value="Weapon">Weapon</SelectItem>
                                                            <SelectItem value="Consumable">Consumable</SelectItem>
                                                            <SelectItem value="Material">Material</SelectItem>
                                                            <SelectItem value="Seed">Seed</SelectItem>
                                                            <SelectItem value="Crop">Crop</SelectItem>
                                                            <SelectItem value="Livestock">Livestock</SelectItem>
                                                            <SelectItem value="AnimalFeed">Animal Feed</SelectItem>
                                                            <SelectItem value="Tool">Tool</SelectItem>
                                                            <SelectItem value="Quest">Quest</SelectItem>
                                                            <SelectItem value="Other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="rarity" className="text-sm font-medium">Rarity</Label>
                                                    <Select
                                                        value={selectedRarity}
                                                        onValueChange={handleRarityChange}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select rarity" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">All</SelectItem>
                                                            <SelectItem value="Common">Common</SelectItem>
                                                            <SelectItem value="Uncommon">Uncommon</SelectItem>
                                                            <SelectItem value="Rare">Rare</SelectItem>
                                                            <SelectItem value="Epic">Epic</SelectItem>
                                                            <SelectItem value="Legendary">Legendary</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="isTradable" className="text-sm font-medium">Tradable</Label>
                                                    <div className="flex items-center space-x-3">
                                                        <Switch
                                                            id="isTradable"
                                                            checked={filters.isTradable === true}
                                                            onCheckedChange={(checked: boolean) => handleFilterChange('isTradable', checked ? true : undefined)}
                                                        />
                                                        <span className="text-sm font-medium">Show only tradable items</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="isBanned" className="text-sm font-medium">Status</Label>
                                                    <div className="flex items-center space-x-3">
                                                        <Switch
                                                            id="isBanned"
                                                            checked={filters.isBanned === true}
                                                            onCheckedChange={(checked: boolean) => handleFilterChange('isBanned', checked ? true : undefined)}
                                                        />
                                                        <span className="text-sm font-medium">Show only banned items</span>
                                                    </div>
                                                </div>
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
                                            onClick={() => setIsBanDialogOpen(true)}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Ban selected items
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setIsUnbanDialogOpen(true)}
                                            className="text-green-600"
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            Unban selected items
                                        </DropdownMenuItem>
                                        <Separator />
                                        <DropdownMenuItem
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete selected items
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {contract && (
                                <div className="flex gap-2">
                                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create New Item
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import CSV
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    {items.length === 0 ? (
                        <div className="text-center py-12">
                            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                {!contract ? 'Wallet Not Connected' : 'No Items Found'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {!contract
                                    ? 'Please connect MetaMask wallet to view and manage items'
                                    : 'No items have been created in the system yet'
                                }
                            </p>
                            {contract && (
                                <Button onClick={() => setIsCreateDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create First Item
                                </Button>
                            )}
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={items}
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
                title="Delete Items"
                description={`Are you sure you want to delete ${selectedRows.length} selected items? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />

            <ConfirmationDialog
                isOpen={isBanDialogOpen}
                onClose={() => setIsBanDialogOpen(false)}
                onConfirm={handleBulkBan}
                title="Ban Items"
                description={`Are you sure you want to ban ${selectedRows.length} selected items?`}
                confirmText="Ban"
                cancelText="Cancel"
                variant="destructive"
            />

            <ConfirmationDialog
                isOpen={isUnbanDialogOpen}
                onClose={() => setIsUnbanDialogOpen(false)}
                onConfirm={handleBulkUnban}
                title="Unban Items"
                description={`Are you sure you want to unban ${selectedRows.length} selected items?`}
                confirmText="Unban"
                cancelText="Cancel"
                variant="default"
            />

            {/* Create Item Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Item</DialogTitle>
                        <DialogDescription>
                            Enter information to create a new item in the system
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="create-itemId" className="text-sm font-medium">Item ID</Label>
                            <Input
                                id="create-itemId"
                                type="number"
                                min="1"
                                value={createFormData.itemId}
                                onChange={(e) => setCreateFormData({ ...createFormData, itemId: e.target.value })}
                                placeholder="Enter item ID"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="create-name" className="text-sm font-medium">Item Name</Label>
                            <Input
                                id="create-name"
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                placeholder="Enter item name"
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="create-itemType" className="text-sm font-medium">Item Type</Label>
                                <Select
                                    value={createFormData.itemType.toString()}
                                    onValueChange={(value) => setCreateFormData({ ...createFormData, itemType: Number(value) })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ItemType).filter(([key]) => isNaN(Number(key))).map(([key, value]) => (
                                            <SelectItem key={value} value={value.toString()}>
                                                {getItemTypeName(value as ItemType)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="create-rarity" className="text-sm font-medium">Rarity</Label>
                                <Select
                                    value={createFormData.rarity.toString()}
                                    onValueChange={(value) => setCreateFormData({ ...createFormData, rarity: Number(value) })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(Rarity).filter(([key]) => isNaN(Number(key))).map(([key, value]) => (
                                            <SelectItem key={value} value={value.toString()}>
                                                {getRarityName(value as Rarity)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="create-maxStacked" className="text-sm font-medium">Max Stacked</Label>
                                <Input
                                    id="create-maxStacked"
                                    type="number"
                                    min="1"
                                    value={createFormData.maxStacked}
                                    onChange={(e) => setCreateFormData({ ...createFormData, maxStacked: e.target.value })}
                                    placeholder="Enter max stacked amount"
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex flex-col justify-end gap-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="create-isStacked"
                                        checked={createFormData.isStacked}
                                        onCheckedChange={(checked) => setCreateFormData({ ...createFormData, isStacked: checked })}
                                    />
                                    <Label htmlFor="create-isStacked" className="text-sm font-medium">Stackable</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="create-isTradable"
                                        checked={createFormData.isTradable}
                                        onCheckedChange={(checked) => setCreateFormData({ ...createFormData, isTradable: checked })}
                                    />
                                    <Label htmlFor="create-isTradable" className="text-sm font-medium">Tradable</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateItem} disabled={!createFormData.itemId || !createFormData.name.trim()}>
                            Create Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Item Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Item</DialogTitle>
                        <DialogDescription>
                            Update information for item {selectedItemForEdit?.name} (ID: {selectedItemForEdit?.id})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-itemId" className="text-sm font-medium">Item ID</Label>
                            <Input
                                id="edit-itemId"
                                type="number"
                                min="1"
                                value={editFormData.itemId}
                                onChange={(e) => setEditFormData({ ...editFormData, itemId: e.target.value })}
                                placeholder="Enter item ID"
                                className="mt-1"
                                disabled
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Item ID cannot be changed
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="edit-name" className="text-sm font-medium">Item Name</Label>
                            <Input
                                id="edit-name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                placeholder="Enter item name"
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-itemType" className="text-sm font-medium">Item Type</Label>
                                <Select
                                    value={editFormData.itemType.toString()}
                                    onValueChange={(value) => setEditFormData({ ...editFormData, itemType: Number(value) })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ItemType).filter(([key]) => isNaN(Number(key))).map(([key, value]) => (
                                            <SelectItem key={value} value={value.toString()}>
                                                {getItemTypeName(value as ItemType)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit-rarity" className="text-sm font-medium">Rarity</Label>
                                <Select
                                    value={editFormData.rarity.toString()}
                                    onValueChange={(value) => setEditFormData({ ...editFormData, rarity: Number(value) })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(Rarity).filter(([key]) => isNaN(Number(key))).map(([key, value]) => (
                                            <SelectItem key={value} value={value.toString()}>
                                                {getRarityName(value as Rarity)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <Label htmlFor="edit-maxStacked" className="text-sm font-medium">Max Stacked</Label>
                                <Input
                                    id="edit-maxStacked"
                                    type="number"
                                    min="1"
                                    value={editFormData.maxStacked}
                                    onChange={(e) => setEditFormData({ ...editFormData, maxStacked: e.target.value })}
                                    placeholder="Enter max stacked amount"
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex flex-col justify-end gap-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="edit-isStacked"
                                        checked={editFormData.isStacked}
                                        onCheckedChange={(checked) => setEditFormData({ ...editFormData, isStacked: checked })}
                                    />
                                    <Label htmlFor="edit-isStacked" className="text-sm font-medium">Stackable</Label>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isTradable"
                                    checked={editFormData.isTradable}
                                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, isTradable: checked })}
                                />
                                <Label htmlFor="edit-isTradable" className="text-sm font-medium">Tradable</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isBanned"
                                    checked={editFormData.isBanned}
                                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, isBanned: checked })}
                                />
                                <Label htmlFor="edit-isBanned" className="text-sm font-medium">Banned</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateItem} disabled={!editFormData.name.trim()}>
                            Update Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Attribute Dialog */}
            <Dialog open={isAddAttributeDialogOpen} onOpenChange={setIsAddAttributeDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Attribute</DialogTitle>
                        <DialogDescription>
                            Add attribute for item {selectedItemForAttribute?.name} (ID: {selectedItemForAttribute?.id})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="attribute-type" className="text-sm font-medium">Attribute Type</Label>
                            <Select
                                value={attributeFormData.attribute.toString()}
                                onValueChange={(value) => setAttributeFormData({ ...attributeFormData, attribute: Number(value) })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(Attribute).filter(([key]) => isNaN(Number(key))).map(([key, value]) => (
                                        <SelectItem key={value} value={value.toString()}>
                                            <div className="flex items-center space-x-2">
                                                {getAttributeIcon(value as Attribute)}
                                                <span>{getAttributeName(value as Attribute)}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="attribute-value" className="text-sm font-medium">Attribute Value</Label>
                            <Input
                                id="attribute-value"
                                type="number"
                                min="1"
                                value={attributeFormData.value}
                                onChange={(e) => setAttributeFormData({ ...attributeFormData, value: e.target.value })}
                                placeholder="Enter attribute value"
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Value must be a positive integer
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddAttributeDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddAttribute}
                            disabled={!attributeFormData.value || parseInt(attributeFormData.value) <= 0}
                        >
                            Add Attribute
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Attribute Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isRemoveAttributeDialogOpen}
                onClose={() => setIsRemoveAttributeDialogOpen(false)}
                onConfirm={handleConfirmRemoveAttribute}
                title="Remove Attribute"
                description={
                    attributeToRemove ?
                        `Are you sure you want to remove attribute "${getAttributeName(attributeToRemove.attribute)}" from item ID ${attributeToRemove.itemId}?` :
                        "Are you sure you want to remove this attribute?"
                }
                confirmText="Remove"
                cancelText="Cancel"
                variant="destructive"
            />

            {/* Manage Drops Dialog */}
            <Dialog open={isManageDropsDialogOpen} onOpenChange={setIsManageDropsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create Drops</DialogTitle>
                        <DialogDescription>
                            Create drops for item {selectedItemForDrops?.name} (ID: {selectedItemForDrops?.id})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Add drops form */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Add Drops</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDropFormData({ itemId: '', probability: '', yieldAmount: '' })}
                                    className="h-6 px-2 text-xs"
                                >
                                    Clear form
                                </Button>
                            </div>

                            {/* Single drop form */}
                            <div className="grid grid-cols-4 gap-3 mb-3">
                                <div>
                                    <Label htmlFor="drop-itemId" className="text-sm font-medium">Item ID</Label>
                                    <Input
                                        id="drop-itemId"
                                        type="number"
                                        min="1"
                                        value={dropFormData.itemId}
                                        onChange={(e) => setDropFormData({ ...dropFormData, itemId: e.target.value })}
                                        placeholder="ID"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="drop-probability" className="text-sm font-medium">Probability (%)</Label>
                                    <Input
                                        id="drop-probability"
                                        type="number"
                                        min="0.01"
                                        max="100"
                                        step="0.01"
                                        value={dropFormData.probability}
                                        onChange={(e) => setDropFormData({ ...dropFormData, probability: e.target.value })}
                                        placeholder="%"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="drop-yield" className="text-sm font-medium">Quantity</Label>
                                    <Input
                                        id="drop-yield"
                                        type="number"
                                        min="1"
                                        value={dropFormData.yieldAmount}
                                        onChange={(e) => setDropFormData({ ...dropFormData, yieldAmount: e.target.value })}
                                        placeholder="Qty"
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        onClick={handleAddDrop}
                                        size="sm"
                                        disabled={!dropFormData.itemId || !dropFormData.probability || !dropFormData.yieldAmount}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>


                        </div>

                        {/* Current drops list */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Current Drops ({dropsFormData.length})</h4>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        {dropsFormData.reduce((sum, drop) => sum + drop.probability, 0) / 100}%
                                    </Badge>
                                    {dropsFormData.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearAllDrops}
                                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                        >
                                            Clear all
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {dropsFormData.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    No drops yet
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-1">
                                    {dropsFormData.map((drop, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="text-xs">#{drop.itemId}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {(drop.probability / 100).toFixed(1)}% × {drop.yieldAmount}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveDrop(index)}
                                                className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Total probability warning */}
                        {dropsFormData.length > 0 && (
                            <div className={`p-2 rounded text-xs ${dropsFormData.reduce((sum, drop) => sum + drop.probability, 0) === 10000
                                ? 'bg-green-50 text-green-700'
                                : 'bg-yellow-50 text-yellow-700'
                                }`}>
                                {dropsFormData.reduce((sum, drop) => sum + drop.probability, 0) === 10000
                                    ? '✅ Total probability: 100%'
                                    : `⚠️ Total probability: ${dropsFormData.reduce((sum, drop) => sum + drop.probability, 0) / 100}% (need 100%)`
                                }
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageDropsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateDrops}
                            disabled={dropsFormData.length === 0 || dropsFormData.reduce((sum, drop) => sum + drop.probability, 0) !== 10000}
                        >
                            Create Drops
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Import Items từ file CSV</DialogTitle>
                        <DialogDescription>
                            Tải lên file CSV để import nhiều item cùng lúc. Tải template mẫu trước để xem định dạng yêu cầu.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        {/* Template Download Section */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Tải Template Mẫu</h4>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTemplate}
                                        className="h-8"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        CSV Template
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadReadme}
                                        className="h-8"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Hướng Dẫn
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Tải template CSV và file hướng dẫn để xem định dạng yêu cầu cho việc import items.
                            </p>
                        </div>

                        {/* File Upload Section */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Tải File CSV</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setImportData('')}
                                    className="h-8"
                                >
                                    Xóa
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 mb-2">
                                        Kéo thả file CSV vào đây, hoặc click để chọn file
                                    </p>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="csv-upload"
                                    />
                                    <label
                                        htmlFor="csv-upload"
                                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        Chọn File
                                    </label>
                                </div>
                                {selectedFile && (
                                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                        <span className="text-sm text-green-700">
                                            Đã chọn: {selectedFile.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview Section */}
                        {importPreview.length > 0 && (
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium">Xem Trước Import ({importPreview.length} items)</h4>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleImportPreview}
                                        className="h-8"
                                    >
                                        Làm Mới
                                    </Button>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    <div className="grid grid-cols-1 gap-2">
                                        {importPreview.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="text-xs">#{item.itemId}</Badge>
                                                    <span className="font-medium">{item.name}</span>
                                                    <Badge variant="outline" className={`text-xs ${getItemTypeColor(item.itemType)}`}>
                                                        {getItemTypeName(item.itemType)}
                                                    </Badge>
                                                    <Badge variant="outline" className={`text-xs ${getRarityColor(item.rarity)}`}>
                                                        {getRarityName(item.rarity)}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        Max: {item.maxStacked}
                                                    </Badge>
                                                    {item.isStacked && <Badge variant="outline" className="text-xs bg-blue-50">Stackable</Badge>}
                                                    {item.isTradable && <Badge variant="outline" className="text-xs bg-green-50">Tradable</Badge>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {Object.keys(item.attributes).length} attrs
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.drops.length} drops
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Import Button */}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsImportDialogOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleImportPreview}
                                disabled={!importData.trim()}
                            >
                                Xem Trước
                            </Button>
                            <Button
                                onClick={handleImportItems}
                                disabled={importPreview.length === 0 || isImporting}
                            >
                                {isImporting ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Đang Import...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Import {importPreview.length} Items
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
