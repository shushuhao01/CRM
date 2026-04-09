/**
 * 修复 crmAPP 所有缺失的图标文件
 * 确保 manifest.json 引用的每个图标都存在
 */
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', 'crmAPP', 'node_modules', 'sharp'));

const SRC = path.join(__dirname, '..', 'public', 'icons', 'logo-1024.png');
const APP_SRC = path.join(__dirname, '..', 'crmAPP', 'src');
const APP_ROOT = path.join(__dirname, '..', 'crmAPP');

// manifest.json 中引用的所有文件（相对于 src/ 或 crmAPP/ 目录）
const iconMap = {
  // Android icons (相对于 src/)
  'src/static/icons/logo-36.png': 36,
  'src/static/icons/logo-48.png': 48,
  'src/static/icons/logo-72.png': 72,
  'src/static/icons/logo-96.png': 96,
  'src/static/icons/logo-128.png': 128,
  'src/static/icons/logo-144.png': 144,
  'src/static/icons/logo-192.png': 192,
  'src/static/icons/logo-1024.png': 1024,
  // iOS icons (unpackage 在 crmAPP 根目录)
  'unpackage/res/icons/20x20.png': 20,
  'unpackage/res/icons/29x29.png': 29,
  'unpackage/res/icons/40x40.png': 40,
  'unpackage/res/icons/58x58.png': 58,
  'unpackage/res/icons/60x60.png': 60,
  'unpackage/res/icons/72x72.png': 72,
  'unpackage/res/icons/76x76.png': 76,
  'unpackage/res/icons/80x80.png': 80,
  'unpackage/res/icons/87x87.png': 87,
  'unpackage/res/icons/96x96.png': 96,
  'unpackage/res/icons/120x120.png': 120,
  'unpackage/res/icons/144x144.png': 144,
  'unpackage/res/icons/152x152.png': 152,
  'unpackage/res/icons/167x167.png': 167,
  'unpackage/res/icons/1024x1024.png': 1024,
};

async function main() {
  console.log('🔧 修复所有缺失图标文件\n');

  let fixed = 0;
  let ok = 0;

  for (const [relPath, size] of Object.entries(iconMap)) {
    const fullPath = path.join(APP_ROOT, relPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${relPath}`);
      ok++;
    } else {
      await sharp(SRC).resize(size, size, { kernel: 'lanczos3' }).png().toFile(fullPath);
      console.log(`  🔧 生成 ${relPath} (${size}x${size})`);
      fixed++;
    }
  }

  console.log(`\n✅ 已存在: ${ok} 个, 🔧 新生成: ${fixed} 个`);
}

main().catch(console.error);

