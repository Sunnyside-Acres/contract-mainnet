"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { Player, PlayerFilters, PlayerPagination } from '@/types/player.type'
import { usePlayerError } from '@/hooks/usePlayerError'

interface PlayerContextType {
    players: Player[]
    pagination: PlayerPagination
    setPagination: (pagination: PlayerPagination) => void
    filters: PlayerFilters
    setFilters: (filters: PlayerFilters) => void
    refreshPlayers: () => Promise<void>
    isLoading: boolean
    error: string | null
    contract: ethers.Contract | null
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

interface PlayerProviderProps {
    children: React.ReactNode
    contract?: ethers.Contract | null
}

export function PlayerProvider({ children, contract }: PlayerProviderProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [pagination, setPagination] = useState<PlayerPagination>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 10
    })
    const [filters, setFilters] = useState<PlayerFilters>({
        page: 1,
        limit: 10
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load players from contract
    const loadPlayersFromContract = async () => {
        if (!contract) {
            console.log('Contract not available, wallet not connected')
            // Không hiển thị mock data khi chưa connect ví
            setPlayers([])
            setPagination({
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                limit: filters.limit
            })
            setError('Vui lòng kết nối ví để xem dữ liệu')
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            console.log('PlayerContext: Starting loadPlayersFromContract...')
            console.log('PlayerContext: Contract provided:', contract)
            console.log('PlayerContext: Contract address:', contract.address)
            console.log('PlayerContext: Contract provider:', contract.provider)
            console.log('PlayerContext: Contract signer:', contract.signer)

            // Kiểm tra xem contract có phương thức getPlayerList không
            console.log('PlayerContext: Available methods:', Object.keys(contract.interface.functions))
            
            // Kiểm tra xem có thể gọi phương thức đơn giản trước không
            try {
                console.log('PlayerContext: Testing world() call...')
                const worldAddress = await contract.world()
                console.log('PlayerContext: World address:', worldAddress)
            } catch (worldError) {
                console.error('PlayerContext: Error calling world():', worldError)
            }

            // Get all player addresses from contract
            console.log('PlayerContext: Calling getPlayerList()...')
            const playerAddresses = await contract.getPlayerList()
            console.log('PlayerContext: Player addresses:', playerAddresses)

            if (!playerAddresses || playerAddresses.length === 0) {
                setPlayers([])
                setPagination({
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 0,
                    limit: filters.limit
                })
                return
            }

            // Load player data for each address
            const playersData: Player[] = []

            for (const address of playerAddresses) {
                try {
                    console.log('PlayerContext: Getting data for address:', address)
                    const playerData = await contract.getPlayerData(address)
                    console.log('PlayerContext: Player data for', address, ':', playerData)

                    const player: Player = {
                        playerAddress: address,
                        name: playerData.name,
                        level: Number(playerData.level),
                        xp: Number(playerData.xp),
                        mana: Number(playerData.mana),
                        maxMana: Number(playerData.maxMana),
                        sunlight: Number(playerData.sunlight),
                        sunny: Number(playerData.sunny),
                        lastLogin: Number(playerData.lastLogin)
                    }

                    playersData.push(player)
                } catch (playerError) {
                    console.error(`Error loading player data for ${address}:`, playerError)
                }
            }

            console.log('PlayerContext: All players data loaded:', playersData)

            // Apply filters
            let filteredPlayers = [...playersData]

            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                filteredPlayers = filteredPlayers.filter(player =>
                    player.name.toLowerCase().includes(searchLower) ||
                    player.playerAddress.toLowerCase().includes(searchLower)
                )
            }

            if (filters.minLevel !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.level >= filters.minLevel!)
            }

            if (filters.maxLevel !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.level <= filters.maxLevel!)
            }

            if (filters.minXp !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.xp >= filters.minXp!)
            }

            if (filters.maxXp !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.xp <= filters.maxXp!)
            }

            if (filters.minSunlight !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.sunlight >= filters.minSunlight!)
            }

            if (filters.maxSunlight !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.sunlight <= filters.maxSunlight!)
            }

            if (filters.minSunny !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.sunny >= filters.minSunny!)
            }

            if (filters.maxSunny !== undefined) {
                filteredPlayers = filteredPlayers.filter(player => player.sunny <= filters.maxSunny!)
            }

            // Apply pagination
            const totalItems = filteredPlayers.length
            const totalPages = Math.ceil(totalItems / filters.limit)
            const startIndex = (filters.page - 1) * filters.limit
            const endIndex = startIndex + filters.limit
            const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)

            setPlayers(paginatedPlayers)
            setPagination({
                currentPage: filters.page,
                totalPages,
                totalItems,
                limit: filters.limit
            })

        } catch (error: any) {
            console.error('Error loading players from contract:', error)
            console.error('Error details:', {
                message: error?.message,
                code: error?.code,
                data: error?.data,
                errorArgs: error?.errorArgs,
                errorName: error?.errorName,
                errorSignature: error?.errorSignature,
                reason: error?.reason
            })
            setError('Lỗi tải dữ liệu từ contract')
        } finally {
            setIsLoading(false)
        }
    }

    // Refresh players function
    const refreshPlayers = async () => {
        await loadPlayersFromContract()
    }

    // Load players when contract changes
    useEffect(() => {
        if (contract) {
            loadPlayersFromContract()
        }
    }, [contract, filters])

    const value: PlayerContextType = {
        players,
        pagination,
        setPagination,
        filters,
        setFilters,
        refreshPlayers,
        isLoading,
        error,
        contract: contract || null
    }

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    )
}

export function usePlayerContext() {
    const context = useContext(PlayerContext)
    if (context === undefined) {
        throw new Error('usePlayerContext must be used within a PlayerProvider')
    }
    return context
}
