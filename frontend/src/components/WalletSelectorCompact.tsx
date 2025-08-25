'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '@/context/WalletContext'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Wallet, HardDrive, CheckCircle, XCircle } from 'lucide-react'

export function WalletSelectorCompact() {
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

    const handleConnect = async (walletType: 'metamask' | 'hardhat') => {
        setIsConnecting(true)
        setError(null)

        try {
            if (walletType === 'metamask') {
                await connectMetaMask()
            } else {
                await connectHardhat()
            }
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
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Đã kết nối</span>
                    <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    {currentWallet.icon}
                    <span>{currentWallet.name}</span>
                </div>
                <Button
                    onClick={disconnect}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-6"
                >
                    <XCircle className="w-3 h-3 mr-1" />
                    Ngắt kết nối
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            <Button
                onClick={() => handleConnect('metamask')}
                disabled={isConnecting}
                className="w-full text-xs"
                size="sm"
            >
                <Wallet className="mr-2 h-3 w-3" />
                MetaMask
            </Button>

            <Button
                onClick={() => handleConnect('hardhat')}
                disabled={isConnecting}
                variant="outline"
                className="w-full text-xs"
                size="sm"
            >
                <HardDrive className="mr-2 h-3 w-3" />
                Hardhat Local
            </Button>

            <div className="text-xs text-muted-foreground text-center">
                Chọn ví để kết nối
            </div>
        </div>
    )
}
