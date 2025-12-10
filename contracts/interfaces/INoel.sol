// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface INoelComponent {
    function addGift(address to, uint256 amount) external;
    function getGifts(address to) external view returns (uint256);
}
