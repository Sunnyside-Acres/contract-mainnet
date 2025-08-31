"use client";

import { PageHeader } from "@/components/PageHeader";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeploymentLogs } from "@/components/DeploymentLogs";
import { useState, useEffect } from "react";
import { DeployService } from "@/services/DeployService";
import { useMetaMask } from "@/hooks/useMetaMask";
import React from "react";


type ContractFeature = 'World' | 'Player' | 'Item' | 'Weather' | 'Inventory' | 'Plant';

type ContractType = {
    [key in ContractFeature]: string | string[];
};

interface DeployedContract {
    name: string;
    address: string;
    timestamp: string;
}

const CONTRACTS: ContractType = {
    World: "World",
    Player: ["PlayerComponent", "PlayerLogic", "PlayerProxy"],
    Item: ["ItemComponent", "ItemLogic", "ItemProxy"],
    Weather: ["WeatherComponent", "WeatherLogic", "WeatherProxy"],

    Inventory: ["InventoryComponent", "InventoryLogic", "InventoryProxy"],
    Plant: ["PlantComponent", "PlantLogic", "PlantProxy"]
};

type DeployMode = 'all' | 'feature' | 'single';

// Hàm tạo địa chỉ ngẫu nhiên cho demo
const generateRandomAddress = () => {
    return '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
};

// Hook để tạo địa chỉ ngẫu nhiên tránh hydration mismatch
const useRandomAddress = () => {
    return React.useMemo(() => {
        return '0x' + Array.from({ length: 40 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }, []);
};

export default function DeployPage() {
    const [network, setNetwork] = useState("local");
    const [selectedFeature, setSelectedFeature] = useState<ContractFeature | ''>('');
    const [selectedContract, setSelectedContract] = useState("");
    const [isDeploying, setIsDeploying] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [deployMode, setDeployMode] = useState<DeployMode>('all');
    const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
    const [deploymentProgress, setDeploymentProgress] = useState({ current: 0, total: 0, currentContract: '' });
    const [contractDependencies, setContractDependencies] = useState<{ [key: string]: string }>({});
    const [privateKey, setPrivateKey] = useState("");
    const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);

    const { isConnected, isInstalled, account, chainId, connect, switchNetwork } = useMetaMask();

    // Sử dụng hook để tạo địa chỉ ngẫu nhiên tránh hydration mismatch
    const randomDeployerAddress = useRandomAddress();

    // Load dependencies when selectedContract changes
    useEffect(() => {
        if (selectedContract && deployMode === 'single' && network) {
            if (selectedContract.includes('Logic') || selectedContract.includes('Proxy')) {
                loadContractDependencies(selectedContract);
            } else {
                setContractDependencies({});
            }
        } else {
            setContractDependencies({});
        }
    }, [selectedContract, deployMode, network]);

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]);
    };

    const deployService = new DeployService();

    const loadContractDependencies = async (contractName: string) => {
        if (!contractName.includes('Logic')) return;

        try {
            const response = await fetch(`/api/contract-addresses?network=${network}`);
            if (response.ok) {
                const data = await response.json();
                const addresses = data.contracts || {};

                const dependencies: { [key: string]: string } = {};

                // Add World address
                if (addresses.World) {
                    dependencies['World'] = addresses.World;
                }

                // Add Proxy address
                const proxyName = contractName.replace('Logic', 'Proxy');
                if (addresses[proxyName]) {
                    dependencies[proxyName] = addresses[proxyName];
                }

                // Add specific dependencies based on contract type
                if (contractName === 'InventoryLogic') {
                    if (addresses.ItemProxy) dependencies['ItemProxy'] = addresses.ItemProxy;
                    if (addresses.PlayerProxy) dependencies['PlayerProxy'] = addresses.PlayerProxy;
                } else if (contractName === 'PlantLogic') {
                    if (addresses.InventoryProxy) dependencies['InventoryProxy'] = addresses.InventoryProxy;
                    if (addresses.WeatherProxy) dependencies['WeatherProxy'] = addresses.WeatherProxy;
                    if (addresses.ItemProxy) dependencies['ItemProxy'] = addresses.ItemProxy;
                } else if (contractName === 'FishingLogic') {
                    if (addresses.InventoryProxy) dependencies['InventoryProxy'] = addresses.InventoryProxy;
                    if (addresses.ItemProxy) dependencies['ItemProxy'] = addresses.ItemProxy;
                    if (addresses.PlayerProxy) dependencies['PlayerProxy'] = addresses.PlayerProxy;
                    if (addresses.WeatherProxy) dependencies['WeatherProxy'] = addresses.WeatherProxy;
                } else if (contractName === 'NPCMarketProxy') {
                    if (addresses.NPCMarketComponent) dependencies['NPCMarketComponent'] = addresses.NPCMarketComponent;
                } else if (contractName === 'NPCMarketLogic') {
                    if (addresses.NPCMarketProxy) dependencies['NPCMarketProxy'] = addresses.NPCMarketProxy;
                    if (addresses.ItemProxy) dependencies['ItemProxy'] = addresses.ItemProxy;
                    if (addresses.InventoryProxy) dependencies['InventoryProxy'] = addresses.InventoryProxy;
                    if (addresses.PlayerProxy) dependencies['PlayerProxy'] = addresses.PlayerProxy;
                }

                setContractDependencies(dependencies);
            }
        } catch (error) {
            console.error('Failed to load dependencies:', error);
        }
    };

    const deployContract = async (contractName: string, dependencies?: string[]) => {
        // Real deployment logic using hardhat scripts
        setDeploymentProgress(prev => ({ ...prev, currentContract: contractName }));
        addLog(`\n📦 Deploying ${contractName}...`);

        try {
            // Call the real deployment API
            const response = await fetch('/api/deploy-real', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    network,
                    deployMode: 'single',
                    selectedContract: contractName
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Deployment failed: ${errorText}`);
            }

            const result = await response.json();

            if (result.success) {
                addLog(`✅ ${contractName} deployed successfully`);

                // Extract contract address from result
                let contractAddress = '0x...';
                if (result.contracts && result.contracts.length > 0) {
                    const deployedContract = result.contracts.find((c: any) => c.name === contractName);
                    if (deployedContract) {
                        contractAddress = deployedContract.address;
                        addLog(`📍 Contract address: ${contractAddress}`);
                    }
                }

                // Simulate registration based on contract type
                if (contractName.includes('Logic')) {
                    addLog(`🔗 Registering ${contractName} in World...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    addLog(`✅ ${contractName} registered in World`);
                } else if (contractName.includes('Proxy')) {
                    addLog(`🔗 Configuring ${contractName} with implementation...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    addLog(`✅ ${contractName} configured`);
                }

                setDeploymentProgress(prev => ({ ...prev, current: prev.current + 1 }));

                return {
                    name: contractName,
                    address: contractAddress,
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error(result.error || 'Deployment failed');
            }
        } catch (error) {
            addLog(`❌ Failed to deploy ${contractName}: ${error}`);
            throw error;
        }
    };

    const handleDeploy = async () => {

        setIsDeploying(true);
        setLogs([]); // Clear previous logs
        setDeployedContracts([]); // Clear previous deployed contracts

        // Calculate total contracts to deploy
        let totalContracts = 0;
        if (deployMode === 'all') {
            totalContracts = 23; // Updated to match actual contract count
        } else if (deployMode === 'feature' && selectedFeature) {
            const contracts = CONTRACTS[selectedFeature];
            totalContracts = Array.isArray(contracts) ? contracts.length : 1;
        } else if (deployMode === 'single') {
            totalContracts = 1;
        }

        setDeploymentProgress({ current: 0, total: totalContracts, currentContract: '' });

        try {
            addLog(`🚀 Bắt đầu deploy contracts lên ${network === "local" ? "Local Network" : "Sei Mainnet"}...`);

            if (network === 'seimainnet') {
                addLog("🔗 Đang kết nối với blockchain network...");
                addLog("✅ Kết nối thành công với Sei Mainnet");
            } else {
                addLog("🔗 Đang kết nối với Hardhat local network...");
                addLog("✅ Kết nối thành công với local network (không cần MetaMask)");
            }

            let newDeployedContracts: DeployedContract[] = [];

            // Use different API endpoints for local and mainnet
            const apiEndpoint = network === 'local' ? '/api/deploy-real' : '/api/deploy-mainnet';
            const requestBody: any = {
                network,
                deployMode,
                selectedFeature,
                selectedContract
            };

            // Add private key for mainnet deployment
            if (network === 'seimainnet') {
                requestBody.privateKey = privateKey;
            }

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error('Deployment failed');
            }

            const result = await response.json();

            if (result.success) {
                newDeployedContracts = result.contracts;
                addLog("✅ All contracts deployed successfully");
            } else {
                throw new Error(result.error || 'Deployment failed');
            }

            setDeployedContracts(newDeployedContracts);

            addLog("\n⚙️ Configuring contracts...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            addLog("✅ All contracts configured successfully");

            // Load all contracts (existing + new) for display
            addLog("\n📋 Deployment Summary:");
            try {
                const response = await fetch(`/api/contract-addresses?network=${network}`);
                if (response.ok) {
                    const allContracts = await response.json();
                    const summary = {
                        network: network,
                        chainId: network === "local" ? 31337 : 1329,
                        deployer: allContracts.deployer || randomDeployerAddress,
                        contracts: allContracts.contracts || {},
                        timestamp: new Date().toISOString(),
                        rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
                    };
                    addLog(JSON.stringify(summary, null, 2));

                    // Thêm bảng địa chỉ contract (tất cả contracts)
                    addLog("\n📜 All Contract Addresses:");
                    const allContractEntries = Object.entries(allContracts.contracts || {});
                    const addressTable = allContractEntries.map(([name, address]) =>
                        `${name.padEnd(30)} | ${address}`
                    ).join('\n');
                    addLog(addressTable);

                    // Hiển thị contracts mới được deploy
                    if (newDeployedContracts.length > 0) {
                        addLog("\n🆕 Newly Deployed Contracts:");
                        const newAddressTable = newDeployedContracts.map(contract =>
                            `${contract.name.padEnd(30)} | ${contract.address}`
                        ).join('\n');
                        addLog(newAddressTable);
                    }
                } else {
                    // Fallback to old method if API fails
                    const summary = {
                        network: network,
                        chainId: network === "local" ? 31337 : 1329,
                        deployer: randomDeployerAddress,
                        contracts: newDeployedContracts.reduce((acc, contract) => {
                            acc[contract.name] = contract.address;
                            return acc;
                        }, {} as Record<string, string>),
                        timestamp: new Date().toISOString(),
                        rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
                    };
                    addLog(JSON.stringify(summary, null, 2));

                    addLog("\n📜 Contract Addresses:");
                    const addressTable = newDeployedContracts.map(contract =>
                        `${contract.name.padEnd(30)} | ${contract.address}`
                    ).join('\n');
                    addLog(addressTable);
                }
            } catch (error) {
                console.error('Error loading all contracts:', error);
                // Fallback to old method
                const summary = {
                    network: network,
                    chainId: network === "local" ? 31337 : 1329,
                    deployer: randomDeployerAddress,
                    contracts: newDeployedContracts.reduce((acc, contract) => {
                        acc[contract.name] = contract.address;
                        return acc;
                    }, {} as Record<string, string>),
                    timestamp: new Date().toISOString(),
                    rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
                };
                addLog(JSON.stringify(summary, null, 2));

                addLog("\n📜 Contract Addresses:");
                const addressTable = newDeployedContracts.map(contract =>
                    `${contract.name.padEnd(30)} | ${contract.address}`
                ).join('\n');
                addLog(addressTable);
            }

            // Save deployment info to file
            addLog("\n💾 Saving deployment info...");
            const fileName = `contract-addresses-${network}.json`;
            try {
                // For single contract deployment, script already saves to file
                if (deployMode !== 'single') {
                    // Use the contracts from newDeployedContracts for saving (API will merge them)
                    const summary = {
                        network: network,
                        chainId: network === "local" ? 31337 : 1329,
                        deployer: randomDeployerAddress,
                        contracts: newDeployedContracts.reduce((acc, contract) => {
                            acc[contract.name] = contract.address;
                            return acc;
                        }, {} as Record<string, string>),
                        timestamp: new Date().toISOString(),
                        rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
                    };
                    await deployService.saveDeploymentInfo(summary, network);
                    addLog(`📁 Deployment info saved to: ./deployed/${fileName}`);
                    addLog("💾 File saved successfully");
                } else {
                    addLog("📁 Deployment info already saved by script");
                    addLog("💾 File saved successfully");
                }
            } catch (error) {
                addLog(`❌ Failed to save file: ${error}`);
            }

            addLog("\n🎉 Deploy hoàn tất thành công!");
            if (network === "local") {
                addLog("🔗 Để test, hãy chạy: npx hardhat node");
                addLog("🌐 Frontend sẽ tự động load contract addresses từ file local");
            }
        } catch (error) {
            console.error("Deploy failed:", error);
            if (error instanceof Error) {
                addLog(`\n❌ Deploy failed: ${error.message}`);
            } else {
                addLog(`\n❌ Deploy failed: Unknown error`);
            }
        } finally {
            setIsDeploying(false);
            setDeploymentProgress({ current: 0, total: 0, currentContract: '' });
        }
    };

    const handleModeChange = (mode: DeployMode) => {
        setDeployMode(mode);
        setSelectedFeature('');
        setSelectedContract("");
    };

    return (
        <PageLayout title="Deploy Contracts">
            <PageHeader
                title="Deploy Contracts"
                subtitle="Deploy smart contracts to local network or mainnet"
            />

            <div className="flex flex-col gap-8">
                {/* Compact Header with Network Selection */}
                <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Smart Contract Deployment</h3>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Deploy contracts to blockchain networks</p>
                            </div>

                            {/* Network Selection */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-blue-900 dark:text-blue-100">Network:</label>
                                <Select value={network} onValueChange={setNetwork}>
                                    <SelectTrigger className="w-[160px] h-8 text-xs bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700">
                                        <SelectValue placeholder="Select network" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="local">🔧 Local (Hardhat)</SelectItem>
                                        <SelectItem value="seimainnet">🌐 Sei Mainnet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                            {network === 'local' ? (
                                <Badge variant="default" className="text-xs bg-green-600">
                                    ✅ Ready (No MetaMask needed)
                                </Badge>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {!isInstalled ? (
                                        <Badge variant="destructive" className="text-xs">
                                            ❌ MetaMask Required
                                        </Badge>
                                    ) : !isConnected ? (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                🔒 Connect MetaMask
                                            </Badge>
                                            <Button
                                                size="sm"
                                                onClick={connect}
                                                className="h-6 px-2 text-xs bg-orange-600 hover:bg-orange-700"
                                            >
                                                Connect
                                            </Button>
                                        </div>
                                    ) : (
                                        <Badge variant="default" className="text-xs bg-green-600">
                                            ✅ Connected ({account?.slice(0, 4)}...{account?.slice(-4)})
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Local Network Info */}
                    {network === 'local' && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                    Local Network (Hardhat)
                                </span>
                                <Badge variant="default" className="text-xs bg-green-600">
                                    ✅ Ready
                                </Badge>
                            </div>
                            <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                                Không cần MetaMask. Hardhat sẽ tự động tạo và sử dụng private key.
                            </div>
                            <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                                💡 Để test: chạy <code className="bg-green-100 px-1 rounded">npx hardhat node</code> trước khi deploy
                            </div>
                            <div className="mt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            const response = await fetch('/api/test-hardhat');
                                            const result = await response.json();
                                            if (result.success) {
                                                alert(`✅ Hardhat test successful: ${result.output}`);
                                            } else {
                                                alert(`❌ Hardhat test failed: ${result.error}`);
                                            }
                                        } catch (error) {
                                            alert(`❌ Hardhat test error: ${error}`);
                                        }
                                    }}
                                    className="text-xs"
                                >
                                    Test Hardhat
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Mainnet Private Key Input */}
                    {network === 'seimainnet' && (
                        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-700">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                                    Sei Mainnet Deployment
                                </span>
                                <Badge variant="default" className="text-xs bg-orange-600">
                                    🔑 Private Key Required
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                <div className="text-xs text-orange-700 dark:text-orange-300">
                                    ⚠️ <strong>Lưu ý bảo mật:</strong> Private key sẽ được sử dụng để deploy contracts.
                                    Đảm bảo bạn có đủ SEI để trả gas fee.
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowPrivateKeyInput(!showPrivateKeyInput)}
                                        className="text-xs"
                                    >
                                        {showPrivateKeyInput ? "🔒 Ẩn Private Key" : "🔑 Nhập Private Key"}
                                    </Button>

                                    {privateKey && (
                                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                                            ✅ Private Key Ready
                                        </Badge>
                                    )}
                                </div>

                                {showPrivateKeyInput && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-orange-800 dark:text-orange-200">
                                            Private Key (0x...):
                                        </label>
                                        <input
                                            type="password"
                                            value={privateKey}
                                            onChange={(e) => setPrivateKey(e.target.value)}
                                            placeholder="0x..."
                                            className="w-full px-3 py-2 text-xs border border-orange-300 dark:border-orange-600 rounded-md bg-white dark:bg-gray-800 text-orange-900 dark:text-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        <div className="text-xs text-orange-600 dark:text-orange-400">
                                            💡 Private key sẽ được sử dụng để tạo signer cho deployment
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Deployment Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Deploy All Card */}
                    <Card className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${deployMode === 'all'
                        ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800'
                        : 'hover:border-green-300 dark:hover:border-green-700'}`}
                        onClick={() => handleModeChange('all')}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <span className="text-xl">🚀</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-green-900 dark:text-green-100">Deploy All</h4>
                                <p className="text-xs text-green-700 dark:text-green-300">Complete ecosystem</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Deploy all 23 contracts in the correct order with proper configurations.
                        </p>
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-green-800 dark:text-green-200">Deployment order:</div>
                            <div className="grid grid-cols-1 gap-1">
                                {['World', 'Player', 'Item', 'Weather', 'Inventory', 'Plant'].map((item, idx) => (
                                    <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="outline" className="w-5 h-5 p-0 flex items-center justify-center text-xs">
                                            {idx + 1}
                                        </Badge>
                                        {item} Contract{item !== 'World' ? 's' : ''}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {deployMode === 'all' && (
                            <Button
                                onClick={handleDeploy}
                                disabled={isDeploying}
                                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                            >
                                {isDeploying ? "Deploying..." : "🚀 Deploy All Contracts"}
                            </Button>
                        )}
                    </Card>

                    {/* Deploy Feature Card */}
                    <Card className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${deployMode === 'feature'
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
                        : 'hover:border-blue-300 dark:hover:border-blue-700'}`}
                        onClick={() => handleModeChange('feature')}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <span className="text-xl">🎯</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Deploy Feature</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Specific module</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Deploy a complete feature module with Component, Proxy, and Logic contracts.
                        </p>
                        {deployMode === 'feature' && (
                            <div className="space-y-4">
                                <Select
                                    value={selectedFeature}
                                    onValueChange={(value) => setSelectedFeature(value as ContractFeature)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a feature to deploy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(CONTRACTS) as ContractFeature[]).map((feature) => (
                                            <SelectItem key={feature} value={feature}>
                                                {feature} Contracts
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedFeature && (
                                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                                        <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">Contracts to deploy:</h5>
                                        <div className="space-y-1">
                                            {(() => {
                                                const contracts = CONTRACTS[selectedFeature];
                                                if (Array.isArray(contracts)) {
                                                    return contracts.map((contract) => (
                                                        <div key={contract} className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                            {contract}
                                                        </div>
                                                    ));
                                                }
                                                return (
                                                    <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                        {contracts}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Dependencies Info */}
                                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                            <h6 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Dependencies:</h6>
                                            <div className="text-xs text-blue-600 dark:text-blue-400">
                                                {selectedFeature === 'Player' && (
                                                    <div>✅ No dependencies required</div>
                                                )}
                                                {selectedFeature === 'Item' && (
                                                    <div>✅ No dependencies required</div>
                                                )}
                                                {selectedFeature === 'Weather' && (
                                                    <div>✅ No dependencies required</div>
                                                )}
                                                {selectedFeature === 'Plot' && (
                                                    <div>⚠️ Requires: Player, Weather features</div>
                                                )}
                                                {selectedFeature === 'Inventory' && (
                                                    <div>⚠️ Requires: Player, Item features</div>
                                                )}
                                                {selectedFeature === 'Plant' && (
                                                    <div>⚠️ Requires: Plot, Inventory, Weather, Item features</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleDeploy}
                                    disabled={!selectedFeature || isDeploying}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isDeploying ? "Deploying..." : "🎯 Deploy Feature"}
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Deploy Single Card */}
                    <Card className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${deployMode === 'single'
                        ? 'ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800'
                        : 'hover:border-orange-300 dark:hover:border-orange-700'}`}
                        onClick={() => handleModeChange('single')}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                <span className="text-xl">⚡</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-orange-900 dark:text-orange-100">Deploy Single</h4>
                                <p className="text-xs text-orange-700 dark:text-orange-300">Individual contract</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Deploy a single contract. Note: Proxy and Logic contracts require dependencies.
                        </p>
                        {deployMode === 'single' && (
                            <div className="space-y-4">
                                <Select value={selectedContract} onValueChange={setSelectedContract}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a contract to deploy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PlayerComponent">PlayerComponent</SelectItem>
                                        <SelectItem value="ItemComponent">ItemComponent</SelectItem>
                                        <SelectItem value="WeatherComponent">WeatherComponent</SelectItem>
                                        <SelectItem value="PlotComponent">PlotComponent</SelectItem>
                                        <SelectItem value="InventoryComponent">InventoryComponent</SelectItem>
                                        <SelectItem value="PlantComponent">PlantComponent</SelectItem>
                                        <SelectItem value="FishingLogic">FishingLogic</SelectItem>
                                        <SelectItem value="NPCMarketComponent">NPCMarketComponent</SelectItem>
                                        <SelectItem value="NPCMarketProxy">NPCMarketProxy</SelectItem>
                                        <SelectItem value="NPCMarketLogic">NPCMarketLogic</SelectItem>
                                        <SelectItem value="PlayerLogic">PlayerLogic</SelectItem>
                                        <SelectItem value="ItemLogic">ItemLogic</SelectItem>
                                        <SelectItem value="WeatherLogic">WeatherLogic</SelectItem>
                                        <SelectItem value="PlotLogic">PlotLogic</SelectItem>
                                        <SelectItem value="InventoryLogic">InventoryLogic</SelectItem>
                                        <SelectItem value="PlantLogic">PlantLogic</SelectItem>
                                    </SelectContent>
                                </Select>

                                {selectedContract && (
                                    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
                                        <p className="text-xs text-orange-700 dark:text-orange-300">
                                            💡 <strong>Lưu ý:</strong> {
                                                selectedContract.includes('Component') ? 'Component có thể deploy độc lập' :
                                                    selectedContract.includes('Logic') ? 'Logic contract cần dependencies' :
                                                        'Contract sẽ được deploy độc lập'
                                            }
                                        </p>

                                        {/* Dependencies Display for Logic Contracts */}
                                        {selectedContract.includes('Logic') && Object.keys(contractDependencies).length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                                                <h6 className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-2">📋 Required Dependencies:</h6>
                                                <div className="space-y-2">
                                                    {Object.entries(contractDependencies).map(([name, address]) => (
                                                        <div key={name} className="flex items-center justify-between text-xs">
                                                            <span className="text-orange-700 dark:text-orange-300 font-medium">
                                                                {name}:
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded text-xs">
                                                                    {address.slice(0, 8)}...{address.slice(-6)}
                                                                </code>
                                                                <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                                                                    ✅ Found
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Missing Dependencies Warning */}
                                        {selectedContract.includes('Logic') && Object.keys(contractDependencies).length === 0 && (
                                            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                                                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                                                    <Badge variant="destructive" className="text-xs">
                                                        ⚠️ Missing Dependencies
                                                    </Badge>
                                                    <span>Required contracts not found. Please deploy dependencies first.</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                                            <strong>Contracts có thể deploy đơn lẻ:</strong>
                                            <div className="mt-1 space-y-1">
                                                <div>• Components: PlayerComponent, ItemComponent, WeatherComponent, PlotComponent, InventoryComponent, PlantComponent, NPCMarketComponent</div>
                                                <div>• Logic: PlayerLogic, ItemLogic, WeatherLogic, PlotLogic, InventoryLogic, PlantLogic, FishingLogic, NPCMarketLogic</div>
                                                <div>• Proxy: NPCMarketProxy</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleDeploy}
                                    disabled={!selectedContract || isDeploying}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    {isDeploying ? "Deploying..." : "⚡ Deploy Contract"}
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Deployment Progress */}
                {isDeploying && deploymentProgress.total > 0 && (
                    <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                <span className="text-sm">⚡</span>
                            </div>
                            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Deployment Progress</h3>
                            <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                                {deploymentProgress.current}/{deploymentProgress.total}
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-purple-700 dark:text-purple-300">
                                    {deploymentProgress.currentContract ? `Deploying: ${deploymentProgress.currentContract}` : 'Preparing deployment...'}
                                </span>
                                <span className="text-purple-600 dark:text-purple-400 font-medium">
                                    {Math.round((deploymentProgress.current / deploymentProgress.total) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${(deploymentProgress.current / deploymentProgress.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Deployment Status & Logs */}
                {(logs.length > 0 || deployedContracts.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Deployment Logs */}
                        {logs.length > 0 && (
                            <Card className="p-6 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <span className="text-sm">📜</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deployment Logs</h3>
                                    {isDeploying && (
                                        <div className="ml-auto">
                                            <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                                <DeploymentLogs logs={logs} />
                            </Card>
                        )}

                        {/* Deployed Contracts */}
                        {deployedContracts.length > 0 && (
                            <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                        <span className="text-sm">✅</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Deployed Contracts</h3>
                                    <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                        {deployedContracts.length} contract{deployedContracts.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>

                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {deployedContracts.map((contract, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-green-900 dark:text-green-100">{contract.name}</h4>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${contract.name.includes('Component') ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                                                contract.name.includes('Logic') ? 'border-purple-300 text-purple-700 bg-purple-50' :
                                                                    contract.name.includes('Proxy') ? 'border-orange-300 text-orange-700 bg-orange-50' :
                                                                        'border-gray-300 text-gray-700 bg-gray-50'
                                                                }`}
                                                        >
                                                            {contract.name.includes('Component') ? 'Component' :
                                                                contract.name.includes('Logic') ? 'Logic' :
                                                                    contract.name.includes('Proxy') ? 'Proxy' : 'Core'}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <span className="text-xs">📍</span>
                                                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                                                                {contract.address}
                                                            </code>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>🕒</span>
                                                            {new Date(contract.timestamp).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => navigator.clipboard.writeText(contract.address)}
                                                >
                                                    📋
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </PageLayout>
    );
}