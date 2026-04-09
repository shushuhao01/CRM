/**
 * 生成所有 HBuilderX 云打包需要的 App 图标
 * 从 logo-1024.png 源文件生成所有尺寸
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 支持从不同目录运行
const possiblePaths = [
    path.join(__dirname, '..', 'crmAPP', 'src', 'static', 'icons'),
    path.join(__dirname, 'src', 'static', 'icons'),
];
const SRC_ICONS_DIR = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
const SOURCE_ICON = path.join(SRC_ICONS_DIR, 'logo-1024.png');

// 所有 manifest.json 中需要的尺寸（Android + iOS）
const REQUIRED_SIZES = [
    // Android
    16, 20, 29, 36, 40, 48, 58, 60, 64, 72, 76, 80, 87, 96,
    120, 128, 144, 152, 167, 180, 192, 256, 512, 1024
];

async function generateIcons() {
    console.log('🎨 开始生成 App 图标...');
    console.log(`📁 源文件: ${SOURCE_ICON}`);
    console.log(`📁 输出目录: ${SRC_ICONS_DIR}`);

    if (!fs.existsSync(SOURCE_ICON)) {
        console.error('❌ 源文件不存在:', SOURCE_ICON);
        process.exit(1);
    }

    let generated = 0;
    let skipped = 0;

    for (const size of REQUIRED_SIZES) {
        const outputFile = path.join(SRC_ICONS_DIR, `logo-${size}.png`);

        if (fs.existsSync(outputFile)) {
            // 检查文件大小，如果太小可能是损坏的
            const stat = fs.statSync(outputFile);
            if (stat.size > 100) {
                console.log(`  ⏭️  logo-${size}.png 已存在 (${stat.size} bytes)，跳过`);
                skipped++;
                continue;
            }
        }

        try {
            await sharp(SOURCE_ICON)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toFile(outputFile);

            const stat = fs.statSync(outputFile);
            console.log(`  ✅ logo-${size}.png (${stat.size} bytes)`);
            generated++;
        } catch (err) {
            console.error(`  ❌ logo-${size}.png 生成失败:`, err.message);
        }
    }

    console.log(`\n📊 完成: 生成 ${generated} 个，跳过 ${skipped} 个`);
    console.log('✅ 所有图标生成完毕！');
}

generateIcons().catch(console.error);


