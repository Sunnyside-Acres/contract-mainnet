// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/ItemPass.sol";

interface IItemPassComponent {
    function setPass(address player, uint64 beginTime, uint64 endTime) external;

    function getPass(
        address player
    ) external view returns (ItemPassStruct memory);
    function checkActiveItemPass(address _player) external view returns (bool);
}