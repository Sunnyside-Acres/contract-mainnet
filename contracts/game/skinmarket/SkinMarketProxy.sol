//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "../../interfaces/IWorld.sol";
import "../../struct/SkinMarket.sol";
contract SkinMarketProxy {
    address public world;
    address public implementation;

    /// @notice Mapping from NPC ID to NPCMarket struct
    mapping(uint256 => SkinMarket.NPCMarket) public npcMarkets;

    /// @notice Mapping from transaction ID to TransactionRecord
    mapping(uint256 => SkinMarket.TransactionRecord)
        public transactions;

    /// @notice Mapping from NPC ID to MarketStats
    mapping(uint256 => SkinMarket.MarketStats) public marketStats;
    /// @notice Mapping from (npcId, user) to UserMarketStats
    mapping(uint256 => mapping(address => SkinMarket.UserMarketStats))
        public userMarketStats;

    /// @notice Counter for transaction IDs
    uint256 public transactionCounter;

    event ComponentUpdated(address indexed newImplementation);

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    modifier onlyAuthorized() {
        require(IWorld(world).isLogicRegistered(msg.sender), "Unauthorized");
        _;
    }

    constructor(address _world, address _implementation) {
        world = _world;
        implementation = _implementation;
    }

    function upgrade(address newImplementation) external onlyAdmin {
        implementation = newImplementation;
        emit ComponentUpdated(newImplementation);
    }

    fallback() external onlyAuthorized {
        address impl = implementation;
        require(impl != address(0), "No implementation set");
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)
            switch result
            case 0 {
                revert(ptr, size)
            }
            default {
                return(ptr, size)
            }
        }
    }
}