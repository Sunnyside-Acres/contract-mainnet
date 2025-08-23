import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { network, deployMode, selectedFeature, selectedContract } = body;

        // Validate request
        if (!network || !deployMode) {
            return NextResponse.json(
                { error: 'Thiếu thông tin network hoặc deployMode' },
                { status: 400 }
            );
        }

        // Simulate deployment process
        // In a real implementation, you would:
        // 1. Connect to the blockchain network
        // 2. Load contract artifacts
        // 3. Deploy contracts using hardhat
        // 4. Save deployment information

        const deploymentResult = await simulateDeployment(network, deployMode, selectedFeature, selectedContract);

        return NextResponse.json(deploymentResult);
    } catch (error) {
        console.error('Deployment error:', error);
        return NextResponse.json(
            { error: 'Lỗi trong quá trình deploy' },
            { status: 500 }
        );
    }
}

async function simulateDeployment(
    network: string,
    deployMode: string,
    selectedFeature?: string,
    selectedContract?: string
) {
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const deployerAddress = '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');

    let contracts: any[] = [];

    if (deployMode === 'all') {
        contracts = [
            { name: 'World', address: generateAddress() },
            { name: 'PlayerComponent', address: generateAddress() },
            { name: 'PlayerProxy', address: generateAddress() },
            { name: 'PlayerLogic', address: generateAddress() },
            { name: 'ItemComponent', address: generateAddress() },
            { name: 'ItemProxy', address: generateAddress() },
            { name: 'ItemLogic', address: generateAddress() },
            { name: 'WeatherComponent', address: generateAddress() },
            { name: 'WeatherProxy', address: generateAddress() },
            { name: 'WeatherLogic', address: generateAddress() },
            { name: 'PlotComponent', address: generateAddress() },
            { name: 'PlotProxy', address: generateAddress() },
            { name: 'PlotLogic', address: generateAddress() },
            { name: 'InventoryComponent', address: generateAddress() },
            { name: 'InventoryProxy', address: generateAddress() },
            { name: 'InventoryLogic', address: generateAddress() },
            { name: 'PlantComponent', address: generateAddress() },
            { name: 'PlantProxy', address: generateAddress() },
            { name: 'PlantLogic', address: generateAddress() },
            { name: 'FishingLogic', address: generateAddress() },
            { name: 'NPCMarketComponent', address: generateAddress() },
            { name: 'NPCMarketProxy', address: generateAddress() },
            { name: 'NPCMarketLogic', address: generateAddress() }
        ];
    } else if (deployMode === 'feature' && selectedFeature) {
        const featureContracts = getFeatureContracts(selectedFeature);
        contracts = featureContracts.map(name => ({
            name,
            address: generateAddress()
        }));
    } else if (deployMode === 'single' && selectedContract) {
        contracts = [{
            name: selectedContract,
            address: generateAddress()
        }];
    }

    const deploymentInfo = {
        network: network,
        chainId: network === "local" ? 31337 : 1329,
        deployer: deployerAddress,
        contracts: contracts.reduce((acc, contract) => {
            acc[contract.name] = contract.address;
            return acc;
        }, {} as Record<string, string>),
        timestamp: new Date().toISOString(),
        rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
    };

    // Save deployment info to file
    await saveDeploymentInfo(deploymentInfo, network);

    return {
        success: true,
        contracts: contracts.map(contract => ({
            name: contract.name,
            address: contract.address,
            timestamp: new Date().toISOString()
        })),
        summary: deploymentInfo
    };
}

function generateAddress(): string {
    return '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

function getFeatureContracts(feature: string): string[] {
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

async function saveDeploymentInfo(deploymentInfo: any, network: string) {
    try {
        const fileName = `contract-addresses-${network}.json`;
        const filePath = path.join(process.cwd(), 'deployed', fileName);

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Read existing deployment info if file exists
        let existingInfo = {
            network: network,
            chainId: network === "local" ? 31337 : 1329,
            deployer: deploymentInfo.deployer || "0x...",
            contracts: {},
            timestamp: new Date().toISOString(),
            rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
        };

        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                existingInfo = JSON.parse(fileContent);
            } catch (error) {
                console.warn('Error reading existing deployment info, creating new file:', error);
            }
        }

        // Merge new contracts with existing contracts
        const updatedInfo = {
            ...existingInfo,
            contracts: {
                ...existingInfo.contracts,
                ...deploymentInfo.contracts,
            },
            timestamp: new Date().toISOString(),
            deployer: deploymentInfo.deployer || existingInfo.deployer
        };

        fs.writeFileSync(filePath, JSON.stringify(updatedInfo, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving deployment info:', error);
        throw error;
    }
}
