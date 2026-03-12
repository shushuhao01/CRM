/**
 * 将SVG图标转换为PNG
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, '../src/static/icons')
const iconNames = ['home', 'home-active', 'calls', 'calls-active', 'stats', 'stats-active', 'settings', 'settings-active']

async function convertSvgToPng() {
  for (const name of iconNames) {
    const svgPath = path.join(iconsDir, `${name}.svg`)
    const pngPath = path.join(iconsDir, `${name}.png`)

    if (fs.existsSync(svgPath)) {
      try {
        await sharp(svgPath)
          .resize(81, 81)
          .png()
          .toFile(pngPath)
        console.log(`✓ 转换成功: ${name}.png`)
      } catch (err) {
        console.error(`✗ 转换失败: ${name}`, err.message)
      }
    } else {
      console.log(`跳过: ${name}.svg 不存在`)
    }
  }

  console.log('\n图标转换完成!')
}

convertSvgToPng()
