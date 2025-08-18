'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PageHeaderProps {
    title: string
    subtitle?: string
    showBackButton?: boolean
    backUrl?: string
    networkInfo?: {
        network: string
        chainId: number
    }
    actions?: React.ReactNode
}

export function PageHeader({
    title,
    subtitle,
    showBackButton = false,
    backUrl = '/',
    networkInfo,
    actions
}: PageHeaderProps) {
    const router = useRouter()

    const handleBack = () => {
        if (backUrl) {
            router.push(backUrl)
        } else {
            router.back()
        }
    }

    return (
        <div className="border-b bg-card/50">
            <div className="w-full px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {showBackButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBack}
                                className="h-8 px-2"
                            >
                                <ArrowLeft className="h-3 w-3 mr-1" />
                                Quay lại
                            </Button>
                        )}
                        <div className="flex items-center space-x-3">
                            <h1 className="text-lg font-semibold">{title}</h1>
                            {networkInfo && (
                                <div className="flex items-center space-x-2 text-xs">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                    <span className="text-muted-foreground">{networkInfo.network}</span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground">ID: {networkInfo.chainId}</span>
                                </div>
                            )}
                        </div>
                        {subtitle && (
                            <span className="text-xs text-muted-foreground">•</span>
                        )}
                        {subtitle && (
                            <span className="text-xs text-muted-foreground">{subtitle}</span>
                        )}
                    </div>
                    {actions && (
                        <div className="flex items-center space-x-2">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
