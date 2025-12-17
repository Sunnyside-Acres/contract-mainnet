//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INewYear.sol";
import "../../interfaces/INewYearNFT.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NewYearLogic {
    IWorld public world;
    INewYearComponent public newYearProxy;
    INewYearNFT public newYearNFT;

    mapping(address => uint256) public nonces;

    event ClaimNFT(address indexed player, uint256 indexed tokenId);

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(address _world, address _newYearProxy, address _newYearNFT) {
        world = IWorld(_world);
        newYearProxy = INewYearComponent(_newYearProxy);
        newYearNFT = INewYearNFT(_newYearNFT);
    }

    function safeMint(bytes calldata proof) external {
        address player = msg.sender;
        bytes32 message = keccak256(
            abi.encodePacked(player, address(this), nonces[player])
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            message
        );
        address signer = ECDSA.recover(ethSignedMessageHash, proof);
        require(
            IWorld(world).isAdmin(signer),
            "Invalid proof: not signed by admin"
        );
        nonces[player]++;
        require(
            uint64(block.timestamp) <= newYearProxy.getEndTime(),
            "Event has ended"
        );
        require(newYearProxy.canClaimNFT(), "Not within claim period");

        uint256 tokenId = newYearNFT.mint(player);

        emit ClaimNFT(player, tokenId);
    }

    function canClaimNFT() external view returns (bool) {
        return newYearProxy.canClaimNFT();
    }

    function getStartTime() external view returns (uint64) {
        return newYearProxy.getStartTime();
    }

    function setStartTime(uint64 _startTime) external onlyAdmin {
        newYearProxy.setStartTime(_startTime);
    }

    function getEndTime() external view returns (uint64) {
        return newYearProxy.getEndTime();
    }

    function setEndTime(uint64 _endTime) external onlyAdmin {
        newYearProxy.setEndTime(_endTime);
    }

    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
    }

    function isMinted(address to) external view returns (bool) {
        return newYearNFT.isMinted(to);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return newYearNFT.tokenURI(tokenId);
    }

    function name() external view returns (string memory) {
        return newYearNFT.name();
    }

    function symbol() external view returns (string memory) {
        return newYearNFT.symbol();
    }
}