'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'

interface WalletContextType {
    provider: ethers.providers.Provider | null
    signer: ethers.Signer | null
    selectedNetwork: string
    setSelectedNetwork: (network: string) => void
    setProvider: (provider: ethers.providers.Provider | null) => void
    setSigner: (signer: ethers.Signer | null) => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
    const [provider, setProvider] = useState<ethers.providers.Provider | null>(null)
    const [signer, setSigner] = useState<ethers.Signer | null>(null)
    const [selectedNetwork, setSelectedNetwork] = useState('hardhat')
    const [isClient, setIsClient] = useState(false)

    // Set isClient to true after mount to avoid hydration mismatch
    useEffect(() => {
        setIsClient(true)
    }, [])

    // Listen for account changes
    useEffect(() => {
        if (isClient && window.ethereum) {
            const ethereum = window.ethereum as any

            const handleAccountsChanged = async (accounts: string[]) => {
                if (accounts.length === 0) {
                    // User disconnected
                    setProvider(null)
                    setSigner(null)
                } else {
                    // Account changed, reconnect
                    try {
                        const newProvider = new ethers.providers.Web3Provider(ethereum)
                        const newSigner = newProvider.getSigner()
                        setProvider(newProvider)
                        setSigner(newSigner)
                    } catch (error) {
                        console.error('Error reconnecting wallet:', error)
                    }
                }
            }

            const handleChainChanged = () => {
                // Reload page when chain changes
                window.location.reload()
            }

            // Add event listeners
            if (ethereum.on) {
                ethereum.on('accountsChanged', handleAccountsChanged)
                ethereum.on('chainChanged', handleChainChanged)
            }

            return () => {
                // Remove event listeners
                if (ethereum.removeListener) {
                    ethereum.removeListener('accountsChanged', handleAccountsChanged)
                    ethereum.removeListener('chainChanged', handleChainChanged)
                }
            }
        }
    }, [isClient])

    return (
        <WalletContext.Provider value={{
            provider,
            signer,
            selectedNetwork,
            setSelectedNetwork,
            setProvider,
            setSigner
        }}>
            {children}
        </WalletContext.Provider>
    )
}

export function useWallet() {
    const context = useContext(WalletContext)
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider')
    }
    return context
}
