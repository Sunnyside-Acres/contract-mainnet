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
        console.log('Loading ItemLogic contract...')
        console.log('Signer:', signer)
        console.log('Contract addresses:', contractAddresses)

        if (!signer || !contractAddresses?.contracts.ItemLogic) {
            console.log('Missing signer or contract addresses')
            console.log('Signer exists:', !!signer)
            console.log('ItemLogic address exists:', !!contractAddresses?.contracts.ItemLogic)
            return
        }

        try {
            console.log('Fetching artifacts...')
            const response = await fetch('/api/artifacts')
            if (!response.ok) {
                console.error('Failed to fetch artifacts')
                console.error('Response status:', response.status)
                console.error('Response text:', await response.text())
                return
            }

            const artifacts = await response.json()
            console.log('Artifacts loaded successfully')
            console.log('Available artifacts:', Object.keys(artifacts))
            console.log('ItemLogic artifact exists:', !!artifacts.ItemLogic)

            if (artifacts.ItemLogic?.abi) {
                console.log('Creating ItemLogic contract...')
                console.log('ItemLogic ABI length:', artifacts.ItemLogic.abi.length)

                const contract = new ethers.Contract(
                    contractAddresses.contracts.ItemLogic,
                    artifacts.ItemLogic.abi,
                    signer
                )
                setItemLogicContract(contract)
                console.log('ItemLogic contract created successfully')
                console.log('ItemLogic contract address:', contract.address)
                console.log('ItemLogic contract methods:', Object.keys(contract.interface.functions))
            } else {
                console.error('ItemLogic ABI not found in artifacts')
            }
        } catch (error) {
            console.error('Lỗi tải ItemLogic contract:', error)
        }
    }

    // Load ItemLogic contract khi signer hoặc contractAddresses thay đổi
    useEffect(() => {
        if (signer && contractAddresses) {
            loadItemLogicContract()
        }
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
