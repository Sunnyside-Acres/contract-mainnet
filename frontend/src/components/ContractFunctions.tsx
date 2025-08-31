import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'

interface Props {
    contract?: ethers.Contract
}

export function ContractFunctions({ contract }: Props) {
    const [results, setResults] = useState<Record<string, any>>({})
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
    const [showClearNotification, setShowClearNotification] = useState(false)

    // Xóa tất cả results khi contract thay đổi
    useEffect(() => {
        if (Object.keys(results).length > 0) {
            setResults({})
            setIsLoading({})
            setShowClearNotification(true)
            // Ẩn thông báo sau 3 giây
            setTimeout(() => setShowClearNotification(false), 3000)
        }
    }, [contract])

    const formatResult = (result: any): string => {
        if (result === null || result === undefined) {
            return 'null'
        }

        if (typeof result === 'boolean') {
            return result.toString()
        }

        if (ethers.BigNumber.isBigNumber(result)) {
            return result.toString()
        }

        if (Array.isArray(result)) {
            // Nếu là mảng rỗng
            if (result.length === 0) return '[]'

            // Kiểm tra xem có phải là struct array không
            const isStructArray = result.length > 0 &&
                typeof result[0] === 'object' &&
                !Array.isArray(result[0]) &&
                !ethers.BigNumber.isBigNumber(result[0])

            // Nếu là struct array
            if (isStructArray) {
                return '[\n' + result.map((item, index) => {
                    const formattedStruct = formatStructObject(item)
                    return `  ${index + 1}. ${formattedStruct.split('\n').join('\n    ')}`
                }).join('\n') + '\n]'
            }

            // Nếu là mảng 1 chiều với các giá trị đơn giản
            const isSimpleArray = result.every(item =>
                typeof item !== 'object' ||
                ethers.BigNumber.isBigNumber(item)
            )

            if (isSimpleArray) {
                return '[\n' + result.map((item, index) => {
                    const formattedValue = ethers.BigNumber.isBigNumber(item)
                        ? item.toString()
                        : typeof item === 'string'
                            ? `"${item}"`
                            : item
                    return `  ${index + 1}. ${formattedValue}`
                }).join('\n') + '\n]'
            }

            // Nếu là mảng phức tạp
            return '[\n' + result.map((item, index) => {
                const formattedItem = formatResult(item)
                return `  ${index + 1}. ${formattedItem.split('\n').join('\n    ')}`
            }).join('\n') + '\n]'
        }

        // Kiểm tra xem có phải là struct object không
        if (typeof result === 'object' && !ethers.BigNumber.isBigNumber(result)) {
            return formatStructObject(result)
        }

        return result.toString()
    }

    const formatStructObject = (obj: any): string => {
        // Kiểm tra xem object có phải là struct không
        const isStruct = typeof obj === 'object' &&
            obj !== null &&
            !Array.isArray(obj) &&
            Object.keys(obj).some(key => !isNaN(Number(key))) // Có số làm key

        if (!isStruct) {
            const formatted: Record<string, any> = {}
            for (const key in obj) {
                formatted[key] = formatResult(obj[key])
            }
            const entries = Object.entries(formatted)
            if (entries.length === 0) return '{}'

            return '{\n' + entries.map(([key, value]) => {
                return `  ${key}: ${value}`
            }).join('\n') + '\n}'
        }

        // Xử lý struct
        const structKeys = Object.keys(obj).filter(key => !isNaN(Number(key)))
        const maxKey = Math.max(...structKeys.map(Number))
        const structValues = []

        for (let i = 0; i <= maxKey; i++) {
            const value = obj[i]
            if (value !== undefined) {
                const formattedValue = formatResult(value)
                structValues.push(formattedValue)
            }
        }

        // Thêm các thuộc tính không phải số
        const nonNumericKeys = Object.keys(obj).filter(key => isNaN(Number(key)))
        const additionalProps = nonNumericKeys.map(key => {
            const value = formatResult(obj[key])
            return `  ${key}: ${value}`
        })

        if (additionalProps.length > 0) {
            structValues.push(...additionalProps)
        }

        return '{\n' + structValues.map((value, index) => {
            return `  ${getStructFieldName(index)}: ${value}`
        }).join('\n') + '\n}'
    }

    const getStructFieldName = (index: number): string => {
        // Bạn có thể customize tên field tùy theo struct type
        // Ví dụ cho Plant struct:
        const plantFields = ['id', 'plantType', 'plantedTime', 'lastWateredTime', 'lastFertilizedTime', 'growth', 'isAlive']
        // Ví dụ cho Plot struct:
        const plotFields = ['id', 'owner', 'plantId', 'soil', 'water', 'fertilizer', 'lastUpdatedTime', 'isLocked']

        // Thêm các mapping khác cho các struct khác
        const fieldMappings: Record<number, string> = {
            ...Object.fromEntries(plantFields.map((field, i) => [i, field])),
            ...Object.fromEntries(plotFields.map((field, i) => [i, field])),
        }

        return fieldMappings[index] || `field${index + 1}`
    }

    const parseErrorMessage = (errorMessage: string) => {
        // Tìm reason string trong error message
        const reasonMatch = errorMessage.match(/reason="([^"]+)"/)
        const reason = reasonMatch ? reasonMatch[1] : null

        // Tìm VM Exception message
        const vmMatch = errorMessage.match(/VM Exception while processing transaction: reverted with reason string '([^']+)'/)
        const vmReason = vmMatch ? vmMatch[1] : null

        // Tìm error code
        const codeMatch = errorMessage.match(/code=([A-Z_]+)/)
        const code = codeMatch ? codeMatch[1] : null

        // Tìm method name
        const methodMatch = errorMessage.match(/method="([^"]+)"/)
        const method = methodMatch ? methodMatch[1] : null

        return {
            reason: reason || vmReason,
            code,
            method,
            fullMessage: errorMessage
        }
    }

    const getErrorType = (error: any) => {
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT') return 'gas'
        if (error.code === 'INSUFFICIENT_FUNDS') return 'funds'
        if (error.code === 'USER_REJECTED') return 'user'
        if (error.reason?.includes('reverted')) return 'revert'
        return 'general'
    }

    const getErrorIcon = (errorType: string) => {
        switch (errorType) {
            case 'gas':
                return (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                )
            case 'funds':
                return (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                )
            case 'user':
                return (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                )
            case 'revert':
                return (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                )
            default:
                return (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                )
        }
    }

    const getInputPlaceholder = (type: string): string => {
        if (type.includes('[]')) {
            const baseType = type.replace('[]', '')
            if (baseType === 'uint256' || baseType === 'uint' || baseType === 'int256' || baseType === 'int') {
                return '[1,2,3]'
            } else if (baseType === 'bool') {
                return '[true,false]'
            } else if (baseType === 'address') {
                return '[0x123...,0x456...]'
            } else if (baseType === 'string') {
                return '["item1","item2"]'
            }
            return '[item1,item2]'
        }

        if (type === 'uint256' || type === 'uint' || type === 'int256' || type === 'int') {
            return '123'
        } else if (type === 'bool') {
            return 'true/false'
        } else if (type === 'address') {
            return '0x1234567890123456789012345678901234567890'
        } else if (type === 'string') {
            return 'text'
        }

        return type
    }

    const parseInput = (input: string, type: string): any => {
        // Xử lý các kiểu dữ liệu cơ bản
        if (type.includes('[]')) {
            // Xử lý array types
            try {
                // Thử parse JSON trước
                const parsed = JSON.parse(input)
                if (Array.isArray(parsed)) {
                    return parsed
                }
            } catch {
                // Nếu không phải JSON, thử parse theo format khác
                if (input.trim() === '[]') return []
                if (input.trim() === '') return []

                // Xử lý format [1,2,3] hoặc "1,2,3"
                const cleanInput = input.replace(/[\[\]]/g, '').trim()
                if (cleanInput === '') return []

                const items = cleanInput.split(',').map(item => item.trim())
                const baseType = type.replace('[]', '')

                return items.map(item => {
                    if (baseType === 'uint256' || baseType === 'uint' || baseType === 'int256' || baseType === 'int') {
                        return ethers.BigNumber.from(item)
                    } else if (baseType === 'bool') {
                        return item.toLowerCase() === 'true'
                    } else if (baseType === 'address') {
                        return item
                    } else {
                        return item.replace(/"/g, '') // Remove quotes for strings
                    }
                })
            }
        }

        // Xử lý các kiểu dữ liệu đơn lẻ
        if (type === 'uint256' || type === 'uint' || type === 'int256' || type === 'int') {
            return ethers.BigNumber.from(input)
        } else if (type === 'bool') {
            return input.toLowerCase() === 'true'
        } else if (type === 'address') {
            return input
        } else if (type === 'string') {
            return input.replace(/"/g, '') // Remove quotes
        }

        return input
    }

    const callFunction = async (functionName: string, inputs: any[]) => {
        try {
            setIsLoading(prev => ({ ...prev, [functionName]: true }))

            // Parse inputs theo đúng kiểu dữ liệu
            const parsedInputs = inputs.map((input, index) => {
                const func = contract?.interface.fragments.find((f: any) => f.name === functionName)
                if (func && func.inputs[index]) {
                    return parseInput(input, func.inputs[index].type)
                }
                return input
            })

            const result = await contract?.[functionName](...parsedInputs)

            if (result.wait) {
                // Nếu là transaction
                const tx = await result.wait()
                setResults(prev => ({
                    ...prev,
                    [functionName]: {
                        value: {
                            hash: tx.transactionHash,
                            blockNumber: tx.blockNumber,
                            gasUsed: tx.gasUsed.toString()
                        },
                        error: null,
                        timestamp: new Date().toISOString(),
                        type: 'transaction'
                    }
                }))
            } else {
                // Nếu là read function
                setResults(prev => ({
                    ...prev,
                    [functionName]: {
                        value: formatResult(result),
                        error: null,
                        timestamp: new Date().toISOString(),
                        type: 'read'
                    }
                }))
            }
        } catch (error) {
            console.error(`Lỗi gọi hàm ${functionName}:`, error)
            const errorMessage = (error as Error).message
            const parsedError = parseErrorMessage(errorMessage)

            setResults(prev => ({
                ...prev,
                [functionName]: {
                    value: null,
                    error: parsedError,
                    timestamp: new Date().toISOString(),
                    type: 'error'
                }
            }))
        } finally {
            setIsLoading(prev => ({ ...prev, [functionName]: false }))
        }
    }

    const clearAllResults = () => {
        setResults({})
        setIsLoading({})
    }

    const getResultsCount = () => {
        return Object.keys(results).length
    }

    const getLastCallTime = () => {
        const timestamps = Object.values(results).map((result: any) => result.timestamp)
        if (timestamps.length === 0) return null
        return new Date(Math.max(...timestamps.map((ts: string) => new Date(ts).getTime())))
    }

    if (!contract) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <svg
                        className="h-6 w-6 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold">
                    Chưa có contract nào được tải
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                    Vui lòng kết nối ví và tải một contract để bắt đầu
                </p>
            </div>
        )
    }

    const readFunctions = contract.interface.fragments.filter(
        (fragment: any) =>
            fragment.type === 'function' &&
            (fragment.stateMutability === 'view' || fragment.stateMutability === 'pure')
    )

    const writeFunctions = contract.interface.fragments.filter(
        (fragment: any) =>
            fragment.type === 'function' &&
            fragment.stateMutability !== 'view' &&
            fragment.stateMutability !== 'pure'
    )

    const FunctionForm = ({ func }: { func: any }) => {
        const [inputs, setInputs] = useState<string[]>(Array(func.inputs.length).fill(''))

        return (
            <AccordionItem value={func.name} className="border rounded-lg mb-2 last:mb-0">
                <AccordionTrigger className="px-3 hover:no-underline">
                    <div className="flex items-center space-x-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                            <svg
                                className="h-3 w-3 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {func.stateMutability === 'view' || func.stateMutability === 'pure' ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                )}
                            </svg>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{func.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {func.inputs.map((input: any) => input.type).join(', ')}
                            </span>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="px-3 pb-3 space-y-3">
                        {func.inputs.map((input: any, index: number) => (
                            <div key={index} className="space-y-1">
                                <label className="text-xs font-medium flex items-center space-x-2">
                                    <span>{input.name || `param${index}`}</span>
                                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
                                        {input.type}
                                    </span>
                                </label>
                                <Input
                                    value={inputs[index]}
                                    onChange={(e) => {
                                        const newInputs = [...inputs]
                                        newInputs[index] = e.target.value
                                        setInputs(newInputs)
                                    }}
                                    placeholder={getInputPlaceholder(input.type)}
                                    disabled={isLoading[func.name]}
                                    className="text-xs"
                                />
                                {input.type.includes('[]') && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Format: [1,2,3] hoặc JSON array
                                    </div>
                                )}
                            </div>
                        ))}

                        <Button
                            onClick={() => callFunction(func.name, inputs)}
                            className="w-full text-xs"
                            disabled={isLoading[func.name]}
                        >
                            {isLoading[func.name] ? (
                                <svg
                                    className="animate-spin -ml-1 mr-2 h-3 w-3 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            ) : (
                                <svg
                                    className="mr-2 h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            )}
                            {isLoading[func.name] ? 'Đang xử lý...' : 'Gọi hàm'}
                        </Button>

                        {results[func.name] && (
                            <div className="mt-4 space-y-2">
                                {results[func.name].error ? (
                                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    {getErrorIcon(getErrorType(results[func.name].error))}
                                                </svg>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Lỗi thực thi</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {getErrorType(results[func.name].error) === 'gas' && 'Gas estimation failed'}
                                                        {getErrorType(results[func.name].error) === 'funds' && 'Insufficient funds'}
                                                        {getErrorType(results[func.name].error) === 'user' && 'User rejected'}
                                                        {getErrorType(results[func.name].error) === 'revert' && 'Transaction reverted'}
                                                        {getErrorType(results[func.name].error) === 'general' && 'General error'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(results[func.name].timestamp).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Main error reason */}
                                        <div className="mt-3 p-3 bg-destructive/5 rounded border-l-4 border-destructive">
                                            <p className="text-sm font-medium">
                                                {results[func.name].error.reason || 'Không có thông tin lỗi chi tiết'}
                                            </p>
                                        </div>

                                        {/* Error details */}
                                        <div className="mt-3 space-y-2">
                                            {results[func.name].error.code && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-medium text-muted-foreground">Error Code:</span>
                                                    <span className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                                        {results[func.name].error.code}
                                                    </span>
                                                </div>
                                            )}
                                            {results[func.name].error.method && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-medium text-muted-foreground">Method:</span>
                                                    <span className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                                        {results[func.name].error.method}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Full error message (collapsible) */}
                                        <details className="mt-3">
                                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                Xem chi tiết lỗi đầy đủ
                                            </summary>
                                            <div className="mt-2 p-3 bg-muted/50 rounded">
                                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                                                    {results[func.name].error.fullMessage}
                                                </pre>
                                            </div>
                                        </details>
                                    </div>
                                ) : (
                                    <div className="bg-muted rounded-lg overflow-hidden">
                                        <div className="bg-muted/50 px-4 py-2 border-b">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <svg
                                                        className="h-4 w-4 text-green-500"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                        />
                                                    </svg>
                                                    <span className="font-medium text-sm">
                                                        {results[func.name].type === 'transaction'
                                                            ? 'Transaction thành công'
                                                            : 'Kết quả'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(results[func.name].timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            {results[func.name].type === 'transaction' ? (
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">Hash:</span>
                                                        <span className="font-mono">
                                                            {results[func.name].value.hash.slice(0, 10)}...
                                                            {results[func.name].value.hash.slice(-8)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">Block:</span>
                                                        <span className="font-mono">
                                                            {results[func.name].value.blockNumber}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">Gas Used:</span>
                                                        <span className="font-mono">
                                                            {results[func.name].value.gasUsed}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                                                    {results[func.name].value}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        )
    }

    return (
        <div className="w-full">
            {/* Thông báo khi contract thay đổi */}
            {showClearNotification && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <svg
                            className="h-4 w-4 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span className="text-sm text-blue-700">
                            Contract đã thay đổi - Tất cả kết quả đã được xóa
                        </span>
                    </div>
                </div>
            )}

            {/* Header với thông tin và nút xóa */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium">Kết quả đã gọi:</span>
                        <span className="text-xs text-muted-foreground">
                            {getResultsCount()} function{getResultsCount() !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {contract && (
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">Contract:</span>
                            <span className="text-xs font-mono text-muted-foreground">
                                {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                            </span>
                        </div>
                    )}
                    {getLastCallTime() && (
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">Lần gọi cuối:</span>
                            <span className="text-xs text-muted-foreground">
                                {getLastCallTime()?.toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>
                {getResultsCount() > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllResults}
                        className="text-destructive hover:text-destructive text-xs"
                    >
                        <svg
                            className="mr-2 h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                        Xóa tất cả kết quả
                    </Button>
                )}
            </div>

            <Tabs defaultValue="read" className="w-full">
                <TabsList className="w-full">
                    <TabsTrigger value="read" className="flex-1">
                        <div className="flex items-center space-x-2">
                            <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                            </svg>
                            <span className="text-xs">Read Functions</span>
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="write" className="flex-1">
                        <div className="flex items-center space-x-2">
                            <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                            </svg>
                            <span className="text-xs">Write Functions</span>
                        </div>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="read" className="mt-4">
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {readFunctions.map((func: any) => (
                            <FunctionForm key={func.name} func={func} />
                        ))}
                    </Accordion>
                </TabsContent>

                <TabsContent value="write" className="mt-4">
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {writeFunctions.map((func: any) => (
                            <FunctionForm key={func.name} func={func} />
                        ))}
                    </Accordion>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default ContractFunctions