import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const HISTORY_FILE = join(process.cwd(), 'data', 'contract-history.json')

// Đảm bảo thư mục data tồn tại
const ensureDataDir = () => {
    const dataDir = join(process.cwd(), 'data')
    if (!existsSync(dataDir)) {
        const fs = require('fs')
        fs.mkdirSync(dataDir, { recursive: true })
    }
}

// Đọc contract history
const readHistory = () => {
    ensureDataDir()
    if (!existsSync(HISTORY_FILE)) {
        return []
    }
    try {
        const content = readFileSync(HISTORY_FILE, 'utf-8')
        return JSON.parse(content)
    } catch {
        return []
    }
}

// Ghi contract history
const writeHistory = (history: any[]) => {
    ensureDataDir()
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2))
}

export async function GET(request: NextRequest) {
    try {
        const history = readHistory()
        return NextResponse.json(history)
    } catch (error) {
        console.error('Lỗi đọc contract history:', error)
        return NextResponse.json(
            { error: 'Lỗi server' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { address, abi, name } = body
        
        if (!address || !abi || !name) {
            return NextResponse.json(
                { error: 'Thiếu thông tin contract' },
                { status: 400 }
            )
        }
        
        const history = readHistory()
        
        // Kiểm tra xem contract đã tồn tại chưa
        const existingIndex = history.findIndex((item: any) => item.address === address)
        
        const newContract = {
            address,
            abi,
            name,
            timestamp: new Date().toISOString()
        }
        
        if (existingIndex >= 0) {
            // Cập nhật contract hiện có
            history[existingIndex] = newContract
        } else {
            // Thêm contract mới
            history.unshift(newContract)
        }
        
        // Giới hạn lịch sử tối đa 50 contracts
        if (history.length > 50) {
            history.splice(50)
        }
        
        writeHistory(history)
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Lỗi lưu contract history:', error)
        return NextResponse.json(
            { error: 'Lỗi server' },
            { status: 500 }
        )
    }
}
