'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useWallet } from '@/context/WalletContext'
import { CraftingManager } from '@/views/crafting/CraftingManager'
import { CraftingProvider } from '@/context/CraftingContext'
import { PageLayout } from '@/components/PageLayout'

export default function CraftingPage() {
    const [craftingLogicContract, setCraftingLogicContract] = useState<ethers.Contract | null>(null)
    const { signer, selectedNetwork } = useWallet()

    // Load contract addresses dựa trên network được chọn
    const { addresses: contractAddresses } = useContractAddresses(selectedNetwork)

    // Tự động load CraftingLogic contract khi có contractAddresses
    const loadCraftingLogicContract = async () => {
        console.log('Loading CraftingLogic contract...')
        console.log('Signer:', signer)
        console.log('Contract addresses:', contractAddresses)

        if (!signer || !contractAddresses?.contracts.CraftingLogic) {
            console.log('Missing signer or contract addresses')
            console.log('Signer exists:', !!signer)
            console.log('CraftingLogic address exists:', !!contractAddresses?.contracts.CraftingLogic)
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
            console.log('CraftingLogic artifact exists:', !!artifacts.CraftingLogic)

            if (artifacts.CraftingLogic?.abi) {
                console.log('Creating CraftingLogic contract...')
                console.log('CraftingLogic ABI length:', artifacts.CraftingLogic.abi.length)

                const contract = new ethers.Contract(
                    contractAddresses.contracts.CraftingLogic,
                    artifacts.CraftingLogic.abi,
                    signer
                )
                setCraftingLogicContract(contract)
                console.log('CraftingLogic contract created successfully')
                console.log('CraftingLogic contract address:', contract.address)
                console.log('CraftingLogic contract methods:', Object.keys(contract.interface.functions))
            } else {
                console.error('CraftingLogic ABI not found in artifacts')
            }
        } catch (error) {
            console.error('Lỗi tải CraftingLogic contract:', error)
        }
    }

    // Load CraftingLogic contract khi signer hoặc contractAddresses thay đổi
    useEffect(() => {
        if (signer && contractAddresses) {
            loadCraftingLogicContract()
        }
    }, [signer, contractAddresses])

    return (
        <PageLayout
            title="Quản lý Crafting"
            networkInfo={contractAddresses ? {
                network: contractAddresses.network,
                chainId: contractAddresses.chainId
            } : undefined}
        >
            <CraftingProvider contract={craftingLogicContract}>
                <CraftingManager contract={craftingLogicContract} signer={signer} />
            </CraftingProvider>
        </PageLayout>
    )
}
