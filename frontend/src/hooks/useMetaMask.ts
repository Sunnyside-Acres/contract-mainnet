import { useState, useEffect } from 'react';

export interface MetaMaskStatus {
    isConnected: boolean;
    isInstalled: boolean;
    account: string | null;
    chainId: string | null;
    error: string | null;
}

export function useMetaMask() {
    const [status, setStatus] = useState<MetaMaskStatus>({
        isConnected: false,
        isInstalled: false,
        account: null,
        chainId: null,
        error: null
    });

    useEffect(() => {
        checkMetaMask();
        
        // Listen for account changes
        if (typeof window !== 'undefined' && window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('disconnect', handleDisconnect);
        }

        return () => {
            if (typeof window !== 'undefined' && window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
                window.ethereum.removeListener('disconnect', handleDisconnect);
            }
        };
    }, []);

    const checkMetaMask = async () => {
        try {
            if (typeof window === 'undefined' || !window.ethereum) {
                setStatus(prev => ({
                    ...prev,
                    isInstalled: false,
                    error: 'MetaMask không được tìm thấy. Vui lòng cài đặt MetaMask extension.'
                }));
                return;
            }

            setStatus(prev => ({ ...prev, isInstalled: true }));

            // Check if already connected
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                setStatus({
                    isConnected: true,
                    isInstalled: true,
                    account: accounts[0],
                    chainId,
                    error: null
                });
            } else {
                setStatus(prev => ({
                    ...prev,
                    isConnected: false,
                    account: null,
                    chainId: null
                }));
            }
        } catch (error) {
            setStatus(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    };

    const connect = async () => {
        try {
            if (!status.isInstalled) {
                throw new Error('MetaMask không được cài đặt');
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });

            setStatus({
                isConnected: true,
                isInstalled: true,
                account: accounts[0],
                chainId,
                error: null
            });

            return accounts[0];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setStatus(prev => ({ ...prev, error: errorMessage }));
            throw error;
        }
    };

    const switchNetwork = async (chainId: string) => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }]
            });
        } catch (error: any) {
            // If the network doesn't exist, add it
            if (error.code === 4902 || (error.message && error.message.includes('does not exist'))) {
                await addNetwork(chainId);
            } else {
                console.error('Network switch error:', error);
                throw new Error(error.message || 'Failed to switch network');
            }
        }
    };

    const addNetwork = async (chainId: string) => {
        const networkConfig = getNetworkConfig(chainId);
        if (!networkConfig) {
            throw new Error('Network configuration not found');
        }

        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig]
        });
    };

    const getNetworkConfig = (chainId: string) => {
        const networks: Record<string, any> = {
            '0x539': { // 1337 in hex
                chainId: '0x539',
                chainName: 'Local Hardhat',
                nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['http://127.0.0.1:8545'],
                blockExplorerUrls: []
            },
            '0x531': { // 1329 in hex
                chainId: '0x531',
                chainName: 'Sei Mainnet',
                nativeCurrency: {
                    name: 'SEI',
                    symbol: 'SEI',
                    decimals: 18
                },
                rpcUrls: ['https://evm-rpc.sei-apis.com'],
                blockExplorerUrls: ['https://sei.explorer.sei.io']
            }
        };

        return networks[chainId];
    };

    const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
            setStatus(prev => ({
                ...prev,
                isConnected: false,
                account: null
            }));
        } else {
            setStatus(prev => ({
                ...prev,
                account: accounts[0]
            }));
        }
    };

    const handleChainChanged = (chainId: string) => {
        setStatus(prev => ({ ...prev, chainId }));
    };

    const handleDisconnect = () => {
        setStatus(prev => ({
            ...prev,
            isConnected: false,
            account: null
        }));
    };

    return {
        ...status,
        connect,
        switchNetwork,
        checkMetaMask
    };
}
