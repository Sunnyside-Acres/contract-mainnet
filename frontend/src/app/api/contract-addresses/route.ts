
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { network, deploymentInfo } = body;

        if (!network || !deploymentInfo) {
            return NextResponse.json(
                { error: 'Thiếu thông tin network hoặc deploymentInfo' },
                { status: 400 }
            );
        }

        let fileName: string;

        // Map network names to file names
        if (network === 'hardhat' || network === '31337' || network === 'chain-31337' || network === 'localhost') {
            fileName = 'contract-addresses-localhost.json';
        } else if (network === 'seimainnet' || network === '1329' || network === 'chain-1329') {
            fileName = 'contract-addresses-seimainnet.json';
        } else if (network === 'seitestnet' || network === '1328' || network === 'chain-1328') {
            fileName = 'contract-addresses-seitestnet.json';
        } else {
            fileName = `contract-addresses-${network}.json`;
        }
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

        return NextResponse.json({
            success: true,
            message: `Deployment info saved to ${fileName}`,
            mergedContracts: Object.keys(deploymentInfo.contracts || {}).length
        });
    } catch (error) {
        console.error('Error saving contract addresses:', error);
        return NextResponse.json(
            { error: 'Lỗi khi lưu thông tin contract addresses' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const network = searchParams.get('network') || 'local';

        let fileName: string;

        // Map network names to file names
        if (network === 'hardhat' || network === '31337' || network === 'chain-31337' || network === 'localhost') {
            fileName = 'contract-addresses-localhost.json';
        } else if (network === 'seimainnet' || network === '1329' || network === 'chain-1329') {
            fileName = 'contract-addresses-seimainnet.json';
        } else if (network === 'seitestnet' || network === '1328' || network === 'chain-1328') {
            fileName = 'contract-addresses-seitestnet.json';
        } else {
            fileName = `contract-addresses-${network}.json`;
        }

        const filePath = path.join(process.cwd(), 'deployed', fileName);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { error: `Không tìm thấy file deployment info cho network: ${network}` },
                { status: 404 }
            );
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const deploymentInfo = JSON.parse(fileContent);

        return NextResponse.json(deploymentInfo);
    } catch (error) {
        console.error('Error reading contract addresses:', error);
        return NextResponse.json(
            { error: 'Lỗi khi đọc thông tin contract addresses' },
            { status: 500 }
        );
    }
}
