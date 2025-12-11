//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface INewYearComponent {
    function setHasMinted(address _player, bool _status) external;
    function isMinted(address _player) external view returns (bool);

    function getStartTime() external view returns (uint64);
    function setStartTime(uint64 _startTime) external;

    function getEndTime() external view returns (uint64);
    function setEndTime(uint64 _endTime) external;

    function canClaimNFT() external view returns (bool);
}
