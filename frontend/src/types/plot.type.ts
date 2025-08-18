export interface Plot {
    id: string;
    owner: string;
    plotType: number; // 0=Thường, 1=Phì nhiêu, 2=Ma thuật
    fertility: number; // Độ phì nhiêu (0-100)
    isActive: boolean; // Ô đất có sẵn sàng để trồng không
    xCoordinate: number; // Tọa độ X trên lưới 2D
    yCoordinate: number; // Tọa độ Y trên lưới 2D
    creationTime: number; // Thời gian ô đất được tạo (timestamp)
    isLocked: boolean; // Ô đất có bị khóa không
}

export interface PlotFilters {
    page: number;
    limit: number;
    search?: string;
    plotType?: number;
    minFertility?: number;
    maxFertility?: number;
    isActive?: boolean;
    isLocked?: boolean;
    owner?: string;
}

export interface PlotPagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
}

export const PlotTypeNames = {
    0: "Thường",
    1: "Phì nhiêu",
    2: "Ma thuật"
} as const;

export type PlotType = keyof typeof PlotTypeNames;
