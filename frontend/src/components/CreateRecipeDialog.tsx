"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, X } from "lucide-react"
import { CraftingIngredient } from "@/types/crafting.type"

interface CreateRecipeDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (formData: {
        resultItemId: number
        resultQuantity: number
        successRate: number
        sunlightCost: number
        sunnyCost: number
        ingredients: CraftingIngredient[]
        minPlayerLevel: number
    }) => Promise<void>
    isLoading?: boolean
}

export function CreateRecipeDialog({ isOpen, onOpenChange, onSubmit, isLoading = false }: CreateRecipeDialogProps) {
    const [formData, setFormData] = React.useState({
        resultItemId: 1,
        resultQuantity: 1,
        successRate: 100, // 100% = 10000 in contract
        sunlightCost: 0,
        sunnyCost: 0,
        minPlayerLevel: 1
    })

    const [ingredients, setIngredients] = React.useState<CraftingIngredient[]>([
        { itemId: 1, quantity: 1 }
    ])

    const handleSubmit = async () => {
        if (!formData.resultItemId || formData.resultItemId <= 0) {
            alert('Result Item ID must be greater than 0')
            return
        }

        if (!formData.resultQuantity || formData.resultQuantity <= 0) {
            alert('Result Quantity must be greater than 0')
            return
        }

        if (formData.successRate < 0 || formData.successRate > 10000) {
            alert('Success Rate must be between 0 and 10000 (0-100%)')
            return
        }

        if (formData.minPlayerLevel <= 0) {
            alert('Minimum Player Level must be greater than 0')
            return
        }

        if (ingredients.length === 0) {
            alert('At least one ingredient is required')
            return
        }

        // Validate ingredients
        for (const ingredient of ingredients) {
            if (!ingredient.itemId || ingredient.itemId <= 0) {
                alert('All ingredient Item IDs must be greater than 0')
                return
            }
            if (!ingredient.quantity || ingredient.quantity <= 0) {
                alert('All ingredient quantities must be greater than 0')
                return
            }
        }

        try {
            await onSubmit({
                ...formData,
                ingredients
            })

            // Reset form
            setFormData({
                resultItemId: 1,
                resultQuantity: 1,
                successRate: 100,
                sunlightCost: 0,
                sunnyCost: 0,
                minPlayerLevel: 1
            })
            setIngredients([{ itemId: 1, quantity: 1 }])
            onOpenChange(false)
        } catch (error) {
            console.error('Error creating recipe:', error)
        }
    }

    const addIngredient = () => {
        setIngredients([...ingredients, { itemId: 1, quantity: 1 }])
    }

    const removeIngredient = (index: number) => {
        if (ingredients.length > 1) {
            setIngredients(ingredients.filter((_, i) => i !== index))
        }
    }

    const updateIngredient = (index: number, field: keyof CraftingIngredient, value: number) => {
        const newIngredients = [...ingredients]
        newIngredients[index] = { ...newIngredients[index], [field]: value }
        setIngredients(newIngredients)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tạo Công Thức Mới</DialogTitle>
                    <DialogDescription>
                        Nhập thông tin để tạo công thức crafting mới trong hệ thống
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* Basic Recipe Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="resultItemId" className="text-sm font-medium">ID Item Kết Quả</Label>
                            <Input
                                id="resultItemId"
                                type="number"
                                min="1"
                                value={formData.resultItemId}
                                onChange={(e) => setFormData({ ...formData, resultItemId: parseInt(e.target.value) || 1 })}
                                placeholder="ID của item kết quả"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="resultQuantity" className="text-sm font-medium">Số Lượng Kết Quả</Label>
                            <Input
                                id="resultQuantity"
                                type="number"
                                min="1"
                                value={formData.resultQuantity}
                                onChange={(e) => setFormData({ ...formData, resultQuantity: parseInt(e.target.value) || 1 })}
                                placeholder="Số lượng item nhận được"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="successRate" className="text-sm font-medium">Tỷ Lệ Thành Công (%)</Label>
                            <Input
                                id="successRate"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={(formData.successRate / 100).toFixed(1)}
                                onChange={(e) => setFormData({ ...formData, successRate: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                                placeholder="0-100%"
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Ví dụ: 85.5 = 85.5% thành công
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="minPlayerLevel" className="text-sm font-medium">Cấp Độ Tối Thiểu</Label>
                            <Input
                                id="minPlayerLevel"
                                type="number"
                                min="1"
                                value={formData.minPlayerLevel}
                                onChange={(e) => setFormData({ ...formData, minPlayerLevel: parseInt(e.target.value) || 1 })}
                                placeholder="Cấp độ player tối thiểu"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="sunlightCost" className="text-sm font-medium">Chi Phí Sunlight</Label>
                            <Input
                                id="sunlightCost"
                                type="number"
                                min="0"
                                value={formData.sunlightCost}
                                onChange={(e) => setFormData({ ...formData, sunlightCost: parseInt(e.target.value) || 0 })}
                                placeholder="Chi phí sunlight"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="sunnyCost" className="text-sm font-medium">Chi Phí Sunny</Label>
                            <Input
                                id="sunnyCost"
                                type="number"
                                min="0"
                                value={formData.sunnyCost}
                                onChange={(e) => setFormData({ ...formData, sunnyCost: parseInt(e.target.value) || 0 })}
                                placeholder="Chi phí sunny"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Nguyên Liệu</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addIngredient}
                                disabled={ingredients.length >= 10}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Thêm Nguyên Liệu
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {ingredients.map((ingredient, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground">Item ID</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={ingredient.itemId}
                                            onChange={(e) => updateIngredient(index, 'itemId', parseInt(e.target.value) || 1)}
                                            placeholder="ID item"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground">Số Lượng</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={ingredient.quantity}
                                            onChange={(e) => updateIngredient(index, 'quantity', parseInt(e.target.value) || 1)}
                                            placeholder="Số lượng"
                                            className="mt-1"
                                        />
                                    </div>
                                    {ingredients.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeIngredient(index)}
                                            className="mt-6"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Đang tạo...' : 'Tạo Công Thức'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
