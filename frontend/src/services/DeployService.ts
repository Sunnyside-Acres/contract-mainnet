import { ethers } from 'ethers';

export interface DeployConfig {
    network: 'local' | 'seimainnet';
    deployMode: 'all' | 'feature' | 'single';
    selectedFeature?: string;
    selectedContract?: string;
}

export interface DeployedContract {
    name: string;
    address: string;
    timestamp: string;
}

export interface DeploymentResult {
    success: boolean;
    contracts: DeployedContract[];
    summary: any;
    error?: string;
}

export class DeployService {
    private provider: ethers.providers.Provider | null = null;
    private signer: ethers.Signer | null = null;

    constructor() { }

    async initialize(network: 'local' | 'seimainnet') {
        try {
            if (network === 'local') {
                this.provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
            } else {
                this.provider = new ethers.providers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
            }

            // Check if MetaMask is available
            if (typeof window !== 'undefined' && window.ethereum) {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
            } else {
                throw new Error('MetaMask không được tìm thấy. Vui lòng cài đặt MetaMask.');
            }

            return true;
        } catch (error) {
            console.error('Không thể khởi tạo DeployService:', error);
            throw error;
        }
    }

    async deployContract(contractName: string, constructorArgs: any[] = []): Promise<DeployedContract> {
        if (!this.signer) {
            throw new Error('Signer chưa được khởi tạo');
        }

        try {
            // Trong thực tế, bạn sẽ cần load contract artifacts từ hardhat
            // Đây là một implementation mô phỏng
            const contractFactory = new ethers.ContractFactory(
                [], // ABI sẽ được load từ artifacts
                '', // Bytecode sẽ được load từ artifacts
                this.signer
            );

            const contract = await contractFactory.deploy(...constructorArgs);
            await contract.waitForDeployment();
            const address = await contract.getAddress();

            return {
                name: contractName,
                address: address,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Lỗi khi deploy ${contractName}:`, error);
            throw error;
        }
    }

    async deployAllContracts(): Promise<DeploymentResult> {
        try {
            // Use the real deployment API
            const response = await fetch('/api/deploy-real', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    network: 'local',
                    deployMode: 'all'
                }),
            });

            if (!response.ok) {
                throw new Error('Deployment failed');
            }

            const result = await response.json();

            if (result.success) {
                // Parse the deployment output to extract contract addresses
                const contracts = this.parseDeploymentOutput(result.output);

                const summary = {
                    network: 'local',
                    chainId: 31337,
                    deployer: '0x...', // Will be extracted from output
                    contracts: contracts.reduce((acc, contract) => {
                        acc[contract.name] = contract.address;
                        return acc;
                    }, {} as Record<string, string>),
                    timestamp: new Date().toISOString(),
                    rpcUrl: 'http://127.0.0.1:8545'
                };

                return {
                    success: true,
                    contracts,
                    summary
                };
            } else {
                throw new Error(result.error || 'Deployment failed');
            }
        } catch (error) {
            return {
                success: false,
                contracts: [],
                summary: {},
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private parseDeploymentOutput(output: string): DeployedContract[] {
        const contracts: DeployedContract[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            if (line.includes('deployed to:')) {
                const match = line.match(/(\w+) deployed to: (0x[a-fA-F0-9]{40})/);
                if (match) {
                    contracts.push({
                        name: match[1],
                        address: match[2],
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        return contracts;
    }

    async deployFeature(feature: string): Promise<DeploymentResult> {
        const contracts: DeployedContract[] = [];

        try {
            // Deploy feature-specific contracts
            const featureContracts = this.getFeatureContracts(feature);

            for (const contractName of featureContracts) {
                const contract = await this.deployContract(contractName);
                contracts.push(contract);
            }

            const summary = {
                network: 'local',
                chainId: 31337,
                deployer: await this.signer!.getAddress(),
                contracts: contracts.reduce((acc, contract) => {
                    acc[contract.name] = contract.address;
                    return acc;
                }, {} as Record<string, string>),
                timestamp: new Date().toISOString(),
                rpcUrl: 'http://127.0.0.1:8545'
            };

            return {
                success: true,
                contracts,
                summary
            };
        } catch (error) {
            return {
                success: false,
                contracts,
                summary: {},
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async deploySingle(contractName: string): Promise<DeploymentResult> {
        const contracts: DeployedContract[] = [];

        try {
            const contract = await this.deployContract(contractName);
            contracts.push(contract);

            const summary = {
                network: 'local',
                chainId: 31337,
                deployer: await this.signer!.getAddress(),
                contracts: contracts.reduce((acc, contract) => {
                    acc[contract.name] = contract.address;
                    return acc;
                }, {} as Record<string, string>),
                timestamp: new Date().toISOString(),
                rpcUrl: 'http://127.0.0.1:8545'
            };

            return {
                success: true,
                contracts,
                summary
            };
        } catch (error) {
            return {
                success: false,
                contracts,
                summary: {},
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private getFeatureContracts(feature: string): string[] {
        const contractMap: Record<string, string[]> = {
            'Player': ['PlayerComponent', 'PlayerLogic', 'PlayerProxy'],
            'Item': ['ItemComponent', 'ItemLogic', 'ItemProxy'],
            'Weather': ['WeatherComponent', 'WeatherLogic', 'WeatherProxy'],
            'Plot': ['PlotComponent', 'PlotLogic', 'PlotProxy'],
            'Inventory': ['InventoryComponent', 'InventoryLogic', 'InventoryProxy'],
            'Plant': ['PlantComponent', 'PlantLogic', 'PlantProxy']
        };

        return contractMap[feature] || [];
    }

    async saveDeploymentInfo(summary: any, network: string) {
        try {
            const response = await fetch('/api/contract-addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    network,
                    deploymentInfo: summary
                }),
            });

            if (!response.ok) {
                throw new Error('Không thể lưu thông tin deployment');
            }

            return true;
        } catch (error) {
            console.error('Lỗi khi lưu deployment info:', error);
            throw error;
        }
    }
}
