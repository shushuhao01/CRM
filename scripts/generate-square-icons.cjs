/**
 * 云客CRM外呼助手 - 直角应用图标生成脚本
 *
 * 基于现有圆角图标，生成多种配色、多种尺寸的直角图标
 *
 * 用法: node scripts/generate-square-icons.cjs
 */

const fs = require('fs');
const path = require('path');

// 尝试多个位置加载 sharp
let sharp;
const sharpPaths = [
  path.join(__dirname, '..', 'node_modules', 'sharp'),
  path.join(__dirname, '..', 'crmAPP', 'node_modules', 'sharp'),
  path.join(__dirname, '..', 'backend', 'node_modules', 'sharp'),
  'sharp'
];
for (const p of sharpPaths) {
  try { sharp = require(p); break; } catch(e) {}
}
if (!sharp) {
  console.error('找不到 sharp 模块');
  process.exit(1);
}

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons-square');

// 需要生成的尺寸
const SIZES = [16, 32, 48, 64, 128, 192, 256, 512, 1024];

// 配色方案
const COLOR_THEMES = [
  {
    name: 'green',         // 品牌主色 - 翠绿
    label: '翠绿(品牌色)',
    bg: '#10B981',
    iconColor: '#FFFFFF',
    phoneCircleBg: 'rgba(255,255,255,0.25)',
  },
  {
    name: 'green-gradient', // 绿色渐变
    label: '绿色渐变',
    bgGradient: ['#6EE7B7', '#10B981'],
    iconColor: '#FFFFFF',
    phoneCircleBg: 'rgba(255,255,255,0.25)',
  },
  {
    name: 'dark-green',    // 深绿
    label: '深绿专业',
    bg: '#065F46',
    iconColor: '#34D399',
    phoneCircleBg: 'rgba(52,211,153,0.2)',
  },
  {
    name: 'blue',          // 商务蓝
    label: '商务蓝',
    bg: '#2563EB',
    iconColor: '#FFFFFF',
    phoneCircleBg: 'rgba(255,255,255,0.25)',
  },
  {
    name: 'blue-gradient',  // 蓝色渐变
    label: '蓝色渐变',
    bgGradient: ['#60A5FA', '#2563EB'],
    iconColor: '#FFFFFF',
    phoneCircleBg: 'rgba(255,255,255,0.25)',
  },
  {
    name: 'dark',          // 深色
    label: '暗黑科技',
    bg: '#1F2937',
    iconColor: '#34D399',
    phoneCircleBg: 'rgba(52,211,153,0.15)',
  },
  {
    name: 'white',         // 白底绿字
    label: '白底绿标',
    bg: '#FFFFFF',
    iconColor: '#10B981',
    phoneCircleBg: 'rgba(16,185,129,0.12)',
    border: '#E5E7EB',
  },
  {
    name: 'orange',        // 活力橙
    label: '活力橙',
    bg: '#F97316',
    iconColor: '#FFFFFF',
    phoneCircleBg: 'rgba(255,255,255,0.25)',
  },
  {
    name: 'purple',        // 紫色
    label: '优雅紫',
    bgGradient: ['#A78BFA', '#7C3AED'],
    iconColor: '#FFFFFF',
    phoneCircleBg: 'rgba(255,255,255,0.25)',
  },
  {
    name: 'teal',          // 青色
    label: '清新青',
    bgGradient: ['#5EEAD4', '#14B8A6'],
    iconColor: '#FFFFFF',
    phoneCircleBg: 'rgba(255,255,255,0.25)',
  },
];

/**
 * 生成电话听筒 SVG 图标（直角正方形背景）
 */
function generateIconSVG(size, theme) {
  const s = size;
  const padding = s * 0.15;
  const iconArea = s - padding * 2;

  // 电话听筒图标参数
  const cx = s / 2;
  const cy = s / 2;
  const phoneSize = iconArea * 0.38;  // 听筒大小
  const circleR = iconArea * 0.32;     // 背景圆半径

  // 背景
  let bgDef = '';
  let bgFill = '';

  if (theme.bgGradient) {
    bgDef = `
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${theme.bgGradient[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${theme.bgGradient[1]};stop-opacity:1" />
        </linearGradient>
      </defs>`;
    bgFill = 'url(#bgGrad)';
  } else {
    bgFill = theme.bg;
  }

  // 边框（白底时用）
  const borderAttr = theme.border ? `stroke="${theme.border}" stroke-width="${Math.max(1, s * 0.005)}"` : '';

  // 电话听筒 path (标准化的电话图标，旋转135度表示拨出)
  // 我们使用经典的电话听筒形状
  const phoneScale = phoneSize / 24; // 基于24px viewBox缩放
  const phoneTx = cx - 12 * phoneScale;
  const phoneTy = cy - 12 * phoneScale;

  // 云客CRM的"云"字元素 - 简化为电话+信号波纹
  const waveR1 = circleR + s * 0.06;
  const waveR2 = circleR + s * 0.12;
  const waveOpacity1 = 0.15;
  const waveOpacity2 = 0.08;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${bgDef}
  <!-- 直角正方形背景 -->
  <rect x="0" y="0" width="${s}" height="${s}" fill="${bgFill}" ${borderAttr}/>

  <!-- 外圈信号波纹 -->
  <circle cx="${cx}" cy="${cy}" r="${waveR2}" fill="none" stroke="${theme.iconColor}" stroke-opacity="${waveOpacity2}" stroke-width="${Math.max(1, s * 0.01)}"/>
  <circle cx="${cx}" cy="${cy}" r="${waveR1}" fill="none" stroke="${theme.iconColor}" stroke-opacity="${waveOpacity1}" stroke-width="${Math.max(1, s * 0.012)}"/>

  <!-- 电话图标背景圆 -->
  <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${theme.phoneCircleBg}"/>

  <!-- 电话听筒图标 -->
  <g transform="translate(${phoneTx}, ${phoneTy}) scale(${phoneScale})">
    <!-- 旋转的电话听筒，表示外呼动作 -->
    <g transform="rotate(-30, 12, 12)">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-3 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
            fill="${theme.iconColor}"/>
    </g>
  </g>
</svg>`;

  return svg;
}

/**
 * 生成更精致的电话图标SVG（方案B：简洁风格）
 */
function generateIconSVG_V2(size, theme) {
  const s = size;

  // 背景
  let bgDef = '';
  let bgFill = '';

  if (theme.bgGradient) {
    bgDef = `
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${theme.bgGradient[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${theme.bgGradient[1]};stop-opacity:1" />
        </linearGradient>
      </defs>`;
    bgFill = 'url(#bgGrad)';
  } else {
    bgFill = theme.bg;
  }

  const borderAttr = theme.border ? `stroke="${theme.border}" stroke-width="${Math.max(1, s * 0.006)}"` : '';

  const cx = s / 2;
  const cy = s / 2;

  // 比例参数
  const circleR = s * 0.28;
  const phoneScale = s / 512;

  // 信号弧线
  const arcR1 = circleR + s * 0.08;
  const arcR2 = circleR + s * 0.15;
  const arcStroke = Math.max(1.5, s * 0.02);

  // 右上角的信号弧线 (表示信号发射/外呼)
  const arcAngleStart = -60;
  const arcAngleEnd = 10;

  function arcPath(r, startDeg, endDeg) {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${bgDef}
  <!-- 直角正方形背景 -->
  <rect x="0" y="0" width="${s}" height="${s}" fill="${bgFill}" ${borderAttr}/>

  <!-- 信号弧线（右上方） -->
  <path d="${arcPath(arcR1, arcAngleStart, arcAngleEnd)}" fill="none" stroke="${theme.iconColor}" stroke-opacity="0.4" stroke-width="${arcStroke}" stroke-linecap="round"/>
  <path d="${arcPath(arcR2, arcAngleStart, arcAngleEnd)}" fill="none" stroke="${theme.iconColor}" stroke-opacity="0.2" stroke-width="${arcStroke}" stroke-linecap="round"/>

  <!-- 电话图标背景圆 -->
  <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${theme.phoneCircleBg}"/>

  <!-- 电话听筒图标 (Material Design phone icon) -->
  <g transform="translate(${cx - 10 * phoneScale * 10}, ${cy - 10 * phoneScale * 10}) scale(${phoneScale * 10})">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
          fill="${theme.iconColor}" transform="translate(2,2)"/>
  </g>
</svg>`;

  return svg;
}

/**
 * 生成简约CRM电话图标（方案C：最终使用版）
 */
function generateCleanIcon(size, theme) {
  const s = size;

  let bgDef = '';
  let bgFill = '';

  if (theme.bgGradient) {
    bgDef = `
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.bgGradient[0]}"/>
          <stop offset="100%" stop-color="${theme.bgGradient[1]}"/>
        </linearGradient>
      </defs>`;
    bgFill = 'url(#bg)';
  } else {
    bgFill = theme.bg;
  }

  const borderAttr = theme.border
    ? `stroke="${theme.border}" stroke-width="${Math.max(1, Math.round(s * 0.004))}"`
    : '';

  const cx = s / 2;
  const cy = s / 2;
  const iconScale = s / 100; // 基于100单位的设计

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
${bgDef}
  <!-- 直角正方形背景 -->
  <rect x="0" y="0" width="${s}" height="${s}" fill="${bgFill}" ${borderAttr}/>

  <g transform="translate(${cx}, ${cy}) scale(${iconScale})">
    <!-- 背景圆 -->
    <circle cx="0" cy="0" r="28" fill="${theme.phoneCircleBg}"/>

    <!-- 外圈信号弧线 -->
    <path d="M 18 -26 A 32 32 0 0 1 32 -6" fill="none" stroke="${theme.iconColor}" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 22 -33 A 40 40 0 0 1 40 -4" fill="none" stroke="${theme.iconColor}" stroke-opacity="0.18" stroke-width="2.5" stroke-linecap="round"/>

    <!-- 电话听筒 (经典形状，居中) -->
    <g transform="scale(1.6) translate(-12, -12)">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
            fill="${theme.iconColor}"/>
    </g>
  </g>
</svg>`;

  return svg;
}

async function main() {
  console.log('🎨 云客CRM外呼助手 - 直角图标生成器');
  console.log('====================================\n');

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalCount = 0;

  for (const theme of COLOR_THEMES) {
    const themeDir = path.join(OUTPUT_DIR, theme.name);
    if (!fs.existsSync(themeDir)) {
      fs.mkdirSync(themeDir, { recursive: true });
    }

    console.log(`📁 ${theme.label} (${theme.name}/)`);

    for (const size of SIZES) {
      const svgContent = generateCleanIcon(size, theme);
      const svgPath = path.join(themeDir, `logo-${size}.svg`);
      const pngPath = path.join(themeDir, `logo-${size}.png`);

      // 保存 SVG
      fs.writeFileSync(svgPath, svgContent);

      // 转换为 PNG
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(pngPath);

      totalCount++;
    }

    console.log(`   ✅ 已生成 ${SIZES.length} 个尺寸: ${SIZES.join(', ')}px`);
  }

  // 生成预览 HTML
  generatePreviewHTML();

  console.log(`\n🎉 完成！共生成 ${totalCount} 个 PNG + ${totalCount} 个 SVG 图标`);
  console.log(`📂 输出目录: ${OUTPUT_DIR}`);
  console.log(`🌐 预览页面: ${path.join(OUTPUT_DIR, 'preview.html')}`);
  console.log('\n💡 选好配色后，把对应文件夹中的图标复制到 crmAPP/src/static/icons/ 即可');
}

function generatePreviewHTML() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>云客CRM外呼助手 - 直角图标预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6; padding: 30px; color: #1f2937;
    }
    h1 { text-align: center; margin-bottom: 10px; font-size: 28px; }
    .subtitle { text-align: center; color: #6b7280; margin-bottom: 40px; }
    .theme-section {
      background: white; border-radius: 12px; padding: 24px;
      margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .theme-header {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;
    }
    .theme-header h2 { font-size: 18px; }
    .theme-header .badge {
      background: #f3f4f6; padding: 2px 10px; border-radius: 12px;
      font-size: 13px; color: #6b7280;
    }
    .icons-row {
      display: flex; align-items: end; gap: 16px; flex-wrap: wrap;
      padding: 10px 0;
    }
    .icon-item { text-align: center; }
    .icon-item img {
      display: block; margin: 0 auto 6px;
      border: 1px solid #e5e7eb;
    }
    .icon-item .size { font-size: 11px; color: #9ca3af; }
    .recommend {
      display: inline-block; background: #DEF7EC; color: #065F46;
      padding: 2px 8px; border-radius: 8px; font-size: 12px;
      margin-left: 8px; font-weight: 500;
    }
    .tip {
      background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px;
      padding: 16px; margin-top: 30px; color: #92400E; line-height: 1.6;
    }
    .store-sizes {
      background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px;
      padding: 16px; margin-top: 16px; color: #1E40AF; line-height: 1.8;
    }
  </style>
</head>
<body>
  <h1>🎨 云客CRM外呼助手 - 直角图标预览</h1>
  <p class="subtitle">共 ${COLOR_THEMES.length} 种配色 × ${SIZES.length} 种尺寸 = ${COLOR_THEMES.length * SIZES.length} 个图标 | 生成时间: ${new Date().toLocaleString('zh-CN')}</p>

${COLOR_THEMES.map((theme, idx) => `
  <div class="theme-section">
    <div class="theme-header">
      <h2>${idx + 1}. ${theme.label}</h2>
      <span class="badge">${theme.name}/</span>
      ${theme.name === 'green' ? '<span class="recommend">⭐ 推荐：品牌主色</span>' : ''}
      ${theme.name === 'green-gradient' ? '<span class="recommend">⭐ 推荐：渐变效果</span>' : ''}
      ${theme.name === 'dark' ? '<span class="recommend">🌙 推荐：暗色风格</span>' : ''}
    </div>
    <div class="icons-row">
      ${SIZES.map(size => `
        <div class="icon-item">
          <img src="${theme.name}/logo-${size}.png" width="${Math.min(size, 128)}" height="${Math.min(size, 128)}" alt="${size}px"/>
          <span class="size">${size}px</span>
        </div>
      `).join('')}
    </div>
  </div>
`).join('')}

  <div class="tip">
    <strong>💡 使用说明：</strong><br/>
    1. 选择你喜欢的配色方案<br/>
    2. 复制该文件夹下的 <code>logo-1024.png</code> 到 <code>crmAPP/src/static/icons/</code>，用于 HBuilderX 自动生成各尺寸图标<br/>
    3. 上传 <code>logo-512.png</code> 到应用商店作为应用图标<br/>
    4. SVG 文件可用于网页和矢量场景
  </div>

  <div class="store-sizes">
    <strong>📱 各商店图标要求：</strong><br/>
    • <strong>小米应用商店</strong>：512×512 PNG<br/>
    • <strong>华为应用市场</strong>：216×216 PNG<br/>
    • <strong>Google Play</strong>：512×512 PNG（32位带Alpha通道）<br/>
    • <strong>Apple App Store</strong>：1024×1024 PNG（不能有Alpha通道）<br/>
    • <strong>HBuilderX 云打包</strong>：1024×1024 PNG（自动生成各尺寸）<br/>
    • <strong>Android Adaptive Icon</strong>：108×108 前景 + 背景
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'preview.html'), html);
}

main().catch(console.error);

