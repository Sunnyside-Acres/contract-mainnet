// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/IInventory.sol";
import "../../interfaces/IItem.sol";
import "../../interfaces/IAutomation.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract AutomationLogic {
    IWorld public world;
    IInventoryComponent public inventoryProxy;
    IItemComponent public itemProxy;
    IAutomationComponent public automationProxy;
    bool private _locked;
    /// @notice Nonces for replay protection
    mapping(address => uint256) public nonces;
    /// @notice Treasury wallet address where ETH proceeds from sales are sent
    address public treasuryWallet;

    event FactoryBought(address indexed player, uint256 factoryId, uint256 price, FactoryState factoryState);
    event FactoryUpdateStatus(address indexed player, uint256 factoryId, FactoryState factoryState);
    event FactoryClaimed(address indexed player, uint256 factoryId, uint256 itemDropId, uint256 claimedAmount, FactoryState factoryState);
    event FactoryStopped(address indexed player, uint256 factoryId);
    event TreasuryWalletUpdated(address indexed oldWallet, address indexed newWallet, address indexed admin);

    constructor(
        address _world,
        address _inventoryProxy,
        address _itemProxy,
        address _automationProxy,
        address _treasuryWallet
    ) {
        world = IWorld(_world);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        itemProxy = IItemComponent(_itemProxy);
        automationProxy = IAutomationComponent(_automationProxy);
        require(_treasuryWallet != address(0), "Treasury wallet cannot be zero address");
        treasuryWallet = _treasuryWallet;
    }
    /**
     * @dev Prevents reentrance attacks
     * @notice Locks the contract during execution
     */
    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    /**
     * @dev Modifier to restrict access to admin only
     * @notice Reverts if caller is not an admin
     */
    modifier onlyAdmin() {
        require(world.isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    /**
     * @notice Sets the treasury wallet address (admin only)
     * @dev Updates where ETH proceeds from item sales are sent
     * @param _treasuryWallet Address of the new treasury wallet
     */
    function setTreasuryWallet(address _treasuryWallet) external onlyAdmin {
        require(
            _treasuryWallet != address(0),
            "Treasury wallet cannot be zero address"
        );
        address oldWallet = treasuryWallet;
        treasuryWallet = _treasuryWallet;
        emit TreasuryWalletUpdated(oldWallet, _treasuryWallet, msg.sender);
    }

    /**
     * @dev Get the current nonce for a player
     * @param player The address of the player
     * @return The current nonce value
     */
    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
    }

    /**
     * @dev Get factory state for a player
     * @param player The address of the player
     * @param factoryId The ID of the factory
     * @return The factory state
     */
    function getFactory(
        address player,
        uint256 factoryId
    ) external view returns (FactoryState memory) {
        return automationProxy.getFactory(player, factoryId);
    }

    /**
     * @dev Set factory price (admin only)
     * @param factoryId The ID of the factory
     * @param price The new price for the factory
     */
    function setFactoryPrice(
        uint256 factoryId,
        uint256 price
    ) external onlyAdmin {
        require(price > 0, "Price must be greater than 0");
        automationProxy.setFactoryPrice(factoryId, price);
    }

    /**
     * @dev Get factory price
     * @param factoryId The ID of the factory
     * @return The price of the factory
     */
    function getFactoryPrice(
        uint256 factoryId
    ) external view returns (uint256) {
        return automationProxy.getFactoryPrice(factoryId);
    }

    function getBatteryIdValid() external view returns (uint256[] memory) {
        return automationProxy.getBatteryIdValid();
    }   

    function getSupportIdValid() external view returns (uint256[] memory) {
        return automationProxy.getSupportIdValid();
    }

    function setBatteryIdValid(uint256[] memory newBatteryIds) external onlyAdmin {
        automationProxy.setBatteryIdValid(newBatteryIds);
    }

    function setSupportIdValid(uint256[] memory newSupportIds) external onlyAdmin {
        automationProxy.setSupportIdValid(newSupportIds);
    }

    /**
     * @dev Buy a factory
     * @param factoryId The ID of the factory to buy
     */
    function buyFactory(uint256 factoryId) external payable nonReentrant {
        address player = msg.sender;
        require(treasuryWallet != address(0), "Treasury wallet not set");

        require(
            factoryId > 0 && factoryId <= automationProxy.getMaxFactory(),
            "Invalid factory ID"
        );

        FactoryState memory factory = automationProxy.getFactory(
            player,
            factoryId
        );

        require(!factory.isOwned, "Factory already owned");
        uint256 factoryPrice = automationProxy.getFactoryPrice(factoryId);
        require(
            msg.value == factoryPrice,
            "Incorrect SEI amount"
        );

        (bool transferSuccess, ) = payable(treasuryWallet).call{
            value: msg.value
        }("");
        require(transferSuccess, "SEI transfer to treasury failed");

        factory.isOwned = true;
        factory.price = factoryPrice;
        automationProxy.setFactory(player, factoryId, factory);

        emit FactoryBought(player, factoryId, msg.value, factory);
    }

    /**
     * @dev Start the factory machine with given parameters
     * @param factoryId The ID of the factory to start
     * @param inputItemId The ID of the input item
     * @param inputQty The quantity of input items to use
     * @param supportItemId The ID of the support item (optional)
     * @param supportItemQty The quantity of support item to use (optional)
     * @param batteryId The ID of the battery item (optional)
     * @param batteryQty The quantity of battery to use (optional)
     * @param _proof The cryptographic proof for authorization
     */
function startMachine(
        uint256 factoryId,
        uint256 inputItemId,
        uint256 inputQty,
        uint256[] calldata supportItemId,
        uint256[] calldata supportItemQty,
        uint256[] calldata batteryId,
        uint256[] calldata batteryQty,
        bytes calldata _proof
    ) external {
        address player = msg.sender;
        uint64 currentTime = uint64(block.timestamp);
        bytes32 message = keccak256(
            abi.encodePacked(
                player,
                address(this),
                factoryId,
                inputItemId,
                inputQty,
                supportItemId,
                supportItemQty,
                batteryId,
                batteryQty,
                nonces[player]
            )
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            message
        );
        address signer = ECDSA.recover(ethSignedMessageHash, _proof);
        require(
            IWorld(world).isAdmin(signer),
            "Invalid proof: not signed by admin"
        );
        nonces[player]++;

        // Validations
        require(batteryId.length == batteryQty.length, "Battery mismatch");
        require(supportItemId.length == supportItemQty.length, "Support mismatch");
        require(inventoryProxy.exists(player, inputItemId), "Missing input item");

        //get factory
        FactoryState memory factory = automationProxy.getFactory(
            player,
            factoryId
        );
        require(factory.isOwned, "Not owned");

        // If the machine is running, it is mandatory to input the same type of data
        if (factory.isActive && factory.productionEndTime > currentTime) {
            require(
                factory.inputItemId == inputItemId,
                "Must use same input item while running"
            );
        }

        //add battery if exists
        uint64 addedEnergy = 0;
        // Calculate total energy from batteries (in seconds)
        for (uint256 i = 0; i < batteryId.length; i++) {

            require(automationProxy.isBatteryIdValid(batteryId[i]), "Invalid battery item");

            require(
                inventoryProxy.exists(player, batteryId[i]),
                "Player missing battery item"
            );

            InventoryItem memory item = inventoryProxy.getItem(
                player,
                batteryId[i]
            );
            require(item.quantity >= batteryQty[i], "Not enough battery");

            inventoryProxy.setItem(
                player,
                batteryId[i],
                item.quantity - batteryQty[i],
                item.durability,
                item.expiration
            );

            uint256 strength = itemProxy.getItemAttribute(
                batteryId[i],
                ItemStructs.Attribute.Strength
            );
            addedEnergy += uint64(strength * batteryQty[i]);
        }

        if (factory.batteryExpiration < currentTime) {
            factory.batteryExpiration = currentTime + addedEnergy;
        } else {
            factory.batteryExpiration += addedEnergy;
        }

        if (inputQty > 0) {
            // Input Item Processing
            InventoryItem memory inputInvItem = inventoryProxy.getItem(player, inputItemId);
            ItemStructs.Item memory itemDetails = itemProxy.getItem(inputItemId);
            require(itemDetails.itemType == ItemStructs.ItemType.Seed, "Item must be Seed");
            require(inputInvItem.quantity >= inputQty, "Not enough input");

            inventoryProxy.setItem(
                player,
                inputItemId,
                inputInvItem.quantity - inputQty,
                inputInvItem.durability,
                inputInvItem.expiration
            );

            uint256 growthRate = itemProxy.getItemAttribute(
                inputItemId,
                ItemStructs.Attribute.GrowthRate
            );
            uint256 baseDuration = inputQty * growthRate;

            uint256 totalReductionPercent = 0;
            for (uint256 i = 0; i < supportItemId.length; i++) {
                require(automationProxy.isSupportIdValid(supportItemId[i]), "Invalid support item");
                require(
                    inventoryProxy.exists(player, supportItemId[i]),
                    "Player missing support item"
                );

                InventoryItem memory sItem = inventoryProxy.getItem(
                    player,
                    supportItemId[i]
                );
                require(
                    sItem.quantity >= supportItemQty[i],
                    "Not enough support item"
                );

                inventoryProxy.setItem(
                    player,
                    supportItemId[i],
                    sItem.quantity - supportItemQty[i],
                    sItem.durability,
                    sItem.expiration
                );

                // Cumulative percentage discount
                uint256 rate = itemProxy.getItemAttribute(
                    supportItemId[i],
                    ItemStructs.Attribute.GrowthRate
                );
                totalReductionPercent += (rate * supportItemQty[i]);

                bool found = false;
                for (uint256 j = 0; j < factory.supportItemId.length; j++) {
                    if (factory.supportItemId[j] == supportItemId[i]) {
                        factory.supportItemQty[j] += supportItemQty[i];
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Dynamically resize and add new support items
                    uint256[] memory newSupportItemId = new uint256[](factory.supportItemId.length + 1);
                    uint256[] memory newSupportItemQty = new uint256[](factory.supportItemQty.length + 1);
                    for (uint256 k = 0; k < factory.supportItemId.length; k++) {
                        newSupportItemId[k] = factory.supportItemId[k];
                        newSupportItemQty[k] = factory.supportItemQty[k];
                    }
                    newSupportItemId[factory.supportItemId.length] = supportItemId[i];
                    newSupportItemQty[factory.supportItemQty.length] = supportItemQty[i];
                    factory.supportItemId = newSupportItemId;
                    factory.supportItemQty = newSupportItemQty;
                }
            }

            if (totalReductionPercent > 50) {
                totalReductionPercent = 50;
            } // Max 50% reduction

            uint256 actualDuration = baseDuration -
                ((baseDuration * totalReductionPercent) / 100) >
                0
                ? baseDuration - ((baseDuration * totalReductionPercent) / 100)
                : 0;
            require(actualDuration > 0, "Duration must be greater than 0");

            ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
                inputItemId
            );
            require(drops.length > 0, "No output drops");

            if (
                factory.outputItemId.length == 0 ||
                factory.inputItemId != inputItemId
            ) {
                if (factory.outputItemId.length > 0) {
                    for (uint256 i = 0; i < factory.outputItemId.length; i++) {
                        require(
                            factory.claimedOutput[i] >= factory.totalOutput[i],
                            "Must claim all output items before switching input item"
                        );
                    }
                }
                factory.outputItemId = new uint256[](drops.length);
                factory.totalOutput = new uint256[](drops.length);
                factory.claimedOutput = new uint256[](drops.length); // Reset claimed

                for (uint256 i = 0; i < drops.length; i++) {
                    factory.outputItemId[i] = drops[i].itemId;
                    factory.totalOutput[i] = drops[i].yield * inputQty;
                    factory.claimedOutput[i] = 0;
                }
                factory.inputItemId = inputItemId;
                factory.startTime = currentTime; // Reset start time
                factory.productionEndTime = uint64(
                    currentTime + actualDuration
                );
            } else {
                // Update time
                if (factory.productionEndTime > currentTime) {
                    factory.productionEndTime += uint64(actualDuration);
                    
                    for (uint256 i = 0; i < drops.length; i++) {
                        for (uint256 j = 0; j < factory.outputItemId.length; j++) {
                            if (factory.outputItemId[j] == drops[i].itemId) {
                                factory.totalOutput[j] += (drops[i].yield * inputQty);
                                break;
                            }
                        }
                    }
                } else {
                    for (uint256 k = 0; k < factory.outputItemId.length; k++) {
                        require(
                            factory.claimedOutput[k] >= factory.totalOutput[k],
                            "Must claim finished rewards before restarting"
                        );
                    }
                    
                    factory.productionEndTime = uint64(
                        currentTime + actualDuration
                    );
                    factory.startTime = currentTime;

                    for (uint256 i = 0; i < drops.length; i++) {
                        for (uint256 j = 0; j < factory.outputItemId.length; j++) {
                            if (factory.outputItemId[j] == drops[i].itemId) {
                                factory.totalOutput[j] = (drops[i].yield * inputQty);
                                factory.claimedOutput[j] = 0; 
                                break;
                            }
                        }
                    }
                }
            }
        }
        // Ensure battery can cover the production time
        require(
            factory.productionEndTime <= factory.batteryExpiration,
            "Not enough battery for this production time"
        );

        factory.availableTime =
            factory.batteryExpiration -
            factory.productionEndTime;
        // Setup State for Factory
        factory.isActive = true;
        factory.processableQty += inputQty;
        automationProxy.setFactory(player, factoryId, factory);

        emit FactoryUpdateStatus(player, factoryId, factory);
    }

    /**
     * @dev Get maximum number of factories
     * @return The maximum number of factories
     */
    function getMaxFactory() external view returns (uint256) {
        return automationProxy.getMaxFactory();
    }

    /**
     * @dev Set maximum number of factories (admin only)
     * @param newMaxFactory The new maximum number of factories
     */
    function setMaxFactory(uint256 newMaxFactory) external onlyAdmin {
        automationProxy.setMaxFactory(newMaxFactory);
    }

    /**
     * @dev Get all factory prices
     * @return An array of all factory prices
     */
    function getAllFactoryPrices() external view returns (uint256[] memory) {
        return automationProxy.getAllFactoryPrices();
    }

    /**
     * @dev Claim produced items from the factory
     * @param factoryId The ID of the factory to claim from
     * @param _proof The cryptographic proof for authorization
     */
    function claim(
        uint256 factoryId,
        bytes calldata _proof
    ) external nonReentrant {
        address player = msg.sender;

        bytes32 message = keccak256(
            abi.encodePacked(player, factoryId, address(this), nonces[player])
        );
        address signer = ECDSA.recover(
            MessageHashUtils.toEthSignedMessageHash(message),
            _proof
        );

        require(
            IWorld(world).isAdmin(signer),
            "Invalid proof: not signed by admin"
        );
        nonces[player]++;

        FactoryState memory factory = automationProxy.getFactory(
            player,
            factoryId
        );
        require(factory.isOwned, "Not owned");

        (
            uint256[] memory itemDropIds,
            uint256[] memory amounts
        ) = getClaimableAmount(player, factoryId);

        uint256 itemDropId = 0;
        uint256 amount = 0;

        ItemStructs.Item memory itemDetails = itemProxy.getItem(
            factory.inputItemId
        );

        if (itemDetails.itemType == ItemStructs.ItemType.Seed) {
            itemDropId = itemDropIds[0];
            amount = amounts[0];
            factory.claimedOutput[0] += amount;
        }

        require(itemDropId > 0, "No claimable item");
        require(amount > 0, "No claimable amount");

        InventoryItem memory item = inventoryProxy.getItem(player, itemDropId);
        inventoryProxy.setItem(
            player,
            itemDropId,
            item.quantity + amount,
            item.durability,
            item.expiration
        );

        automationProxy.setFactory(player, factoryId, factory);

        emit FactoryClaimed(player, factoryId, itemDropId, amount, factory);
    }

    /**
     * @dev Get claimable amount from the factory
     * @param player The address of the player
     * @param factoryId The ID of the factory
     * @return itemDropIds The IDs of the claimable item drops
     * @return amounts The amounts of each claimable item drop
     */
    function getClaimableAmount(
        address player,
        uint256 factoryId
    )
        public
        view
        returns (uint256[] memory itemDropIds, uint256[] memory amounts)
    {
        uint64 currentTime = uint64(block.timestamp);
        FactoryState memory factory = automationProxy.getFactory(
            player,
            factoryId
        );
        if (!factory.isOwned || !factory.isActive)
            return (new uint256[](0), new uint256[](0));

        uint64 calculationTime = currentTime > factory.productionEndTime
            ? factory.productionEndTime
            : currentTime;

        uint256 timeElapsed = calculationTime - factory.startTime;
        uint256 totalDuration = factory.productionEndTime - factory.startTime;

        if (totalDuration == 0) return (new uint256[](0), new uint256[](0));

        amounts = new uint256[](factory.totalOutput.length);
        itemDropIds = new uint256[](factory.totalOutput.length);
        ItemStructs.ItemDrop[] memory drops = itemProxy.getItemDrops(
            factory.inputItemId
        );
        require(drops.length > 0, "No output drops");

        for (uint8 i = 0; i < factory.totalOutput.length; i++) {
            uint256 alreadyClaimed = factory.claimedOutput[i];
            uint256 totalExpected = factory.totalOutput[i];

            uint256 currentTotal = (totalExpected * timeElapsed) /
                totalDuration;

            if (currentTotal > totalExpected) currentTotal = totalExpected;

            if (currentTotal > alreadyClaimed) {
                amounts[i] = currentTotal - alreadyClaimed;
            } else {
                amounts[i] = 0;
            }
            itemDropIds[i] = factory.outputItemId[i];
        }
        return (itemDropIds, amounts);
    }

    function stopAndResetFactory(uint256 factoryId) external {
        address player = msg.sender;

        FactoryState memory factory = automationProxy.getFactory(
            player,
            factoryId
        );

        require(factory.isOwned, "Not owned");
        require(factory.isActive, "Factory not active");

        automationProxy.resetFactory(player, factoryId);

        emit FactoryStopped(player, factoryId);
    }
}
