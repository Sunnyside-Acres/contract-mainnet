const fs = require("fs");
const path = require("path");

// Đường dẫn tới thư mục deployed gốc và frontend
const rootDeployedPath = path.join(__dirname, "../../deployed");
const frontendDeployedPath = path.join(__dirname, "../deployed");

// Đảm bảo thư mục frontend/deployed tồn tại
if (!fs.existsSync(frontendDeployedPath)) {
  fs.mkdirSync(frontendDeployedPath, { recursive: true });
}

// Danh sách các file contract addresses cần đồng bộ
const contractAddressFiles = [
  "contract-addresses-localhost.json",
  "contract-addresses-seimainnet.json",
  "contract-addresses-seitestnet.json",
];

console.log("🔄 Đồng bộ contract addresses...");

contractAddressFiles.forEach((fileName) => {
  const sourcePath = path.join(rootDeployedPath, fileName);
  const targetPath = path.join(frontendDeployedPath, fileName);

  if (fs.existsSync(sourcePath)) {
    try {
      // Đọc file gốc
      const content = fs.readFileSync(sourcePath, "utf8");

      // Ghi file vào frontend
      fs.writeFileSync(targetPath, content);

      console.log(`✅ Đã đồng bộ: ${fileName}`);
    } catch (error) {
      console.error(`❌ Lỗi đồng bộ ${fileName}:`, error.message);
    }
  } else {
    console.log(`⚠️  File không tồn tại: ${fileName}`);
  }
});

console.log("🎉 Hoàn thành đồng bộ contract addresses!");
