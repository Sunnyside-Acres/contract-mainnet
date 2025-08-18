"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Player } from "@/types/player.type"
import { useInventoryContext } from "@/context/InventoryContext"

interface AddItemDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    player: Player | null
    onSuccess?: () => void
}

export function AddItemDialog({ isOpen, onOpenChange, player, onSuccess }: AddItemDialogProps) {
    const [isLoading, setIsLoading] = React.useState(false)
    const { contract } = useInventoryContext()
    const [formData, setFormData] = React.useState({
        itemId: "",
        quantity: "1"
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!player || !contract) return

        setIsLoading(true)
        try {
            const itemId = parseInt(formData.itemId)
            const quantity = parseInt(formData.quantity)

            if (isNaN(itemId) || isNaN(quantity)) {
                alert("Please enter valid numbers")
                return
            }

            if (quantity <= 0) {
                alert("Quantity must be greater than 0")
                return
            }

            console.log(`Adding ${quantity} of item #${itemId} to player ${player.playerAddress}`)
            const tx = await contract.addItem(player.playerAddress, itemId, quantity)
            await tx.wait()
            console.log("Item added successfully")

            // Reset form
            setFormData({
                itemId: "",
                quantity: "1"
            })
            onOpenChange(false)
            onSuccess?.()

        } catch (error) {
            console.error("Error adding item:", error)
            alert("Error adding item: " + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Item to Player</DialogTitle>
                    <DialogDescription>
                        {player ? `Add item to player ${player.name} (${player.playerAddress})` : 'Loading...'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="itemId">Item ID</Label>
                        <Input
                            id="itemId"
                            type="number"
                            placeholder="Enter item ID"
                            value={formData.itemId}
                            onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                            required
                            min="1"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                            id="quantity"
                            type="number"
                            placeholder="Enter quantity"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                            min="1"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.itemId || !formData.quantity}
                        >
                            {isLoading ? "Adding..." : "Add Item"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
