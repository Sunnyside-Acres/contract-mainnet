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

                switch (network) {
                    case 'hardhat':
                        fileName = 'contract-addresses-local.json'
                        break
                    case 'seiMainnet':
                        fileName = 'contract-addresses-seimainnet.json'
                        break
                    case 'seiTestnet':
                        fileName = 'contract-addresses-seitestnet.json'
                        break
                    default:
                        throw new Error(`Network không được hỗ trợ: ${network}`)
                }

                const response = await fetch(`/api/contract-addresses?file=${fileName}`)

                if (!response.ok) {
                    throw new Error(`Không thể load contract addresses cho ${network}`)
                }

                const data: ContractAddresses = await response.json()
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
