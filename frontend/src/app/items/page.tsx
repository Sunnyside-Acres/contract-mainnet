'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useWallet } from '@/context/WalletContext'
import { ItemManager } from '@/views/item/ItemManager'
import { ItemProvider } from '@/context/ItemContext'
import { PageLayout } from '@/components/PageLayout'

export default function ItemsPage() {
    const [itemLogicContract, setItemLogicContract] = useState<ethers.Contract | null>(null)
    const { signer, selectedNetwork } = useWallet()

    // Load contract addresses dựa trên network được chọn
    const { addresses: contractAddresses } = useContractAddresses(selectedNetwork)

    // Tự động load ItemLogic contract khi có contractAddresses
    const loadItemLogicContract = async () => {
        if (!signer || !contractAddresses?.contracts.ItemLogic) return

        try {
            const response = await fetch('/api/artifacts')
            if (!response.ok) return

            const artifacts = await response.json()
            if (artifacts.ItemLogic?.abi) {
                const contract = new ethers.Contract(
                    contractAddresses.contracts.ItemLogic,
                    artifacts.ItemLogic.abi,
                    signer
                )
                setItemLogicContract(contract)
            }
        } catch (error) {
            console.error('Lỗi tải ItemLogic contract:', error)
        }
    }

    // Load ItemLogic contract khi signer hoặc contractAddresses thay đổi
    useEffect(() => {
        loadItemLogicContract()
    }, [signer, contractAddresses])

    return (
        <PageLayout
            title="Quản lý Item"
            networkInfo={contractAddresses ? {
                network: contractAddresses.network,
                chainId: contractAddresses.chainId
            } : undefined}
        >
            <ItemProvider contract={itemLogicContract}>
                <ItemManager contract={itemLogicContract} signer={signer} />
            </ItemProvider>
        </PageLayout>
    )
}
