'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '@/context/WalletContext'

export function WalletAutoConnect() {
    const { provider, signer, setProvider, setSigner } = useWallet()
    const [isClient, setIsClient] = useState(false)

    // Set isClient to true after mount to avoid hydration mismatch
    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (!isClient) return

        const connectWallet = async () => {
            // Nếu đã có provider và signer, không cần kết nối lại
            if (provider && signer) {
                return
            }

            // Kiểm tra xem có MetaMask không
            if (window.ethereum) {
                try {
                    console.log('Attempting to connect to MetaMask...')

                    // Yêu cầu kết nối account
                    const accounts = await window.ethereum.request({
                        method: 'eth_requestAccounts'
                    })

                    if (accounts.length > 0) {
                        const newProvider = new ethers.providers.Web3Provider(window.ethereum)
                        const newSigner = newProvider.getSigner()

                        setProvider(newProvider)
                        setSigner(newSigner)

                        console.log('Successfully connected to MetaMask')
                    }
                } catch (error) {
                    console.error('Error connecting to MetaMask:', error)
                }
            } else {
                console.log('MetaMask not found, attempting to connect to Hardhat...')

                // Thử kết nối Hardhat
                try {
                    const hardhatProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')

                    // Kiểm tra xem Hardhat có hoạt động không
                    await hardhatProvider.getNetwork()

                    // Lấy accounts từ Hardhat
                    const accounts = await hardhatProvider.listAccounts()

                    if (accounts.length > 0) {
                        const hardhatSigner = hardhatProvider.getSigner(accounts[0])

                        setProvider(hardhatProvider)
                        setSigner(hardhatSigner)

                        console.log('Successfully connected to Hardhat')
                    }
                } catch (error) {
                    console.error('Error connecting to Hardhat:', error)
                }
            }
        }

        connectWallet()
    }, [isClient, provider, signer, setProvider, setSigner])

    return null // Component này không render gì
}
