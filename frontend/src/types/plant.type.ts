export interface Plant {
    id: string;
    plotId: string;
    itemId: string;
    plantedTime: number; // Thời gian bắt đầu trồng (timestamp)
    lastTendedTime: number; // Thời điểm cây được chăm sóc cuối cùng
    qualityModifier: number; // Chỉ số chất lượng ảnh hưởng từ chăm sóc 0 -> 100
    growthTime: number; // Thời gian trồng cây (giây)
    tendCount: number; // Số lần chăm sóc
    isHarvested: boolean; // Trạng thái đã thu hoạch hay chưa
}

export interface PlantFilters {
    page: number;
    limit: number;
    search?: string;
    isHarvested?: boolean;
    plotId?: string;
    itemId?: string;
}

export interface PlantPagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
}

// Helper functions
export const getPlantStatus = (plant: Plant): 'growing' | 'ready' | 'harvested' => {
    if (plant.isHarvested) return 'harvested';

    const currentTime = Math.floor(Date.now() / 1000);
    const timeElapsed = currentTime - plant.plantedTime;

    if (timeElapsed >= plant.growthTime) return 'ready';
    return 'growing';
}

export const getGrowthProgress = (plant: Plant): number => {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeElapsed = currentTime - plant.plantedTime;

    if (plant.isHarvested) return 100;
    if (timeElapsed >= plant.growthTime) return 100;

    return Math.min(100, Math.round((timeElapsed / plant.growthTime) * 100));
}

export const getRemainingTime = (plant: Plant): number => {
    if (plant.isHarvested) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    const timeElapsed = currentTime - plant.plantedTime;

    if (timeElapsed >= plant.growthTime) return 0;
    return plant.growthTime - timeElapsed;
}

export const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Sẵn sàng thu hoạch';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}
