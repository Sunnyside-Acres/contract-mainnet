"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Package } from "lucide-react"
import { Player } from "@/types/player.type"
import { useInventoryContext } from "@/context/InventoryContext"

interface PlayerInventoryDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    player: Player | null
}

interface InventoryItem {
    id: number
    name: string
    quantity: number
    durability: number
    expiration: number
}

export function PlayerInventoryDialog({ isOpen, onOpenChange, player }: PlayerInventoryDialogProps) {
    const [inventory, setInventory] = React.useState<InventoryItem[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const { contract } = useInventoryContext()

    React.useEffect(() => {
        const loadInventory = async () => {
            if (!player || !contract) return

            setIsLoading(true)
            try {
                // Gọi contract để lấy inventory
                const inventoryData = await contract.getInventory(player.playerAddress)
                console.log('Raw inventory data:', inventoryData)
                // Chuyển đổi dữ liệu từ contract sang dạng hiển thị
                const formattedInventory = inventoryData.map((item: any) => ({
                    id: Number(item.itemId),
                    quantity: Number(item.quantity),
                    durability: Number(item.durability),
                    expiration: Number(item.expiration),
                    name: `Item #${item.itemId}`
                }))
                setInventory(formattedInventory)
            } catch (error) {
                console.error('Error loading inventory:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (isOpen) {
            loadInventory()
        }
    }, [isOpen, player, contract])

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Inventory</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[400px] w-full rounded-md">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="h-6 bg-muted rounded w-32 mx-auto animate-pulse"></div>
                        </div>
                    ) : inventory.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">Empty</h3>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">ID</TableHead>
                                    <TableHead className="w-[50px]">Icon</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center w-[100px]">Quantity</TableHead>
                                    <TableHead className="text-center w-[100px]">Durability</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inventory.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-accent transition-colors">
                                        <TableCell className="font-medium">{item.id}</TableCell>
                                        <TableCell>
                                            <img
                                                src={`/items/${item.id}.png`}
                                                alt={item.name}
                                                className="w-8 h-8"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/items/default.png'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-green-600 font-medium">{item.quantity}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-medium ${item.durability > 70 ? 'text-green-600' :
                                                item.durability > 40 ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>{item.durability}%</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
