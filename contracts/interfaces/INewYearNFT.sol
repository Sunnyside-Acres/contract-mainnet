//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

interface INewYearNFT {
    function mint(address to) external returns (uint256);
    function isMinted(address to) external view returns (bool);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function totalSupply() external view returns (uint256);
}
