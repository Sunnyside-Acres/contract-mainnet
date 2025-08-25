import { useState, useEffect } from 'react'

interface ContractAddresses {
    network: string
    chainId: number
    deployer: string
    contracts: {
        World: string
        PlayerComponent: string
        PlayerLogic: string
        PlayerProxy: string
        ItemComponent: string
        ItemLogic: string
        ItemProxy: string
        WeatherComponent: string
        WeatherLogic: string
        WeatherProxy: string
        PlotComponent: string
        PlotLogic: string
        PlotProxy: string
        InventoryComponent: string
        InventoryLogic: string
        InventoryProxy: string
        PlantComponent: string
        PlantLogic: string
        PlantProxy: string
        FishingLogic: string
        NPCMarketComponent: string
        NPCMarketLogic: string
        NPCMarketProxy: string
        GachaComponent: string
        GachaLogic: string
        GachaProxy: string
        TaskComponent: string
        TaskLogic: string
        TaskProxy: string
        FleaMarketComponent: string
        FleaMarketLogic: string
        FleaMarketProxy: string
        CraftingComponent: string
        CraftingLogic: string
        CraftingProxy: string
        RaisingComponent: string
        RaisingLogic: string
        RaisingProxy: string
    }
    timestamp: string
    rpcUrl?: string
}

export function useContractAddresses(network: string) {
    const [addresses, setAddresses] = useState<ContractAddresses | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadAddresses = async () => {
            if (!network) return

            setLoading(true)
            setError(null)

            try {
                let fileName: string

                // Xử lý cả network name và chain ID
                const networkKey = network.toLowerCase()
                console.log('Loading contract addresses for network:', networkKey)

                if (networkKey === 'hardhat' || networkKey === '31337' || networkKey === 'chain-31337') {
                    fileName = 'contract-addresses-local.json'
                } else if (networkKey === 'seimainnet' || networkKey === '1329' || networkKey === 'chain-1329') {
                    fileName = 'contract-addresses-seimainnet.json'
                } else if (networkKey === 'seitestnet' || networkKey === '1328' || networkKey === 'chain-1328') {
                    fileName = 'contract-addresses-seitestnet.json'
                } else {
                    throw new Error(`Network không được hỗ trợ: ${network}`)
                }

                console.log('Using file:', fileName)
                const response = await fetch(`/api/contract-addresses?network=${networkKey}`)

                if (!response.ok) {
                    throw new Error(`Không thể load contract addresses cho ${network}`)
                }

                const data: ContractAddresses = await response.json()
                console.log('Loaded contract addresses:', data)
                setAddresses(data)
            } catch (err) {
                console.error('Lỗi load contract addresses:', err)
                setError(err instanceof Error ? err.message : 'Lỗi không xác định')
                setAddresses(null)
            } finally {
                setLoading(false)
            }
        }

        loadAddresses()
    }, [network])

    return { addresses, loading, error }
}
