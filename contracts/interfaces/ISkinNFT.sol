//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
interface ISkinNFT {
    function mint(address to, string memory uri) external returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function totalSupply() external view returns (uint256);
    function updateBaseURI(string memory newBaseURI) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}
