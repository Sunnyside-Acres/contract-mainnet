import { useState } from 'react';

export interface Toast {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = (toast: Toast) => {
        // Simple implementation using alert for now
        // In a real app, you would use a proper toast library
        if (toast.variant === 'destructive') {
            alert(`❌ ${toast.title}: ${toast.description || ''}`);
        } else if (toast.variant === 'success') {
            alert(`✅ ${toast.title}: ${toast.description || ''}`);
        } else {
            alert(`ℹ️ ${toast.title}: ${toast.description || ''}`);
        }

        setToasts(prev => [...prev, toast]);

        // Remove toast after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.slice(1));
        }, 3000);
    };

    return {
        toast,
        toasts,
    };
}
