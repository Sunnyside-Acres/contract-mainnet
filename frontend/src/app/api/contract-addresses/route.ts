import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const fileName = searchParams.get('file')

        if (!fileName) {
            return NextResponse.json(
                { error: 'Thiếu tham số file' },
                { status: 400 }
            )
        }

        // Đường dẫn đến file deployment (từ thư mục gốc của project)
        const deployedPath = join(process.cwd(), '..', 'deployed', fileName)

        try {
            const fileContent = readFileSync(deployedPath, 'utf-8')
            const data = JSON.parse(fileContent)

            return NextResponse.json(data)
        } catch (fileError) {
            console.error('Lỗi đọc file deployment:', fileError)
            return NextResponse.json(
                { error: `Không tìm thấy file deployment: ${fileName}` },
                { status: 404 }
            )
        }
    } catch (error) {
        console.error('Lỗi API contract-addresses:', error)
        return NextResponse.json(
            { error: 'Lỗi server' },
            { status: 500 }
        )
    }
}
