'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useWallet } from '@/context/WalletContext'
import { FleaMarketManager } from '@/views/fleamarket/FleaMarketManager'
import { FleaMarketProvider } from '@/context/FleaMarketContext'
import { PageLayout } from '@/components/PageLayout'

export default function FleaMarketPage() {
    const [fleaMarketLogicContract, setFleaMarketLogicContract] = useState<ethers.Contract | null>(null)
    const { signer, selectedNetwork } = useWallet()

    // Load contract addresses dựa trên network được chọn
    const { addresses: contractAddresses } = useContractAddresses(selectedNetwork)

    // Tự động load FleaMarketLogic contract khi có contractAddresses
    const loadFleaMarketLogicContract = async () => {
        if (!signer || !contractAddresses?.contracts.FleaMarketLogic) return

        try {
            const response = await fetch('/api/artifacts')
            if (!response.ok) return

            const artifacts = await response.json()
            if (artifacts.FleaMarketLogic?.abi) {
                const contract = new ethers.Contract(
                    contractAddresses.contracts.FleaMarketLogic,
                    artifacts.FleaMarketLogic.abi,
                    signer
                )
                setFleaMarketLogicContract(contract)
            }
        } catch (error) {
            console.error('Lỗi tải FleaMarketLogic contract:', error)
        }
    }

    // Load FleaMarketLogic contract khi signer hoặc contractAddresses thay đổi
    useEffect(() => {
        loadFleaMarketLogicContract()
    }, [signer, contractAddresses])

    return (
        <PageLayout
            title="Flea Market"
            networkInfo={contractAddresses ? {
                network: contractAddresses.network,
                chainId: contractAddresses.chainId
            } : undefined}
        >
            <FleaMarketProvider contract={fleaMarketLogicContract}>
                <FleaMarketManager contract={fleaMarketLogicContract} signer={signer} />
            </FleaMarketProvider>
        </PageLayout>
    )
}
