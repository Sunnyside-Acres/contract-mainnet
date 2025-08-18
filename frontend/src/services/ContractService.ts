import { ethers } from 'ethers';

interface ContractAddresses {
    network: string;
    chainId: number;
    deployer: string;
    contracts: {
        World: string;
        PlayerComponent: string;
        PlayerLogic: string;
        PlayerProxy: string;
        ItemComponent: string;
        ItemLogic: string;
        ItemProxy: string;
        WeatherComponent: string;
        WeatherLogic: string;
        WeatherProxy: string;
        PlotComponent: string;
        PlotLogic: string;
        PlotProxy: string;
        InventoryComponent: string;
        InventoryLogic: string;
        InventoryProxy: string;
        PlantComponent: string;
        PlantLogic: string;
        PlantProxy: string;
    };
    timestamp: string;
    rpcUrl?: string;
}

export class ContractService {
    private signer: ethers.Signer | null = null;
    private provider: ethers.providers.Provider | null = null;
    private contractAddresses: ContractAddresses | null = null;
    private artifacts: Record<string, any> = {};

    constructor() {
        this.loadArtifacts();
        this.loadContractAddresses();
    }

    private async loadArtifacts() {
        try {
            const response = await fetch('/api/artifacts');
            if (response.ok) {
                this.artifacts = await response.json();
            }
        } catch (error) {
            console.error('Error loading artifacts:', error);
        }
    }

    private async loadContractAddresses() {
        try {
            const response = await fetch('/api/contract-addresses');
            if (response.ok) {
                this.contractAddresses = await response.json();
            }
        } catch (error) {
            console.error('Error loading contract addresses:', error);
        }
    }

    setSigner(signer: ethers.Signer) {
        this.signer = signer;
    }

    setProvider(provider: ethers.providers.Provider) {
        this.provider = provider;
    }

    private getContract(contractName: string, contractAddress?: string): ethers.Contract {
        if (!this.signer) {
            throw new Error('Signer not set');
        }

        if (!this.artifacts[contractName]) {
            throw new Error(`Artifact for ${contractName} not found`);
        }

        let address = contractAddress;
        if (!address && this.contractAddresses) {
            // Map contract names to addresses
            const addressMap: Record<string, string> = {
                'PlotLogic': this.contractAddresses.contracts.PlotLogic,
                'PlantLogic': this.contractAddresses.contracts.PlantLogic,
                'PlotComponent': this.contractAddresses.contracts.PlotComponent,
                'PlantComponent': this.contractAddresses.contracts.PlantComponent,
                'InventoryComponent': this.contractAddresses.contracts.InventoryComponent,
                'ItemComponent': this.contractAddresses.contracts.ItemComponent,
            };
            address = addressMap[contractName];
        }

        if (!address) {
            throw new Error(`Address for ${contractName} not found`);
        }

        return new ethers.Contract(address, this.artifacts[contractName].abi, this.signer);
    }

    // Plot methods
    async createPlot(xCoordinate: number, yCoordinate: number) {
        const plotLogic = this.getContract('PlotLogic');
        return await plotLogic.createPlot(xCoordinate, yCoordinate);
    }

    async getPlots() {
        const plotLogic = this.getContract('PlotLogic');
        return await plotLogic.getPlots();
    }

    async getPlot(plotId: string) {
        const plotComponent = this.getContract('PlotComponent');
        return await plotComponent.getPlot(plotId);
    }

    // Plant methods
    async plantCrop(plotId: string, itemId: string) {
        const plantLogic = this.getContract('PlantLogic');
        return await plantLogic.plantCrop(plotId, itemId);
    }

    async plantHarvest(plantId: string) {
        const plantLogic = this.getContract('PlantLogic');
        return await plantLogic.plantHarvest(plantId);
    }

    async getOwnerPlantsWithDetails(ownerAddress: string) {
        const plantComponent = this.getContract('PlantComponent');
        return await plantComponent.getOwnerPlantsWithDetails(ownerAddress);
    }

    async getPlantedCrop(plantId: string) {
        const plantComponent = this.getContract('PlantComponent');
        return await plantComponent.getPlantedCrop(plantId);
    }

    // Inventory methods
    async getInventory(playerAddress: string) {
        const inventoryComponent = this.getContract('InventoryComponent');
        return await inventoryComponent.getInventory(playerAddress);
    }

    async getItem(playerAddress: string, itemId: string) {
        const inventoryComponent = this.getContract('InventoryComponent');
        return await inventoryComponent.getItem(playerAddress, itemId);
    }

    // Item methods
    async getItemInfo(itemId: string) {
        const itemComponent = this.getContract('ItemComponent');
        return await itemComponent.getItem(itemId);
    }

    async getItemDrops(itemId: string) {
        const itemComponent = this.getContract('ItemComponent');
        return await itemComponent.getItemDrops(itemId);
    }

    async getItemAttribute(itemId: string, attribute: number) {
        const itemComponent = this.getContract('ItemComponent');
        return await itemComponent.getItemAttribute(itemId, attribute);
    }

    // Utility methods
    isReady(): boolean {
        return !!(this.signer && this.contractAddresses && Object.keys(this.artifacts).length > 0);
    }

    getContractAddresses(): ContractAddresses | null {
        return this.contractAddresses;
    }
}
