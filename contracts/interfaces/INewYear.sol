//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface INewYearComponent {
    function getStartTime() external view returns (uint64);
    function setStartTime(uint64 _startTime) external;

    function getEndTime() external view returns (uint64);
    function setEndTime(uint64 _endTime) external;

    function canClaimNFT() external view returns (bool);
}
