# Sunnyside Acres

A blockchain-based farming simulation game built on the Sei Network. Experience the joy of farming, crafting, and trading in a decentralized gaming ecosystem.

## 🌾 About the Game

Sunnyside Acres is a comprehensive farming game where players can manage their own virtual farm, grow crops, raise animals, craft items, and trade with other players. All game assets and actions are secured on the blockchain, giving players true ownership of their in-game items and progress.

## 🎮 Game Features

- **🌱 Farming & Planting** - Grow various crops on your plots
- **🐔 Animal Raising** - Raise animals and collect resources
- **🎣 Fishing** - Cast your line and catch different fish species
- **⚒️ Crafting** - Combine items to create new products
- **🏪 NPC Market** - Buy and sell items with NPC vendors
- **🤝 Flea Market** - Trade items with other players
- **📦 Inventory System** - Manage your collected items and resources
- **🎰 Gacha System** - Try your luck with random item rewards
- **👤 Player Profiles** - Track your progress and achievements
- **📋 Task System** - Complete quests for rewards
- **🌦️ Weather System** - Dynamic weather affects your farm
- **👥 Referral System** - Invite friends and earn rewards

## 🛠️ Technical Stack

- **Smart Contracts**: Solidity ^0.8.28
- **Development Framework**: Hardhat
- **Blockchain**: Sei Network (EVM-compatible)
- **Standards**: OpenZeppelin Contracts

## 📦 Installation

```bash
# Install dependencies
npm install

# Compile smart contracts
npm run compile
```

## 🚀 Deployment

### Deploy to Local Network

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy contracts
npm run deploy:local
```

### Deploy to Sei Mainnet

```bash
# Set up your .env file with PRIVATE_KEY
npm run deploy
```

## 🧪 Testing

```bash
# Run tests
npm test
```

## 📁 Contract Structure

The game is built with a modular architecture, with separate contracts for each game feature:

- `World.sol` - Central registry and access control
- `PlayerComponent.sol` & `PlayerLogic.sol` - Player management
- `PlantComponent.sol` & `PlantLogic.sol` - Farming system
- `RaisingComponent.sol` & `RaisingLogic.sol` - Animal raising
- `CraftingComponent.sol` & `CraftingLogic.sol` - Item crafting
- `InventoryComponent.sol` & `InventoryLogic.sol` - Item storage
- `NPCMarketComponent.sol` & `NPCMarketLogic.sol` - NPC trading
- `FleaMarketComponent.sol` & `FleaMarketLogic.sol` - Player trading
- `FishingLogic.sol` - Fishing mechanics
- `GachaLogic.sol` - Random rewards
- `TaskComponent.sol` & `TaskLogic.sol` - Quest system
- `WeatherComponent.sol` & `WeatherLogic.sol` - Weather effects
- `ReferralComponent.sol` & `ReferralLogic.sol` - Referral rewards

## 🎯 Getting Started

1. Connect your wallet to the Sei Network
2. Deploy or interact with the game contracts
3. Start your farming journey!

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For questions and support, please open an issue in the repository.

---

Built with ❤️ by RYG.Labs
