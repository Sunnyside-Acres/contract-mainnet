// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../interfaces/INoel.sol";
import "../../interfaces/IInventory.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NoelLogic is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    IWorld public world;
    INoelComponent public noelProxy;
    IInventoryComponent public inventoryProxy;
    uint256 public maxSupply;
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    constructor(
        address _world,
        address _noelProxy,
        address _inventoryProxy,
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        world = IWorld(_world);
        noelProxy = INoelComponent(_noelProxy);
        inventoryProxy = IInventoryComponent(_inventoryProxy);
        maxSupply = _maxSupply;
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function safeMint(
        address to,
        string memory uri
    ) public onlyAdmin returns (uint256) {
        require(_nextTokenId < maxSupply, "Max supply reached");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function claimGift(
        uint256 itemId,
        uint256 amount,
        bytes calldata proof
    ) external {
        address player = msg.sender;
        uint256 giftAmount = noelProxy.getGifts(player);
        require(giftAmount > 0, "No gifts to claim");

        noelProxy.addGift(player, type(uint256).max - giftAmount);
    }
}
