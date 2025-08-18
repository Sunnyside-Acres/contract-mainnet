// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct Plot {
    uint256 id;
    address owner; 
    uint256 plotType; // Loại đất (0=Thường, 1=Phì nhiêu, 2=Ma thuật)
    uint256 fertility; // Độ phì nhiêu (0-100, ảnh hưởng đến tốc độ phát triển cây)
    bool isActive; // Ô đất có sẵn sàng để trồng không
    int256 xCoordinate; // Tọa độ X trên lưới 2D
    int256 yCoordinate; // Tọa độ Y trên lưới 2D
    uint256 creationTime; // Thời gian ô đất được tạo
    bool isLocked; // Ô đất có bị khóa không (do sự kiện hoặc quy định)
}
