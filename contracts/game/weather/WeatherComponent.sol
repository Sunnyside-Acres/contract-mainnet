// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IWorld.sol";
import "../../struct/Weather.sol";

contract WeatherComponent {
    address public world;
    address public admin;
    address public implementation;

    // Thông tin thời tiết hiện tại
    WeatherStructs.Weather public currentWeather;

    // Các thông số cấu hình
    uint256 public constant MIN_DURATION = 15 * 60; // 15 phút (tính bằng giây)
    uint256 public constant MAX_DURATION = 60 * 60; // 1 tiếng (tính bằng giây)
    uint256 public constant HOUR_DURATION = 60 * 60; // 1 tiếng
    uint256 public constant HOUR_AND_HALF_DURATION = 90 * 60; // 1 tiếng 30 phút

    modifier onlyAuthorized() {
        require(
            IWorld(world).isLogicRegistered(msg.sender),
            "[COMPONENT] Unauthorized"
        );
        _;
    }

    modifier onlyAdmin() {
        require(IWorld(world).isAdmin(msg.sender), "Not authorized as admin");
        _;
    }

    event WeatherUpdated(
        WeatherStructs.WeatherState newState,
        uint256 startTime,
        uint256 duration
    );

    event WeatherInitialized(
        WeatherStructs.WeatherState initialState,
        uint256 startTime,
        uint256 duration
    );

    // Sử dụng nonce để tăng tính ngẫu nhiên
    uint256 private nonce = 0;

    function random(uint256 max) private returns (uint256) {
        nonce++;
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.number,
                        nonce,
                        msg.sender
                    )
                )
            ) % max;
    }

    function updateWeather() public onlyAuthorized returns (bool) {
        if (
            block.timestamp >=
            currentWeather.startTime + currentWeather.duration
        ) {
            uint256 randomState = random(4); // Sửa từ 5 thành 4
            WeatherStructs.WeatherState newState = WeatherStructs.WeatherState(
                randomState
            );

            uint256 newDuration = MIN_DURATION +
                (random(MAX_DURATION - MIN_DURATION + 1));

            // Cập nhật thời tiết mới
            currentWeather = WeatherStructs.Weather({
                state: newState,
                startTime: block.timestamp,
                duration: newDuration
            });

            emit WeatherUpdated(newState, block.timestamp, newDuration);
            return true;
        }
        return false;
    }

    function getCurrentWeather()
        external
        view
        returns (WeatherStructs.Weather memory)
    {
        return currentWeather;
    }

    function getCurrentWeatherState()
        external
        view
        returns (WeatherStructs.WeatherState)
    {
        return currentWeather.state;
    }

    // Hàm để kiểm tra xem thời tiết có cần cập nhật không
    function shouldUpdateWeather() external view returns (bool) {
        return
            block.timestamp >=
            currentWeather.startTime + currentWeather.duration;
    }
}
