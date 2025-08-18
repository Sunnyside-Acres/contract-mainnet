'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useWallet } from '@/context/WalletContext'
import { PlotManager } from '@/views/plot/PlotManager'
import { PlotProvider } from '@/context/PlotContext'
import { PageLayout } from '@/components/PageLayout'

export default function PlotsPage() {
    const [plotLogicContract, setPlotLogicContract] = useState<ethers.Contract | null>(null)
    const [playerLogicContract, setPlayerLogicContract] = useState<ethers.Contract | null>(null)
    const [plantLogicContract, setPlantLogicContract] = useState<ethers.Contract | null>(null)
    const [selectedUserAddress, setSelectedUserAddress] = useState<string>("")
    const { signer, selectedNetwork } = useWallet()

    // Load contract addresses dựa trên network được chọn
    const { addresses: contractAddresses } = useContractAddresses(selectedNetwork)

    // Tự động load contracts khi có contractAddresses
    const loadContracts = async () => {
        console.log('Loading PlotLogic contract...')
        console.log('Signer:', signer)
        console.log('Contract addresses:', contractAddresses)

        if (!signer || !contractAddresses?.contracts.PlotLogic || !contractAddresses?.contracts.PlayerLogic || !contractAddresses?.contracts.PlantLogic) {
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

            if (artifacts.PlotLogic?.abi && artifacts.PlayerLogic?.abi && artifacts.PlantLogic?.abi) {
                console.log('Creating contracts...')

                const plotContract = new ethers.Contract(
                    contractAddresses.contracts.PlotLogic,
                    artifacts.PlotLogic.abi,
                    signer
                )
                setPlotLogicContract(plotContract)
                console.log('PlotLogic contract created successfully')

                const playerContract = new ethers.Contract(
                    contractAddresses.contracts.PlayerLogic,
                    artifacts.PlayerLogic.abi,
                    signer
                )
                setPlayerLogicContract(playerContract)
                console.log('PlayerLogic contract created successfully')

                const plantContract = new ethers.Contract(
                    contractAddresses.contracts.PlantLogic,
                    artifacts.PlantLogic.abi,
                    signer
                )
                setPlantLogicContract(plantContract)
                console.log('PlantLogic contract created successfully')
            } else {
                console.error('Contract ABIs not found in artifacts')
            }
        } catch (error) {
            console.error('Lỗi tải PlotLogic contract:', error)
        }
    }

    // Load contracts khi signer hoặc contractAddresses thay đổi
    useEffect(() => {
        loadContracts()
    }, [signer, contractAddresses])

    return (
        <PageLayout
            title="Nông dân - Quản lý đồng ruộng"
            networkInfo={contractAddresses ? {
                network: contractAddresses.network,
                chainId: contractAddresses.chainId
            } : undefined}
        >
            <PlotProvider
                contract={plotLogicContract}
                signer={signer}
                targetUserAddress={selectedUserAddress}
            >
                <PlotManager
                    signer={signer}
                    onUserChange={setSelectedUserAddress}
                    playerContract={playerLogicContract}
                    plantContract={plantLogicContract}
                />
            </PlotProvider>
        </PageLayout>
    )
}
