import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface ContractInfo {
    name: string
    address: string
    abi: any[]
    timestamp: string
}

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

interface Props {
    provider?: ethers.providers.Provider | null;
    signer?: ethers.Signer | null;
    contractAddresses?: ContractAddresses | null;
    onContractLoad: (contract: ethers.Contract) => void
}

export default function ContractManager({ provider, signer, contractAddresses, onContractLoad }: Props) {
    const [contractAddress, setContractAddress] = useState('')
    const [contractABI, setContractABI] = useState('')
    const [artifacts, setArtifacts] = useState<Record<string, any>>({})
    const [selectedContract, setSelectedContract] = useState('')
    const [contractHistory, setContractHistory] = useState<ContractInfo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [autoLoadNotification, setAutoLoadNotification] = useState<string | null>(null)

    useEffect(() => {
        loadArtifacts()
        loadContractHistory()
    }, [])

    // Tự động điền contract address khi có contractAddresses
    useEffect(() => {
        if (contractAddresses && !contractAddress) {
            // Mặc định chọn World contract
            setContractAddress(contractAddresses.contracts.World)
        }
    }, [contractAddresses, contractAddress])

    // Ẩn thông báo auto load sau 3 giây
    useEffect(() => {
        if (autoLoadNotification) {
            const timer = setTimeout(() => {
                setAutoLoadNotification(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [autoLoadNotification])

    // Tự động tải ABI khi chọn contract đã deploy
    const handleDeployedContractSelect = async (contractAddress: string) => {
        setContractAddress(contractAddress)

        // Mapping contract addresses với tên contract
        const contractMapping: Record<string, string> = {
            [contractAddresses?.contracts.World || '']: 'World',
            [contractAddresses?.contracts.PlayerProxy || '']: 'PlayerProxy',
            [contractAddresses?.contracts.PlayerComponent || '']: 'PlayerComponent',
            [contractAddresses?.contracts.PlayerLogic || '']: 'PlayerLogic',
            [contractAddresses?.contracts.ItemComponent || '']: 'ItemComponent',
            [contractAddresses?.contracts.ItemLogic || '']: 'ItemLogic',
            [contractAddresses?.contracts.ItemProxy || '']: 'ItemProxy',
            [contractAddresses?.contracts.WeatherComponent || '']: 'WeatherComponent',
            [contractAddresses?.contracts.WeatherLogic || '']: 'WeatherLogic',
            [contractAddresses?.contracts.WeatherProxy || '']: 'WeatherProxy',
            [contractAddresses?.contracts.PlotComponent || '']: 'PlotComponent',
            [contractAddresses?.contracts.PlotLogic || '']: 'PlotLogic',
            [contractAddresses?.contracts.PlotProxy || '']: 'PlotProxy',
            [contractAddresses?.contracts.InventoryComponent || '']: 'InventoryComponent',
            [contractAddresses?.contracts.InventoryLogic || '']: 'InventoryLogic',
            [contractAddresses?.contracts.InventoryProxy || '']: 'InventoryProxy',
            [contractAddresses?.contracts.PlantComponent || '']: 'PlantComponent',
            [contractAddresses?.contracts.PlantLogic || '']: 'PlantLogic',
            [contractAddresses?.contracts.PlantProxy || '']: 'PlantProxy'
        }

        const contractName = contractMapping[contractAddress]
        if (contractName && artifacts[contractName]?.abi) {
            setSelectedContract(contractName)
            // ABI từ artifacts đã là object, chỉ cần stringify để hiển thị
            const abiString = JSON.stringify(artifacts[contractName].abi, null, 2)
            setContractABI(abiString)
            console.log('Loaded ABI for:', contractName)
            console.log('ABI type:', typeof artifacts[contractName].abi)
            console.log('ABI length:', artifacts[contractName].abi.length)
            console.log('ABI string length:', abiString.length)

            // Tự động load contract sau khi điền thông tin
            try {
                setIsLoading(true)
                if (!signer) {
                    throw new Error('Vui lòng kết nối ví trước')
                }

                const contract = new ethers.Contract(contractAddress, artifacts[contractName].abi, signer)
                onContractLoad(contract)
                console.log('Contract loaded automatically:', contractName)
                setAutoLoadNotification(`Contract ${contractName} đã được tải tự động!`)
            } catch (error) {
                console.error('Lỗi tự động tải contract:', error)
                // Không hiển thị alert để tránh làm phiền user
            } finally {
                setIsLoading(false)
            }
        } else {
            console.log('Contract not found or no ABI:', contractName, artifacts[contractName])
        }
    }

    const loadArtifacts = async () => {
        try {
            const response = await fetch('/api/artifacts')
            if (!response.ok) {
                throw new Error('Lỗi tải artifacts')
            }
            const data = await response.json()
            setArtifacts(data)
        } catch (error) {
            console.error('Lỗi tải artifacts:', error)
        }
    }

    const loadContractHistory = async () => {
        try {
            const response = await fetch('/api/contract-history')
            if (!response.ok) {
                throw new Error('Lỗi tải lịch sử contract')
            }
            const data = await response.json()
            setContractHistory(data)
        } catch (error) {
            console.error('Lỗi tải lịch sử contract:', error)
        }
    }

    const handleContractSelect = (contractName: string) => {
        setSelectedContract(contractName)
        if (artifacts[contractName]?.abi) {
            setContractABI(JSON.stringify(artifacts[contractName].abi, null, 2))
        }
    }

    const loadContract = async () => {
        try {
            setIsLoading(true)
            if (!signer) {
                throw new Error('Vui lòng kết nối ví trước')
            }

            if (!ethers.utils.isAddress(contractAddress)) {
                throw new Error('Địa chỉ contract không hợp lệ')
            }

            let abi
            try {
                // Kiểm tra nếu contractABI đã là object
                if (typeof contractABI === 'object') {
                    abi = contractABI
                } else if (typeof contractABI === 'string') {
                    // Parse từ string
                    abi = JSON.parse(contractABI)
                } else {
                    throw new Error('ABI không hợp lệ')
                }

                // Kiểm tra ABI có phải là array không
                if (!Array.isArray(abi)) {
                    throw new Error('ABI phải là một mảng')
                }
            } catch (error) {
                console.error('Lỗi parse ABI:', error)
                console.log('ContractABI:', contractABI)
                throw new Error('ABI không hợp lệ: ' + (error as Error).message)
            }

            const contract = new ethers.Contract(contractAddress, abi, signer)
            onContractLoad(contract)
            alert('Contract đã được tải thành công!')
        } catch (error) {
            console.error('Lỗi tải contract:', error)
            alert('Lỗi tải contract: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    const saveContract = async () => {
        try {
            setIsLoading(true)
            if (!ethers.utils.isAddress(contractAddress)) {
                throw new Error('Địa chỉ contract không hợp lệ')
            }

            let abi
            try {
                // Kiểm tra nếu contractABI đã là object
                if (typeof contractABI === 'object') {
                    abi = contractABI
                } else if (typeof contractABI === 'string') {
                    // Parse từ string
                    abi = JSON.parse(contractABI)
                } else {
                    throw new Error('ABI không hợp lệ')
                }

                // Kiểm tra ABI có phải là array không
                if (!Array.isArray(abi)) {
                    throw new Error('ABI phải là một mảng')
                }
            } catch (error) {
                console.error('Lỗi parse ABI:', error)
                console.log('ContractABI:', contractABI)
                throw new Error('ABI không hợp lệ: ' + (error as Error).message)
            }

            const response = await fetch('/api/contract-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: contractAddress,
                    abi,
                    name: selectedContract || `Contract (${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)})`
                })
            })

            if (!response.ok) {
                throw new Error('Lỗi lưu contract')
            }

            await loadContractHistory()
            alert('Contract đã được lưu vào lịch sử!')
        } catch (error) {
            console.error('Lỗi lưu contract:', error)
            alert('Lỗi lưu contract: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    const loadFromHistory = (contract: ContractInfo) => {
        setContractAddress(contract.address)
        setContractABI(JSON.stringify(contract.abi, null, 2))
        loadContract()
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                        </svg>
                        <span className="text-base">Quản lý Contract</span>
                    </div>
                    {contractAddresses && (
                        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {contractAddresses.network} ({contractAddresses.chainId})
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Thông báo auto load */}
                {autoLoadNotification && (
                    <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        <div className="flex items-center space-x-2">
                            <svg
                                className="h-3 w-3 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span>{autoLoadNotification}</span>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="config">
                    <TabsList className="w-full">
                        <TabsTrigger value="config" className="flex-1">
                            <div className="flex items-center space-x-2">
                                <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                <span className="text-xs">Cấu hình</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="deployed" className="flex-1">
                            <div className="flex items-center space-x-2">
                                <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                </svg>
                                <span className="text-xs">Deployed</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex-1">
                            <div className="flex items-center space-x-2">
                                <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span className="text-xs">Lịch sử</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="config" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Chọn Contract</label>
                            <Select value={selectedContract} onValueChange={handleContractSelect}>
                                <SelectTrigger className="w-full" disabled={isLoading}>
                                    <SelectValue placeholder="Chọn contract" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(artifacts).map(([name, artifact]) => (
                                        <SelectItem key={name} value={name}>
                                            <div className="flex items-center space-x-2">
                                                <svg
                                                    className="h-3 w-3"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                                <span className="text-xs">
                                                    {name} ({artifact.abi?.length || 0} functions)
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium">Địa chỉ Contract</label>
                            <Input
                                value={contractAddress}
                                onChange={(e) => setContractAddress(e.target.value)}
                                placeholder="0x..."
                                disabled={isLoading}
                                className="text-xs"
                            />
                            {contractAddresses && (
                                <p className="text-xs text-muted-foreground">
                                    💡 Tip: Sử dụng tab "Deployed" để chọn contract đã deploy nhanh chóng
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium">ABI</label>
                            <Textarea
                                value={contractABI}
                                onChange={(e) => setContractABI(e.target.value)}
                                placeholder="Paste ABI here..."
                                rows={4}
                                disabled={isLoading}
                                className="text-xs"
                            />
                        </div>

                        <div className="flex space-x-2">
                            <Button
                                onClick={loadContract}
                                className="flex-1 text-xs"
                                disabled={isLoading}
                            >
                                <svg
                                    className="mr-2 h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                    />
                                </svg>
                                Tải Contract
                            </Button>
                            <Button
                                onClick={saveContract}
                                variant="outline"
                                disabled={isLoading}
                                className="text-xs"
                            >
                                <svg
                                    className="mr-2 h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                                    />
                                </svg>
                                Lưu
                            </Button>
                            <Button
                                onClick={() => navigator.clipboard.writeText(contractABI)}
                                variant="outline"
                                disabled={isLoading}
                                className="text-xs"
                            >
                                <svg
                                    className="mr-2 h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                                Copy ABI
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="deployed" className="mt-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Deployed Contracts</h3>
                                {contractAddresses && (
                                    <div className="text-xs text-muted-foreground">
                                        {contractAddresses.network} (Chain ID: {contractAddresses.chainId})
                                    </div>
                                )}
                            </div>

                            {contractAddresses ? (
                                <div className="space-y-2">
                                    {/* World Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.World)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    {isLoading && contractAddress === contractAddresses.contracts.World ? (
                                                        <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">World Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.World.slice(0, 8)}...{contractAddresses.contracts.World.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {isLoading && contractAddress === contractAddresses.contracts.World ? 'Loading...' : 'Main'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Player Logic Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlayerLogic)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    {isLoading && contractAddress === contractAddresses.contracts.PlayerLogic ? (
                                                        <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Player Logic Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlayerLogic.slice(0, 8)}...{contractAddresses.contracts.PlayerLogic.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {isLoading && contractAddress === contractAddresses.contracts.PlayerLogic ? 'Loading...' : 'Logic'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Player Proxy Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlayerProxy)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Player Proxy Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlayerProxy.slice(0, 8)}...{contractAddresses.contracts.PlayerProxy.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Proxy
                                            </div>
                                        </div>
                                    </div>

                                    {/* Player Component Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlayerComponent)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Player Component Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlayerComponent.slice(0, 8)}...{contractAddresses.contracts.PlayerComponent.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Component
                                            </div>
                                        </div>
                                    </div>

                                    {/* Item Logic Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.ItemLogic)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    {isLoading && contractAddress === contractAddresses.contracts.ItemLogic ? (
                                                        <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Item Logic Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.ItemLogic.slice(0, 8)}...{contractAddresses.contracts.ItemLogic.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {isLoading && contractAddress === contractAddresses.contracts.ItemLogic ? 'Loading...' : 'Logic'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Item Proxy Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.ItemProxy)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Item Proxy Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.ItemProxy.slice(0, 8)}...{contractAddresses.contracts.ItemProxy.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Proxy
                                            </div>
                                        </div>
                                    </div>

                                    {/* Item Component Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.ItemComponent)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Item Component Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.ItemComponent.slice(0, 8)}...{contractAddresses.contracts.ItemComponent.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Component
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weather Logic Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.WeatherLogic)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    {isLoading && contractAddress === contractAddresses.contracts.WeatherLogic ? (
                                                        <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Weather Logic Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.WeatherLogic.slice(0, 8)}...{contractAddresses.contracts.WeatherLogic.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {isLoading && contractAddress === contractAddresses.contracts.WeatherLogic ? 'Loading...' : 'Logic'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weather Proxy Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.WeatherProxy)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Weather Proxy Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.WeatherProxy.slice(0, 8)}...{contractAddresses.contracts.WeatherProxy.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Proxy
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weather Component Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.WeatherComponent)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Weather Component Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.WeatherComponent.slice(0, 8)}...{contractAddresses.contracts.WeatherComponent.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Component
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plot Logic Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlotLogic)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    {isLoading && contractAddress === contractAddresses.contracts.PlotLogic ? (
                                                        <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Plot Logic Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlotLogic.slice(0, 8)}...{contractAddresses.contracts.PlotLogic.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {isLoading && contractAddress === contractAddresses.contracts.PlotLogic ? 'Loading...' : 'Logic'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plot Proxy Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlotProxy)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Plot Proxy Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlotProxy.slice(0, 8)}...{contractAddresses.contracts.PlotProxy.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Proxy
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plot Component Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlotComponent)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Plot Component Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlotComponent.slice(0, 8)}...{contractAddresses.contracts.PlotComponent.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Component
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inventory Logic Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.InventoryLogic)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    {isLoading && contractAddress === contractAddresses.contracts.InventoryLogic ? (
                                                        <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Inventory Logic Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.InventoryLogic.slice(0, 8)}...{contractAddresses.contracts.InventoryLogic.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {isLoading && contractAddress === contractAddresses.contracts.InventoryLogic ? 'Loading...' : 'Logic'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inventory Proxy Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.InventoryProxy)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Inventory Proxy Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.InventoryProxy.slice(0, 8)}...{contractAddresses.contracts.InventoryProxy.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Proxy
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inventory Component Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.InventoryComponent)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Inventory Component Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.InventoryComponent.slice(0, 8)}...{contractAddresses.contracts.InventoryComponent.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Component
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plant Logic Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlantLogic)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    {isLoading && contractAddress === contractAddresses.contracts.PlantLogic ? (
                                                        <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Plant Logic Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlantLogic.slice(0, 8)}...{contractAddresses.contracts.PlantLogic.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {isLoading && contractAddress === contractAddresses.contracts.PlantLogic ? 'Loading...' : 'Logic'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plant Proxy Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlantProxy)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Plant Proxy Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlantProxy.slice(0, 8)}...{contractAddresses.contracts.PlantProxy.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Proxy
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plant Component Contract */}
                                    <div
                                        className="group relative border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => handleDeployedContractSelect(contractAddresses.contracts.PlantComponent)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                                                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-medium truncate">Plant Component Contract</h4>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                                        {contractAddresses.contracts.PlantComponent.slice(0, 8)}...{contractAddresses.contracts.PlantComponent.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                Component
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-6">
                                    <svg
                                        className="mx-auto h-8 w-8 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1}
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                    <h3 className="mt-2 text-xs font-medium text-gray-900">
                                        Không tìm thấy contract đã deploy
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Vui lòng deploy contracts trước
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                        <div className="space-y-4">
                            {contractHistory.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <svg
                                        className="mx-auto h-12 w-12 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1}
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                                        Chưa có lịch sử contract
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Bắt đầu bằng cách tải và lưu một contract
                                    </p>
                                </div>
                            ) : (
                                contractHistory.map((contract, index) => (
                                    <div
                                        key={index}
                                        className="group relative rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => loadFromHistory(contract)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                    <svg
                                                        className="h-6 w-6 text-primary"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                        />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium">{contract.name}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {contract.address}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(contract.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-lg ring-2 ring-transparent transition-all group-hover:ring-ring" />
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

