export interface Player {
    playerAddress: string;
    name: string;
    level: number;
    xp: number;
    mana: number;
    maxMana: number;
    sunlight: number;
    sunny: number;
    lastLogin: number;
}

export interface PlayerFilters {
    page: number;
    limit: number;
    search?: string;
    minLevel?: number;
    maxLevel?: number;
    minXp?: number;
    maxXp?: number;
    minSunlight?: number;
    maxSunlight?: number;
    minSunny?: number;
    maxSunny?: number;
}

export interface PlayerPagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
}
