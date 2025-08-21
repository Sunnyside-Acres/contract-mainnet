import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        console.log('Testing Hardhat...');

        // Test hardhat version
        const result = await new Promise((resolve, reject) => {
            const child = spawn('npx', ['hardhat', '--version'], {
                cwd: path.join(process.cwd(), '..'),
                stdio: ['pipe', 'pipe', 'pipe']
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
                if (code === 0) {
                    resolve({ success: true, output: stdout });
                } else {
                    reject({ success: false, error: stderr, code });
                }
            });

            child.on('error', (error) => {
                reject({ success: false, error: error.message });
            });
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Hardhat test failed:', error);
        return NextResponse.json(
            { error: 'Hardhat test failed', details: error },
            { status: 500 }
        );
    }
}
