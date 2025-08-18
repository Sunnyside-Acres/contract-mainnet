"use client";

import { PageHeader } from "@/components/PageHeader";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeploymentLogs } from "@/components/DeploymentLogs";
import { useState } from "react";

type ContractFeature = 'World' | 'Player' | 'Item' | 'Weather' | 'Plot' | 'Inventory' | 'Plant';

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
    Plot: ["PlotComponent", "PlotLogic", "PlotProxy"],
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

export default function DeployPage() {
    const [network, setNetwork] = useState("local");
    const [selectedFeature, setSelectedFeature] = useState<ContractFeature | ''>('');
    const [selectedContract, setSelectedContract] = useState("");
    const [isDeploying, setIsDeploying] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [deployMode, setDeployMode] = useState<DeployMode>('all');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
    const [deploymentProgress, setDeploymentProgress] = useState({ current: 0, total: 0, currentContract: '' });

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]);
    };

    const deployContract = async (contractName: string, dependencies?: string[]) => {
        const address = generateRandomAddress();
        setDeploymentProgress(prev => ({ ...prev, currentContract: contractName }));
        addLog(`\n📦 Deploying ${contractName}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        addLog(`✅ ${contractName} deployed to: ${address}`);

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
            address: address,
            timestamp: new Date().toISOString()
        };
    };

    const handleDeploy = async () => {
        setIsDeploying(true);
        setLogs([]); // Clear previous logs
        setDeployedContracts([]); // Clear previous deployed contracts

        // Calculate total contracts to deploy
        let totalContracts = 0;
        if (deployMode === 'all') {
            totalContracts = 19; // 1 World + 6 features × 3 contracts each
        } else if (deployMode === 'feature' && selectedFeature) {
            const contracts = CONTRACTS[selectedFeature];
            totalContracts = Array.isArray(contracts) ? contracts.length : 1;
        } else if (deployMode === 'single') {
            totalContracts = 1;
        }

        setDeploymentProgress({ current: 0, total: totalContracts, currentContract: '' });

        try {
            addLog(`🚀 Bắt đầu deploy contracts lên ${network === "local" ? "Local Network" : "Sei Mainnet"}...`);
            addLog("📝 Đang kết nối với network...");
            await new Promise(resolve => setTimeout(resolve, 1000));

            let newDeployedContracts: DeployedContract[] = [];

            if (deployMode === 'feature' && selectedFeature) {
                const contracts = CONTRACTS[selectedFeature];
                if (Array.isArray(contracts)) {
                    // Deploy in order: Component -> Proxy -> Logic
                    const orderedContracts = contracts.sort((a, b) => {
                        const order = ['Component', 'Proxy', 'Logic'];
                        const aIndex = order.findIndex(type => a.includes(type));
                        const bIndex = order.findIndex(type => b.includes(type));
                        return aIndex - bIndex;
                    });

                    for (const contract of orderedContracts) {
                        const deployedContract = await deployContract(contract);
                        newDeployedContracts.push(deployedContract);
                    }

                    // Additional registration for complete feature deployment
                    addLog(`\n⚙️ Configuring ${selectedFeature} feature...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    addLog(`✅ ${selectedFeature} feature configured successfully`);
                } else {
                    const deployedContract = await deployContract(contracts);
                    newDeployedContracts.push(deployedContract);
                }
            } else if (deployMode === 'single' && selectedContract) {
                const deployedContract = await deployContract(selectedContract);
                newDeployedContracts.push(deployedContract);

                // Show registration instructions for single contract deployment
                if (selectedContract.includes('Component')) {
                    addLog(`\n💡 Lưu ý: Component cần được đăng ký với Proxy tương ứng`);
                } else if (selectedContract.includes('Logic')) {
                    addLog(`\n💡 Lưu ý: Logic contract cần được đăng ký với World contract`);
                }
            } else {
                // Deploy all contracts in order
                // First deploy World
                const worldContract = await deployContract(CONTRACTS.World as string);
                newDeployedContracts.push(worldContract);

                // Then deploy other contracts in order (following script order)
                const features: ContractFeature[] = ['Player', 'Item', 'Weather', 'Plot', 'Inventory', 'Plant'];
                for (const feature of features) {
                    const contracts = CONTRACTS[feature];
                    if (Array.isArray(contracts)) {
                        // Deploy in order: Component -> Proxy -> Logic
                        const orderedContracts = contracts.sort((a, b) => {
                            const order = ['Component', 'Proxy', 'Logic'];
                            const aIndex = order.findIndex(type => a.includes(type));
                            const bIndex = order.findIndex(type => b.includes(type));
                            return aIndex - bIndex;
                        });

                        for (const contract of orderedContracts) {
                            const deployedContract = await deployContract(contract);
                            newDeployedContracts.push(deployedContract);
                        }
                    }
                }
            }

            setDeployedContracts(newDeployedContracts);

            addLog("\n⚙️ Configuring contracts...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            addLog("✅ All contracts configured successfully");

            addLog("\n📋 Deployment Summary:");
            const summary = {
                network: network,
                chainId: network === "local" ? 31337 : 1329,
                deployer: "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                contracts: newDeployedContracts.reduce((acc, contract) => {
                    acc[contract.name] = contract.address;
                    return acc;
                }, {} as Record<string, string>),
                timestamp: new Date().toISOString(),
                rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
            };
            addLog(JSON.stringify(summary, null, 2));

            // Thêm bảng địa chỉ contract
            addLog("\n📜 Contract Addresses:");
            const addressTable = newDeployedContracts.map(contract =>
                `${contract.name.padEnd(30)} | ${contract.address}`
            ).join('\n');
            addLog(addressTable);

            // Save deployment info to file
            addLog("\n💾 Saving deployment info...");
            const fileName = `contract-addresses-${network}.json`;
            try {
                // In a real application, this would make an API call to save the file
                addLog(`📁 Deployment info would be saved to: ./deployed/${fileName}`);
                addLog("💾 File saved successfully");
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
                {/* Header Card with Network Selection */}
                <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">Smart Contract Deployment</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Deploy contracts to blockchain networks</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-blue-900 dark:text-blue-100">Network:</label>
                            <Select value={network} onValueChange={setNetwork}>
                                <SelectTrigger className="w-[220px] bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700">
                                    <SelectValue placeholder="Select network" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="local">🔧 Local Network (Hardhat)</SelectItem>
                                    <SelectItem value="seimainnet">🌐 Sei Mainnet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
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
                            Deploy all 19 contracts in the correct order with proper configurations.
                        </p>
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-green-800 dark:text-green-200">Deployment order:</div>
                            <div className="grid grid-cols-1 gap-1">
                                {['World', 'Player', 'Item', 'Weather', 'Plot', 'Inventory', 'Plant'].map((item, idx) => (
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
                            Deploy a complete feature module with all its components.
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
                            Deploy a single contract for testing or gradual deployment.
                        </p>
                        {deployMode === 'single' && (
                            <div className="space-y-4">
                                <Select value={selectedContract} onValueChange={setSelectedContract}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a contract to deploy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CONTRACTS).flatMap(([feature, contracts]) => {
                                            if (Array.isArray(contracts)) {
                                                return contracts.map((contract) => (
                                                    <SelectItem key={contract} value={contract}>
                                                        {contract}
                                                    </SelectItem>
                                                ));
                                            }
                                            return [
                                                <SelectItem key={contracts} value={contracts}>
                                                    {contracts}
                                                </SelectItem>
                                            ];
                                        })}
                                    </SelectContent>
                                </Select>

                                {selectedContract && (
                                    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
                                        <p className="text-xs text-orange-700 dark:text-orange-300">
                                            💡 <strong>Lưu ý:</strong> {
                                                selectedContract.includes('Component') ? 'Component cần được đăng ký với Proxy tương ứng' :
                                                    selectedContract.includes('Logic') ? 'Logic contract cần được đăng ký với World contract' :
                                                        'Contract sẽ được deploy độc lập'
                                            }
                                        </p>
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