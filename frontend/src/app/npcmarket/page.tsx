'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useWallet } from '@/context/WalletContext'
import { NPCMarketManager } from '@/views/npcmarket/NPCMarketManager'
import { NPCMarketProvider } from '@/context/NPCMarketContext'
import { PageLayout } from '@/components/PageLayout'

export default function NPCMarketPage() {
    const [npcMarketLogicContract, setNPCMarketLogicContract] = useState<ethers.Contract | null>(null)
    const { signer, selectedNetwork } = useWallet()

    // Load contract addresses dựa trên network được chọn
    const { addresses: contractAddresses } = useContractAddresses(selectedNetwork)

    // Tự động load contracts khi có contractAddresses
    const loadContracts = async () => {
        console.log('Loading NPCMarketLogic contract...')
        console.log('Signer:', signer)
        console.log('Contract addresses:', contractAddresses)

        if (!signer || !contractAddresses?.contracts.NPCMarketLogic) {
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

            if (artifacts.NPCMarketLogic?.abi) {
                console.log('Creating contracts...')

                const npcMarketContract = new ethers.Contract(
                    contractAddresses.contracts.NPCMarketLogic,
                    artifacts.NPCMarketLogic.abi,
                    signer
                )
                setNPCMarketLogicContract(npcMarketContract)
                console.log('NPCMarketLogic contract created successfully')
            } else {
                console.error('Contract ABIs not found in artifacts')
            }
        } catch (error) {
            console.error('Lỗi tải NPCMarketLogic contract:', error)
        }
    }

    // Load contracts khi signer hoặc contractAddresses thay đổi
    useEffect(() => {
        if (signer && contractAddresses) {
            loadContracts()
        }
    }, [signer, contractAddresses])

    return (
        <PageLayout
            title="Quản lý NPC Market"
            networkInfo={contractAddresses ? {
                network: contractAddresses.network,
                chainId: contractAddresses.chainId
            } : undefined}
        >
            <NPCMarketProvider contract={npcMarketLogicContract}>
                <NPCMarketManager signer={signer} />
            </NPCMarketProvider>
        </PageLayout>
    )
}
