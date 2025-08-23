/**
 * Format Ethereum address để hiển thị ngắn gọn
 * @param address - Ethereum address
 * @param startLength - Số ký tự hiển thị ở đầu (mặc định: 8)
 * @param endLength - Số ký tự hiển thị ở cuối (mặc định: 6)
 * @returns Formatted address string
 */
export const formatAddress = (
  address: string | undefined | null,
  startLength: number = 8,
  endLength: number = 6
): string => {
  if (!address || typeof address !== 'string') {
    return `0x${'0'.repeat(startLength - 2)}...${'0'.repeat(endLength)}`
  }
  
  if (address.length < startLength + endLength) {
    return address
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * Format address ngắn cho hiển thị trong UI
 * @param address - Ethereum address
 * @returns Short formatted address
 */
export const formatShortAddress = (address: string | undefined | null): string => {
  return formatAddress(address, 6, 4)
}

/**
 * Format address dài cho hiển thị chi tiết
 * @param address - Ethereum address
 * @returns Long formatted address
 */
export const formatLongAddress = (address: string | undefined | null): string => {
  return formatAddress(address, 10, 8)
}
