import * as React from "react"

export function useLocale() {
    const [isClient, setIsClient] = React.useState(false)

    React.useEffect(() => {
        setIsClient(true)
    }, [])

    const formatNumber = React.useCallback((value: number, options?: Intl.NumberFormatOptions) => {
        if (!isClient) return value.toString()
        return value.toLocaleString('vi-VN', options)
    }, [isClient])

    const formatDate = React.useCallback((timestamp: number | Date, options?: Intl.DateTimeFormatOptions) => {
        if (!isClient) return timestamp.toString()
        const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp
        return date.toLocaleString('vi-VN', options)
    }, [isClient])

    return { formatNumber, formatDate, isClient }
}
