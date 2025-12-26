/**
 * SVG转PNG脚本
 * 使用方法: node scripts/svg-to-png.cjs
 */

const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
  try {
    // 动态导入sharp
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '../public/logo.svg');
    const outputDir = path.join(__dirname, '../public/icons');

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 读取SVG文件
    const svgBuffer = fs.readFileSync(svgPath);

    // 生成不同尺寸的PNG
    const sizes = [
      { name: 'logo-16.png', size: 16 },
      { name: 'logo-32.png', size: 32 },
      { name: 'logo-48.png', size: 48 },
      { name: 'logo-64.png', size: 64 },
      { name: 'logo-128.png', size: 128 },
      { name: 'logo-192.png', size: 192 },
      { name: 'logo-256.png', size: 256 },
      { name: 'logo-512.png', size: 512 },
      { name: 'logo-1024.png', size: 1024 },
    ];

    for (const { name, size } of sizes) {
      const outputPath = path.join(outputDir, name);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ 生成: ${name} (${size}x${size})`);
    }

    console.log('\n🎉 所有图标已生成到 public/icons/ 目录');
    console.log('\nAPP图标推荐使用:');
    console.log('  - Android: logo-192.png, logo-512.png');
    console.log('  - iOS: logo-1024.png');

  } catch (error) {
    console.error('❌ 转换失败:', error.message);
  }
}

convertSvgToPng();
