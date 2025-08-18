// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library WeatherStructs {
    // Enum để định nghĩa các trạng thái thời tiết
    enum WeatherState {
        Sunny,
        Rainy,
        Stormy,
        Cloudy
    }

    // Struct để lưu thông tin thời tiết
    struct Weather {
        WeatherState state; // Trạng thái thời tiết
        uint256 startTime; // Thời gian bắt đầu (timestamp)
        uint256 duration; // Thời gian kéo dài (tính bằng giây)
    }
}
