'use client'

import { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

interface PageLayoutProps {
    children: ReactNode
    className?: string
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

export function PageLayout({
    children,
    className = "",
    ...headerProps
}: PageLayoutProps) {
    return (
        <div className={`min-h-screen bg-background w-full ${className}`}>
            <PageHeader {...headerProps} />
            <div className="w-full mx-auto px-4 py-4">
                {children}
            </div>
        </div>
    )
}
