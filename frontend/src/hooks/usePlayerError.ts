import { useState, useCallback } from 'react';

interface PlayerError {
    message: string;
    code?: string;
    details?: any;
}

interface UsePlayerErrorReturn {
    error: PlayerError | null;
    setError: (error: PlayerError | null) => void;
    handleError: (error: any) => void;
    clearError: () => void;
    isError: boolean;
}

export function usePlayerError(): UsePlayerErrorReturn {
    const [error, setError] = useState<PlayerError | null>(null);

    const handleError = useCallback((error: any) => {
        // Xử lý các loại lỗi khác nhau
        if (typeof error === 'string') {
            setError({ message: error });
        } else if (error?.message) {
            // Xử lý lỗi từ contract
            if (error.message.includes('user rejected transaction')) {
                setError({
                    message: 'Giao dịch đã bị từ chối',
                    code: 'USER_REJECTED',
                });
            } else if (error.message.includes('insufficient funds')) {
                setError({
                    message: 'Không đủ token để thực hiện giao dịch',
                    code: 'INSUFFICIENT_FUNDS',
                });
            } else if (error.message.includes('execution reverted')) {
                setError({
                    message: 'Lỗi thực thi smart contract',
                    code: 'CONTRACT_ERROR',
                    details: error.message,
                });
            } else {
                setError({
                    message: error.message,
                    code: 'UNKNOWN_ERROR',
                    details: error,
                });
            }
        } else {
            setError({
                message: 'Đã xảy ra lỗi không xác định',
                code: 'UNKNOWN_ERROR',
                details: error,
            });
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        error,
        setError,
        handleError,
        clearError,
        isError: error !== null,
    };
}
