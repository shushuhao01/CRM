/**
 * 为 crmAPP 生成云打包所需的所有尺寸APP图标
 * 从 public/icons/logo-1024.png 源文件缩放
 */
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', 'crmAPP', 'node_modules', 'sharp'));

const SRC = path.join(__dirname, '..', 'public', 'icons', 'logo-1024.png');
const DEST = path.join(__dirname, '..', 'crmAPP', 'src', 'static', 'icons');

// Android需要的尺寸
const ANDROID_SIZES = [48, 64, 128, 192];
// iOS需要的尺寸
const IOS_SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 1024];
// 合并去重
const ALL_SIZES = [...new Set([...ANDROID_SIZES, ...IOS_SIZES])].sort((a, b) => a - b);

async function main() {
  console.log('📱 生成 crmAPP 云打包所需图标\n');

  // 确保 iOS 图标目录存在
  const iosDir = path.join(__dirname, '..', 'crmAPP', 'unpackage', 'res', 'icons');
  if (!fs.existsSync(iosDir)) {
    fs.mkdirSync(iosDir, { recursive: true });
  }

  // 生成 Android 图标到 static/icons/
  for (const size of ANDROID_SIZES) {
    const out = path.join(DEST, `logo-${size}.png`);
    await sharp(SRC).resize(size, size, { kernel: 'lanczos3' }).png().toFile(out);
    console.log(`  ✅ static/icons/logo-${size}.png`);
  }

  // 生成 1024 给 iOS App Store
  const out1024 = path.join(DEST, 'logo-1024.png');
  await sharp(SRC).resize(1024, 1024).png().toFile(out1024);
  console.log(`  ✅ static/icons/logo-1024.png`);

  // 生成 iOS 各种特殊尺寸到 unpackage/res/icons/
  for (const size of IOS_SIZES) {
    const out = path.join(iosDir, `${size}x${size}.png`);
    await sharp(SRC).resize(size, size, { kernel: 'lanczos3' }).png().toFile(out);
    console.log(`  ✅ unpackage/res/icons/${size}x${size}.png`);
  }

  console.log(`\n🎉 完成！共生成 ${ANDROID_SIZES.length + 1 + IOS_SIZES.length} 个图标文件`);
}

main().catch(console.error);

