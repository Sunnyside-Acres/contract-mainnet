import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePlayerError } from './usePlayerError';

interface CreatePlayerParams {
    name: string;
    contract: ethers.Contract | null;
}

interface UseCreatePlayerReturn {
    createPlayer: (params: CreatePlayerParams) => Promise<void>;
    isCreating: boolean;
    error: any;
    clearError: () => void;
}

export function useCreatePlayer(): UseCreatePlayerReturn {
    const [isCreating, setIsCreating] = useState(false);
    const { error, handleError, clearError } = usePlayerError();

    const createPlayer = useCallback(async ({ name, contract }: CreatePlayerParams) => {
        if (!contract) {
            handleError('Vui lòng kết nối ví để tạo player');
            return;
        }

        if (!name) {
            handleError('Tên player không được để trống');
            return;
        }

        setIsCreating(true);

        try {
            // Gọi hàm createPlayer từ smart contract
            const tx = await contract.createPlayer(name);

            // Chờ transaction được confirm
            await tx.wait();

            // Clear error nếu thành công
            clearError();
        } catch (error) {
            handleError(error);
        } finally {
            setIsCreating(false);
        }
    }, [handleError, clearError]);

    return {
        createPlayer,
        isCreating,
        error,
        clearError
    };
}
