'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useWallet } from '@/context/WalletContext'
import { PlayerManager } from '@/views/player/PlayerManager'
import { PlayerProvider } from '@/context/PlayerContext'
import { InventoryProvider } from '@/context/InventoryContext'
import { PageLayout } from '@/components/PageLayout'

export default function PlayersPage() {
    const [playerLogicContract, setPlayerLogicContract] = useState<ethers.Contract | null>(null)
    const [inventoryLogicContract, setInventoryLogicContract] = useState<ethers.Contract | null>(null)
    const { signer, selectedNetwork } = useWallet()

    // Load contract addresses dựa trên network được chọn
    const { addresses: contractAddresses } = useContractAddresses(selectedNetwork)

    // Tự động load contracts khi có contractAddresses
    const loadContracts = async () => {
        console.log('Loading PlayerLogic contract...')
        console.log('Signer:', signer)
        console.log('Contract addresses:', contractAddresses)

        if (!signer || !contractAddresses?.contracts.PlayerLogic || !contractAddresses?.contracts.InventoryLogic) {
            console.log('Missing signer or contract addresses')
            return
        }

        try {
            console.log('Fetching artifacts...')
            const response = await fetch('/api/artifacts')
            if (!response.ok) {
                console.error('Failed to fetch artifacts')
                return
            }

            const artifacts = await response.json()
            console.log('Artifacts:', artifacts)

            if (artifacts.PlayerLogic?.abi && artifacts.InventoryLogic?.abi) {
                console.log('Creating contracts...')

                const playerContract = new ethers.Contract(
                    contractAddresses.contracts.PlayerLogic,
                    artifacts.PlayerLogic.abi,
                    signer
                )
                setPlayerLogicContract(playerContract)
                console.log('PlayerLogic contract created successfully')

                const inventoryContract = new ethers.Contract(
                    contractAddresses.contracts.InventoryLogic,
                    artifacts.InventoryLogic.abi,
                    signer
                )
                setInventoryLogicContract(inventoryContract)
                console.log('InventoryLogic contract created successfully')
            } else {
                console.error('Contract ABIs not found in artifacts')
            }
        } catch (error) {
            console.error('Lỗi tải PlayerLogic contract:', error)
        }
    }

    // Load contracts khi signer hoặc contractAddresses thay đổi
    useEffect(() => {
        loadContracts()
    }, [signer, contractAddresses])

    return (
        <PageLayout
            title="Quản lý Player"
            networkInfo={contractAddresses ? {
                network: contractAddresses.network,
                chainId: contractAddresses.chainId
            } : undefined}
        >
            <PlayerProvider contract={playerLogicContract}>
                <InventoryProvider contract={inventoryLogicContract}>
                    <PlayerManager signer={signer} />
                </InventoryProvider>
            </PlayerProvider>
        </PageLayout>
    )
}
