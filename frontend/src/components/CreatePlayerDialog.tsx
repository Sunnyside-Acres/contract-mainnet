import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useCreatePlayer } from '@/hooks/useCreatePlayer';
import { usePlayerContext } from '@/context/PlayerContext';
import { ToastContainer, toast } from 'react-toastify';

export function CreatePlayerDialog() {
    const [name, setName] = useState('');
    const { contract, refreshPlayers } = usePlayerContext();
    const { createPlayer, isCreating, error, clearError } = useCreatePlayer();
    const [isOpen, setIsOpen] = useState(false);

    const handleCreate = async () => {
        try {
            await createPlayer({ name, contract });
            await refreshPlayers();
            setIsOpen(false);
            setName('');
            toast("Success");
        } catch (error) {
            toast('Error');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>Tạo Player Mới</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tạo Player Mới</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                            Tên Player
                        </label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nhập tên player"
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-500">
                            {error.message}
                        </p>
                    )}
                    <div className="flex justify-end space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsOpen(false);
                                clearError();
                            }}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating || !name.trim()}
                        >
                            {isCreating ? 'Đang tạo...' : 'Tạo'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
