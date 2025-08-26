export enum ItemType {
    Weapon = 0,
    Consumable = 1,
    Material = 2,
    Seed = 3,
    Crop = 4,
    Livestock = 5,
    AnimalFeed = 6,
    Tool = 7,
    Quest = 8,
    Other = 9
}

export enum Rarity {
    Common = 0,
    Uncommon = 1,
    Rare = 2,
    Epic = 3,
    Legendary = 4
}

export enum Attribute {
    Damage = 0,
    Durability = 1,
    GrowthRate = 2,
    YieldBonus = 3,
    Health = 4,
    Speed = 5,
    Resistance = 6,
    Strength = 7,
    Agility = 8,
    Stamina = 9,
    Fertility = 10,
    WaterUsage = 11,
    FeedEfficiency = 12,
    Quality = 13,
    HarvestCooldown = 14,
}

export interface ItemDrop {
    itemId: number;
    probability: number;
    yield: number;
}

export interface Item {
    id: number;
    name: string;
    itemType: ItemType;
    rarity: Rarity;
    isTradable: boolean;
    isBanned: boolean;
    attributes?: { [key in Attribute]?: number };
    drops?: ItemDrop[];
    maxStacked: number;
    isStacked: boolean;
}

export interface ItemFilters {
    page: number;
    limit: number;
    search: string;
    itemType?: ItemType;
    rarity?: Rarity;
    isTradable?: boolean;
    isBanned?: boolean;
}

export interface ItemPagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
}
