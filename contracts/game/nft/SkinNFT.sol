//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SkinNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    IWorld public world;
    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[SkinNFT] Unauthorized"
        );
        _;
    }

    constructor(
        address _world,
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        world = IWorld(_world);
        _baseTokenURI = baseURI;
    }

    function updateBaseURI(
        string memory newBaseURI
    ) external onlyAuthorized {
        _baseTokenURI = newBaseURI;
    }

    function mint(address to, string memory uri) external onlyAuthorized returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        uint256 tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _nextTokenId++;

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

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}