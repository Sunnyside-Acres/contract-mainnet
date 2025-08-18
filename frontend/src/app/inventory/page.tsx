'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function InventoryPage() {
    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Inventory Management</h1>
                <p className="text-muted-foreground">
                    Quản lý inventory trong game Sunnyside Acres
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Coming Soon</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Inventory Management sẽ được phát triển trong tương lai.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
