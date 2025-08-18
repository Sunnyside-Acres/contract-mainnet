"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { Plot, PlotFilters, PlotPagination } from '@/types/plot.type'

interface PlotContextType {
    plots: Plot[]
    pagination: PlotPagination
    setPagination: (pagination: PlotPagination) => void
    filters: PlotFilters
    setFilters: (filters: PlotFilters) => void
    refreshPlots: () => Promise<void>
    isLoading: boolean
    error: string | null
    contract: ethers.Contract | null | undefined
}

const PlotContext = createContext<PlotContextType | undefined>(undefined)

interface PlotProviderProps {
    children: React.ReactNode
    contract?: ethers.Contract | null
    signer?: ethers.Signer | null
    targetUserAddress?: string // User address để xem plots
}

export function PlotProvider({ children, contract, signer, targetUserAddress }: PlotProviderProps) {
    const [plots, setPlots] = useState<Plot[]>([])
    const [pagination, setPagination] = useState<PlotPagination>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 10
    })
    const [filters, setFilters] = useState<PlotFilters>({
        page: 1,
        limit: 10
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refreshPlots = useCallback(async () => {
        if (!contract || !signer) {
            setError("Vui lòng kết nối ví MetaMask để xem danh sách ô đất")
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            // Tạo contract instance với signer
            const contractWithSigner = contract.connect(signer)
            const userAddress = targetUserAddress || await signer.getAddress()

            // Gọi contract để lấy plots của user
            const plotsData = await contract.getPlots(userAddress)
            console.log('Raw plots data:', plotsData)

            // Chuyển đổi dữ liệu từ contract
            const formattedPlots: Plot[] = plotsData.map((plot: any) => ({
                id: plot.id.toString(),
                owner: plot.owner,
                plotType: plot.plotType.toNumber(),
                fertility: plot.fertility.toNumber(),
                isActive: plot.isActive,
                xCoordinate: plot.xCoordinate.toNumber(),
                yCoordinate: plot.yCoordinate.toNumber(),
                creationTime: plot.creationTime.toNumber(),
                isLocked: plot.isLocked
            }))

            // Áp dụng filters
            let filteredPlots = formattedPlots

            if (filters.search) {
                const searchTerm = filters.search.toLowerCase()
                filteredPlots = filteredPlots.filter(plot =>
                    plot.id.toLowerCase().includes(searchTerm) ||
                    plot.owner.toLowerCase().includes(searchTerm) ||
                    plot.xCoordinate.toString().includes(searchTerm) ||
                    plot.yCoordinate.toString().includes(searchTerm)
                )
            }

            if (filters.plotType !== undefined) {
                filteredPlots = filteredPlots.filter(plot => plot.plotType === filters.plotType)
            }

            if (filters.minFertility !== undefined) {
                filteredPlots = filteredPlots.filter(plot => plot.fertility >= filters.minFertility!)
            }

            if (filters.maxFertility !== undefined) {
                filteredPlots = filteredPlots.filter(plot => plot.fertility <= filters.maxFertility!)
            }

            if (filters.isActive !== undefined) {
                filteredPlots = filteredPlots.filter(plot => plot.isActive === filters.isActive)
            }

            if (filters.isLocked !== undefined) {
                filteredPlots = filteredPlots.filter(plot => plot.isLocked === filters.isLocked)
            }

            if (filters.owner) {
                filteredPlots = filteredPlots.filter(plot =>
                    plot.owner.toLowerCase().includes(filters.owner!.toLowerCase())
                )
            }

            // Pagination
            const totalItems = filteredPlots.length
            const totalPages = Math.ceil(totalItems / filters.limit)
            const startIndex = (filters.page - 1) * filters.limit
            const endIndex = startIndex + filters.limit
            const paginatedPlots = filteredPlots.slice(startIndex, endIndex)

            setPlots(paginatedPlots)
            setPagination({
                currentPage: filters.page,
                totalPages,
                totalItems,
                limit: filters.limit
            })

        } catch (err: any) {
            console.error('Error fetching plots:', err)
            setError(`Lỗi khi tải dữ liệu ô đất: ${err.message}`)
        } finally {
            setIsLoading(false)
        }
    }, [contract, filters, targetUserAddress])

    // Auto refresh khi contract hoặc filters thay đổi
    useEffect(() => {
        refreshPlots()
    }, [refreshPlots])

    const value: PlotContextType = {
        plots,
        pagination,
        setPagination,
        filters,
        setFilters,
        refreshPlots,
        isLoading,
        error,
        contract
    }

    return (
        <PlotContext.Provider value={value}>
            {children}
        </PlotContext.Provider>
    )
}

export function usePlotContext() {
    const context = useContext(PlotContext)
    if (context === undefined) {
        throw new Error('usePlotContext must be used within a PlotProvider')
    }
    return context
}
