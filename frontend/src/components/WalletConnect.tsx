import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

import { useContractAddresses } from '../hooks/useContractAddresses'

interface WalletInfo {
    address: string
    balance: string
    network: string
    type: 'metamask' | 'hardhat'
}

interface Props {
    onNetworkChange?: (network: string) => void
    onProviderChange?: (provider: ethers.providers.Provider | null) => void
    onSignerChange?: (signer: ethers.Signer | null) => void
}

interface NetworkConfig {
    rpcUrl: string
    chainId: number
    name: string
    currency: string
    blockExplorer?: string
}

const networkConfigs: Record<string, NetworkConfig> = {
    hardhat: {
        rpcUrl: 'http://127.0.0.1:8545',
        chainId: 31337,
        name: 'Hardhat Local',
        currency: 'ETH'
    },
    seiMainnet: {
        rpcUrl: 'https://evm-rpc.sei-apis.com',
        chainId: 1329,
        name: 'Sei Mainnet',
        currency: 'SEI',
        blockExplorer: 'https://sei.explorers.guru'
    },
    seiTestnet: {
        rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
        chainId: 1328,
        name: 'Sei Testnet',
        currency: 'SEI',
        blockExplorer: 'https://sei-testnet.explorers.guru'
    }
}

export default function WalletConnect({ onNetworkChange, onProviderChange, onSignerChange }: Props) {
    const [provider, setProvider] = useState<ethers.providers.Provider | null>(null)
    const [signer, setSigner] = useState<ethers.Signer | null>(null)
    const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
    const [hardhatAccounts, setHardhatAccounts] = useState<string[]>([])
    const [selectedNetwork, setSelectedNetwork] = useState('hardhat')
    const [isLoading, setIsLoading] = useState(false)

    // Load contract addresses dựa trên network
    const { addresses, loading: addressesLoading, error: addressesError } = useContractAddresses(selectedNetwork)

    useEffect(() => {
        loadHardhatAccounts()
    }, [])

    // Tự động kết nối Hardhat khi có accounts và đang chọn Hardhat
    useEffect(() => {
        if (selectedNetwork === 'hardhat' && hardhatAccounts.length > 0 && !walletInfo) {
            connectHardhatAccount(hardhatAccounts[0])
        }
    }, [selectedNetwork, hardhatAccounts, walletInfo])

    const loadHardhatAccounts = async () => {
        try {
            const hardhatProvider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545")
            const accounts = await hardhatProvider.listAccounts()
            setHardhatAccounts(accounts)

            // Tự động kết nối với ví đầu tiên
            if (accounts.length > 0) {
                await connectHardhatAccount(accounts[0])
            }
        } catch (error) {
            console.error('Lỗi tải danh sách ví Hardhat:', error)
        }
    }

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatBalance = (balance: ethers.BigNumber, decimals = 4) => {
        const balanceInEther = ethers.utils.formatEther(balance)
        const number = parseFloat(balanceInEther)
        return number.toLocaleString('vi-VN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: decimals
        })
    }

    const connectMetamask = async () => {
        try {
            setIsLoading(true)
            if (typeof window.ethereum !== 'undefined') {
                const provider = new ethers.providers.Web3Provider(window.ethereum)
                await provider.send("eth_requestAccounts", [])
                const signer = provider.getSigner()
                const address = await signer.getAddress()
                const network = await provider.getNetwork()
                const balance = await provider.getBalance(address)

                setProvider(provider)
                setSigner(signer)
                onProviderChange?.(provider)
                onSignerChange?.(signer)
                setWalletInfo({
                    address,
                    balance: formatBalance(balance),
                    network: networkConfigs[selectedNetwork].name,
                    type: 'metamask'
                })
            } else {
                throw new Error('Vui lòng cài đặt MetaMask!')
            }
        } catch (error) {
            console.error('Lỗi kết nối MetaMask:', error)
            alert('Lỗi kết nối MetaMask: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    const connectHardhatAccount = async (address: string) => {
        try {
            setIsLoading(true)
            const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545")
            const signer = provider.getSigner(address)
            const balance = await provider.getBalance(address)

            setProvider(provider)
            setSigner(signer)
            onProviderChange?.(provider)
            onSignerChange?.(signer)
            setWalletInfo({
                address,
                balance: formatBalance(balance),
                network: 'Hardhat Local',
                type: 'hardhat'
            })
        } catch (error) {
            console.error('Lỗi kết nối Hardhat:', error)
            alert('Lỗi kết nối Hardhat: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    const switchNetwork = async (network: string) => {
        try {
            setIsLoading(true)
            if (typeof window.ethereum !== 'undefined') {
                const config = networkConfigs[network]
                const chainId = `0x${config.chainId.toString(16)}`

                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId }],
                    })
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId,
                                chainName: config.name,
                                nativeCurrency: {
                                    name: config.currency,
                                    symbol: config.currency,
                                    decimals: 18
                                },
                                rpcUrls: [config.rpcUrl],
                                blockExplorerUrls: config.blockExplorer ? [config.blockExplorer] : undefined
                            }]
                        })
                    } else {
                        throw switchError
                    }
                }

                setSelectedNetwork(network)
                onNetworkChange?.(network)
            }
        } catch (error) {
            console.error('Lỗi chuyển mạng:', error)
            alert('Lỗi chuyển mạng: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    const switchToHardhat = async () => {
        setSelectedNetwork('hardhat')
        onNetworkChange?.('hardhat')

        // Tự động kết nối với ví Hardhat đầu tiên
        if (hardhatAccounts.length > 0) {
            await connectHardhatAccount(hardhatAccounts[0])
        } else {
            // Reset wallet info nếu không có ví nào
            setWalletInfo(null)
            setProvider(null)
            setSigner(null)
            onProviderChange?.(null)
            onSignerChange?.(null)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                    </svg>
                    <span>Kết nối ví</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Wallet Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        className="w-full"
                        onClick={connectMetamask}
                        variant={walletInfo?.type === 'metamask' ? 'default' : 'outline'}
                        disabled={isLoading}
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                        MetaMask
                    </Button>
                    <Button
                        className="w-full"
                        onClick={async () => await switchToHardhat()}
                        variant={walletInfo?.type === 'hardhat' ? 'default' : 'outline'}
                        disabled={isLoading}
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                            />
                        </svg>
                        Hardhat
                    </Button>
                </div>

                {/* Network Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Chọn mạng</label>
                    <Select value={selectedNetwork} onValueChange={switchNetwork}>
                        <SelectTrigger className="w-full" disabled={isLoading}>
                            <SelectValue placeholder="Chọn mạng" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hardhat">
                                <div className="flex items-center">
                                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                                    Hardhat (Local)
                                </div>
                            </SelectItem>
                            <SelectItem value="seiMainnet">
                                <div className="flex items-center">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                    Sei Mainnet
                                </div>
                            </SelectItem>
                            <SelectItem value="seiTestnet">
                                <div className="flex items-center">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                                    Sei Testnet
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Hardhat Accounts */}
                {selectedNetwork === 'hardhat' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Danh sách ví Hardhat</label>
                        <Select onValueChange={(value) => connectHardhatAccount(value)}>
                            <SelectTrigger className="w-full" disabled={isLoading}>
                                <SelectValue placeholder="Chọn ví" />
                            </SelectTrigger>
                            <SelectContent>
                                {hardhatAccounts.map((account, index) => (
                                    <SelectItem key={account} value={account}>
                                        <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-purple-500 mr-2" />
                                            Ví {index + 1}: {formatAddress(account)}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Contract Addresses Info */}
                {addressesLoading && (
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-4">
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                <span className="text-sm text-muted-foreground">Đang tải contract addresses...</span>
                            </div>
                        </div>
                    </div>
                )}

                {addressesError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 text-card-foreground shadow-sm">
                        <div className="p-4">
                            <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm text-red-600">{addressesError}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Wallet Info */}
                {walletInfo && (
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Địa chỉ:</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm">{formatAddress(walletInfo.address)}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => navigator.clipboard.writeText(walletInfo.address)}
                                    >
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
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Số dư:</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm">
                                        {walletInfo.balance} {networkConfigs[selectedNetwork].currency}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => navigator.clipboard.writeText(`${walletInfo.balance} ${networkConfigs[selectedNetwork].currency}`)}
                                    >
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
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Mạng:</span>
                                <div className="flex items-center space-x-2">
                                    <div className={`h-2 w-2 rounded-full ${selectedNetwork === 'hardhat'
                                        ? 'bg-green-500'
                                        : selectedNetwork === 'seiMainnet'
                                            ? 'bg-blue-500'
                                            : 'bg-yellow-500'
                                        }`} />
                                    <span className="font-mono text-sm">{walletInfo.network}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => navigator.clipboard.writeText(walletInfo.network)}
                                    >
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
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Chain ID:</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm">{networkConfigs[selectedNetwork].chainId}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => navigator.clipboard.writeText(networkConfigs[selectedNetwork].chainId.toString())}
                                    >
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
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">RPC URL:</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm">{networkConfigs[selectedNetwork].rpcUrl}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => navigator.clipboard.writeText(networkConfigs[selectedNetwork].rpcUrl)}
                                    >
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
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Loại ví:</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm">
                                        {walletInfo.type === 'metamask' ? 'MetaMask' : 'Hardhat'}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => navigator.clipboard.writeText(walletInfo.type === 'metamask' ? 'MetaMask' : 'Hardhat')}
                                    >
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
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}