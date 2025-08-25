'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '@/context/WalletContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Wallet, HardDrive, ExternalLink, CheckCircle, XCircle } from 'lucide-react'

interface WalletOption {
    id: string
    name: string
    icon: React.ReactNode
    description: string
    isAvailable: boolean
    connect: () => Promise<void>
}

export function WalletSelector() {
    const { provider, signer, setProvider, setSigner } = useWallet()
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const connectMetaMask = async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error('MetaMask không được cài đặt')
        }

        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            })

            if (accounts.length === 0) {
                throw new Error('Không có account nào được chọn')
            }

            const newProvider = new ethers.providers.Web3Provider(window.ethereum)
            const newSigner = newProvider.getSigner()

            setProvider(newProvider)
            setSigner(newSigner)
        } catch (error) {
            console.error('Error connecting to MetaMask:', error)
            throw error
        }
    }

    const connectHardhat = async () => {
        try {
            const hardhatProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')

            // Kiểm tra xem Hardhat có hoạt động không
            await hardhatProvider.getNetwork()

            // Lấy accounts từ Hardhat
            const accounts = await hardhatProvider.listAccounts()

            if (accounts.length === 0) {
                throw new Error('Không có account nào trong Hardhat')
            }

            const hardhatSigner = hardhatProvider.getSigner(accounts[0])

            setProvider(hardhatProvider)
            setSigner(hardhatSigner)
        } catch (error) {
            console.error('Error connecting to Hardhat:', error)
            throw error
        }
    }

    const disconnect = () => {
        setProvider(null)
        setSigner(null)
        setError(null)
    }

    const walletOptions: WalletOption[] = [
        {
            id: 'metamask',
            name: 'MetaMask',
            icon: <Wallet className="w-6 h-6" />,
            description: 'Kết nối với MetaMask extension',
            isAvailable: typeof window !== 'undefined' && !!window.ethereum,
            connect: connectMetaMask
        },
        {
            id: 'hardhat',
            name: 'Hardhat Local',
            icon: <HardDrive className="w-6 h-6" />,
            description: 'Kết nối với Hardhat local network',
            isAvailable: true, // Luôn có sẵn, nhưng có thể không hoạt động
            connect: connectHardhat
        }
    ]

    const handleConnect = async (wallet: WalletOption) => {
        setIsConnecting(true)
        setError(null)

        try {
            await wallet.connect()
        } catch (err: any) {
            setError(err.message || 'Lỗi kết nối ví')
        } finally {
            setIsConnecting(false)
        }
    }

    const getCurrentWalletInfo = () => {
        if (!signer) return null

        const isMetaMask = provider instanceof ethers.providers.Web3Provider
        const isHardhat = provider instanceof ethers.providers.JsonRpcProvider

        return {
            name: isMetaMask ? 'MetaMask' : 'Hardhat Local',
            icon: isMetaMask ? <Wallet className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />
        }
    }

    const currentWallet = getCurrentWalletInfo()

    if (currentWallet) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {currentWallet.icon}
                        Đã kết nối: {currentWallet.name}
                        <Badge variant="secondary" className="ml-auto">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={disconnect}
                        variant="outline"
                        className="w-full"
                    >
                        <XCircle className="w-4 h-4 mr-2" />
                        Ngắt kết nối
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Chọn Ví
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                <div className="space-y-3">
                    {walletOptions.map((wallet) => (
                        <div
                            key={wallet.id}
                            className={`p-4 border rounded-lg ${wallet.isAvailable
                                    ? 'border-gray-200 hover:border-gray-300'
                                    : 'border-gray-100 bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {wallet.icon}
                                    <div>
                                        <h3 className="font-medium">{wallet.name}</h3>
                                        <p className="text-sm text-gray-600">{wallet.description}</p>
                                    </div>
                                </div>

                                {wallet.isAvailable ? (
                                    <Button
                                        onClick={() => handleConnect(wallet)}
                                        disabled={isConnecting}
                                        size="sm"
                                    >
                                        {isConnecting ? 'Đang kết nối...' : 'Kết nối'}
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-500">Không có sẵn</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-xs text-gray-500 text-center">
                    <p>Chọn ví để kết nối và sử dụng các tính năng của hệ thống</p>
                </div>
            </CardContent>
        </Card>
    )
}
