import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
    try {
        // Đường dẫn đến thư mục artifacts (từ thư mục gốc của project)
        const artifactsPath = join(process.cwd(), '..', 'artifacts', 'contracts')

        const artifacts: Record<string, any> = {}

        try {
            // Hàm đệ quy để đọc tất cả artifacts
            const readArtifactsRecursive = (dirPath: string) => {
                const items = readdirSync(dirPath, { withFileTypes: true })

                for (const item of items) {
                    const fullPath = join(dirPath, item.name)

                    if (item.isDirectory()) {
                        // Đọc đệ quy vào thư mục con
                        readArtifactsRecursive(fullPath)
                    } else if (item.isFile() && item.name.endsWith('.json') && !item.name.includes('.dbg.json')) {
                        // Đọc file artifact
                        try {
                            const artifactContent = readFileSync(fullPath, 'utf-8')
                            const artifact = JSON.parse(artifactContent)

                            // Lấy tên contract từ tên file (bỏ .json)
                            const contractName = item.name.replace('.json', '')

                            // Chỉ lấy những contract có ABI
                            if (artifact.abi && Array.isArray(artifact.abi)) {
                                artifacts[contractName] = {
                                    abi: artifact.abi,
                                    bytecode: artifact.bytecode,
                                    contractName: artifact.contractName
                                }
                            }
                        } catch (fileError) {
                            console.warn(`Lỗi đọc file ${fullPath}:`, fileError)
                        }
                    }
                }
            }

            // Bắt đầu đọc từ thư mục contracts
            readArtifactsRecursive(artifactsPath)

            return NextResponse.json(artifacts)
        } catch (fileError) {
            console.error('Lỗi đọc artifacts:', fileError)
            return NextResponse.json(
                { error: 'Không tìm thấy artifacts. Hãy chạy `npm run compile` trước.' },
                { status: 404 }
            )
        }
    } catch (error) {
        console.error('Lỗi API artifacts:', error)
        return NextResponse.json(
            { error: 'Lỗi server' },
            { status: 500 }
        )
    }
}