import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

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

        // Determine which script to run based on network and deploy mode
        let scriptPath: string;
        let env: NodeJS.ProcessEnv = { ...process.env };

        if (deployMode === 'single' && selectedContract) {
            // Deploy single contract
            scriptPath = path.join(process.cwd(), '..', 'script', 'deploy-single.js');
            env.CONTRACT_NAME = selectedContract;

            // Check if script exists
            if (!fs.existsSync(scriptPath)) {
                return NextResponse.json({
                    success: false,
                    error: `Script not found: ${scriptPath}`
                });
            }
        } else if (deployMode === 'feature' && selectedFeature) {
            // Deploy feature
            scriptPath = path.join(process.cwd(), '..', 'script', 'deploy-feature.js');
            env.FEATURE_NAME = selectedFeature;
        } else {
            // Deploy all contracts
            if (network === 'local') {
                scriptPath = path.join(process.cwd(), '..', 'script', 'deploy-local.js');
            } else {
                scriptPath = path.join(process.cwd(), '..', 'script', 'deploy.js');
            }
        }

        console.log(`Executing script: ${scriptPath} with env: ${JSON.stringify(env)}`);
        const result = await executeDeploymentScript(scriptPath, env);

        if (result.success) {
            // Parse deployment output to extract contract addresses
            const contracts = parseDeploymentOutput(result.output);

            const deploymentInfo = {
                network: network,
                chainId: network === "local" ? 31337 : 1329,
                deployer: "0x...", // Will be extracted from output
                contracts: contracts.reduce((acc, contract) => {
                    acc[contract.name] = contract.address;
                    return acc;
                }, {} as Record<string, string>),
                timestamp: new Date().toISOString(),
                rpcUrl: network === "local" ? "http://127.0.0.1:8545" : "https://evm-rpc.sei-apis.com"
            };

            // Only save deployment info for feature and all deployments
            // Single contract deployment already saves to file in the script
            if (deployMode !== 'single') {
                await saveDeploymentInfo(deploymentInfo, network);
            }

            return NextResponse.json({
                success: true,
                contracts,
                summary: deploymentInfo,
                output: result.output
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Real deployment error:', error);
        return NextResponse.json(
            { error: 'Lỗi trong quá trình deploy thực tế' },
            { status: 500 }
        );
    }
}

async function executeDeploymentScript(scriptPath: string, env: NodeJS.ProcessEnv): Promise<any> {
    return new Promise((resolve, reject) => {
        // For local network, use hardhat run
        // For mainnet, we would need to use a different approach with MetaMask integration
        const child = spawn('npx', ['hardhat', 'run', scriptPath], {
            cwd: path.join(process.cwd(), '..'),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: env
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            console.log(`Script execution completed with code: ${code}`);
            console.log(`Stdout: ${stdout}`);
            console.log(`Stderr: ${stderr}`);

            if (code === 0) {
                resolve({
                    success: true,
                    output: stdout,
                    message: 'Deployment completed successfully'
                });
            } else {
                reject({
                    success: false,
                    error: stderr || 'Deployment failed',
                    code
                });
            }
        });

        child.on('error', (error) => {
            reject({
                success: false,
                error: error.message
            });
        });
    });
}

function parseDeploymentOutput(output: string): any[] {
    const contracts: any[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
        // Tìm pattern: ✅ ContractName deployed to: 0x...
        if (line.includes('✅') && line.includes('deployed to:')) {
            const match = line.match(/✅ (\w+) deployed to: (0x[a-fA-F0-9]{40})/);
            if (match) {
                contracts.push({
                    name: match[1],
                    address: match[2],
                    timestamp: new Date().toISOString()
                });
            }
        }
        // Fallback: tìm pattern: ContractName deployed to: 0x...
        else if (line.includes('deployed to:') && !line.includes('✅')) {
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

async function saveDeploymentInfo(deploymentInfo: any, network: string) {
    try {
        const fileName = `contract-addresses-${network}.json`;
        const filePath = path.join(process.cwd(), '..', 'deployed', fileName);

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
