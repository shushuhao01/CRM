/**
 * 云客CRM - 三系统图标批量生成（直角+圆角，多尺寸）
 *
 * CRM系统(绿色) + 官网(紫色) + 管理后台(青蓝色)
 *
 * 用法: node scripts/generate-all-system-icons.cjs
 */

const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', 'crmAPP', 'node_modules', 'sharp'));

const OUTPUT_BASE = path.join(__dirname, '..', 'public', 'system-icons');
const SIZES = [16, 32, 48, 64, 128, 192, 256, 512, 1024];

// 三个系统的配置
const SYSTEMS = [
  {
    id: 'crm',
    name: 'CRM系统',
    color1: '#6EE7B7',   // 渐变起始
    color2: '#34D399',   // 渐变结束
    desc: '主业务系统（绿色）',
  },
  {
    id: 'website',
    name: '官网Website',
    color1: '#6366F1',
    color2: '#8B5CF6',
    desc: '产品官网（紫色）',
  },
  {
    id: 'admin',
    name: '管理后台Admin',
    color1: '#67E8F9',
    color2: '#06B6D4',
    desc: '管理后台（青蓝色）',
  },
];

/**
 * 生成SVG图标
 * @param {number} size - 图标尺寸
 * @param {object} system - 系统配置
 * @param {boolean} rounded - true=圆角, false=直角
 */
function generateSVG(size, system, rounded) {
  const s = size;
  const rx = rounded ? Math.round(s * 10 / 44) : 0;  // 圆角半径，按比例缩放

  // 内部图形的比例参数（基于 44px 设计稿）
  const scale = s / 44;

  // 四宫格图形的坐标（按比例缩放）
  const r1x = Math.round(10 * scale);  // 左上方块 x
  const r1y = Math.round(10 * scale);  // 左上方块 y
  const r1s = Math.round(10 * scale);  // 左上方块 尺寸
  const r1r = Math.round(2 * scale);   // 左上方块 圆角

  const c1x = Math.round(29 * scale);  // 右上圆 cx
  const c1y = Math.round(15 * scale);  // 右上圆 cy
  const c1r = Math.round(5 * scale);   // 右上圆 r

  const r2x = Math.round(10 * scale);  // 左下圆角方块 x
  const r2y = Math.round(24 * scale);  // 左下圆角方块 y
  const r2s = Math.round(10 * scale);  // 左下圆角方块 尺寸
  const r2r = Math.round(5 * scale);   // 左下圆角方块 圆角(胶囊)

  const r3x = Math.round(24 * scale);  // 右下方块 x
  const r3y = Math.round(24 * scale);  // 右下方块 y
  const r3s = Math.round(10 * scale);  // 右下方块 尺寸
  const r3r = Math.round(2 * scale);   // 右下方块 圆角

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${system.color1}"/>
      <stop offset="100%" stop-color="${system.color2}"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${rx}" fill="url(#bg)"/>
  <rect x="${r1x}" y="${r1y}" width="${r1s}" height="${r1s}" rx="${r1r}" fill="white"/>
  <circle cx="${c1x}" cy="${c1y}" r="${c1r}" fill="white" opacity="0.85"/>
  <rect x="${r2x}" y="${r2y}" width="${r2s}" height="${r2s}" rx="${r2r}" fill="white" opacity="0.7"/>
  <rect x="${r3x}" y="${r3y}" width="${r3s}" height="${r3s}" rx="${r3r}" fill="white"/>
</svg>`;

  return svg;
}

async function main() {
  console.log('🎨 云客CRM - 三系统图标批量生成器');
  console.log('===================================');
  console.log('  CRM系统(绿) + 官网(紫) + 管理后台(青蓝)');
  console.log('  直角 + 圆角，共 9 种尺寸\n');

  if (!fs.existsSync(OUTPUT_BASE)) {
    fs.mkdirSync(OUTPUT_BASE, { recursive: true });
  }

  let total = 0;

  for (const system of SYSTEMS) {
    console.log(`\n📦 ${system.name} (${system.desc})`);

    for (const type of ['square', 'rounded']) {
      const isRounded = type === 'rounded';
      const typeLabel = isRounded ? '圆角' : '直角';
      const dirName = `${system.id}-${type}`;
      const dirPath = path.join(OUTPUT_BASE, dirName);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      for (const size of SIZES) {
        const svgContent = generateSVG(size, system, isRounded);

        // 保存 SVG
        fs.writeFileSync(path.join(dirPath, `logo-${size}.svg`), svgContent);

        // 转换为 PNG
        await sharp(Buffer.from(svgContent))
          .resize(size, size)
          .png({ quality: 100, compressionLevel: 9 })
          .toFile(path.join(dirPath, `logo-${size}.png`));

        total++;
      }

      console.log(`   ✅ ${typeLabel}: ${SIZES.length} 个尺寸 → ${dirName}/`);
    }
  }

  // 额外：为每个系统生成 favicon.ico 格式（16+32+48合并）
  console.log('\n📌 生成 favicon 文件...');
  for (const system of SYSTEMS) {
    for (const type of ['square', 'rounded']) {
      const dirPath = path.join(OUTPUT_BASE, `${system.id}-${type}`);
      // 生成一个32px的favicon.png作为替代（ICO格式需要额外库）
      const svg32 = generateSVG(32, system, type === 'rounded');
      await sharp(Buffer.from(svg32))
        .resize(32, 32)
        .png()
        .toFile(path.join(dirPath, 'favicon.png'));
    }
  }

  // 生成总预览页面
  generatePreviewHTML();

  console.log(`\n🎉 全部完成！共生成 ${total} 组图标 (PNG+SVG)`);
  console.log(`📂 输出目录: ${OUTPUT_BASE}`);
  console.log(`🌐 预览页面: ${path.join(OUTPUT_BASE, 'preview.html')}`);
}

function generatePreviewHTML() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>云客CRM - 三系统图标预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; padding: 30px; color: #1f2937; }
    h1 { text-align: center; margin-bottom: 8px; font-size: 26px; }
    .subtitle { text-align: center; color: #6b7280; margin-bottom: 32px; }

    .system-block { margin-bottom: 36px; }
    .system-title {
      font-size: 20px; font-weight: 700; margin-bottom: 16px;
      display: flex; align-items: center; gap: 10px;
    }
    .system-title .dot {
      width: 14px; height: 14px; border-radius: 3px; display: inline-block;
    }
    .system-title .tag {
      font-size: 12px; font-weight: 400; background: #F3F4F6;
      color: #6B7280; padding: 2px 10px; border-radius: 10px;
    }

    .type-row {
      display: flex; gap: 20px; margin-bottom: 14px;
    }
    .type-card {
      flex: 1; background: white; border-radius: 12px; padding: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .type-card h3 { font-size: 15px; margin-bottom: 12px; color: #374151; }
    .type-card .badge {
      display: inline-block; font-size: 11px; padding: 1px 8px;
      border-radius: 6px; margin-left: 6px; font-weight: 500;
    }
    .badge-square { background: #DBEAFE; color: #1E40AF; }
    .badge-rounded { background: #FEF3C7; color: #92400E; }

    .icons-flex {
      display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
    }
    .icon-cell { text-align: center; }
    .icon-cell img { display: block; margin: 0 auto 4px; border: 1px solid #E5E7EB; }
    .icon-cell .sz { font-size: 10px; color: #9CA3AF; }

    /* 对比区域 */
    .compare-section {
      background: white; border-radius: 12px; padding: 24px; margin-top: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .compare-section h2 { font-size: 18px; margin-bottom: 16px; }
    .compare-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    }
    .compare-item { text-align: center; }
    .compare-item .label { font-size: 13px; color: #6B7280; margin-bottom: 8px; }
    .compare-pair { display: flex; justify-content: center; gap: 16px; align-items: center; }
    .compare-pair .arrow { color: #D1D5DB; font-size: 18px; }
    .compare-pair .tag { font-size: 10px; color: #9CA3AF; margin-top: 2px; }

    .tip {
      background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px;
      padding: 16px; margin-top: 24px; color: #92400E; line-height: 1.7; font-size: 14px;
    }
    .folder-map {
      background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;
      padding: 16px; margin-top: 14px; color: #166534; line-height: 1.8; font-size: 14px;
    }
    code { background: rgba(0,0,0,0.06); padding: 1px 5px; border-radius: 3px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>🎨 云客CRM - 三系统图标预览</h1>
  <p class="subtitle">
    CRM系统(绿) · 官网(紫) · 管理后台(青蓝) — 直角 + 圆角 × 9种尺寸 = ${SYSTEMS.length * 2 * SIZES.length} 个图标
  </p>

  <!-- 大图对比 -->
  <div class="compare-section">
    <h2>🔍 三系统对比 (128px)</h2>
    <div class="compare-grid">
      ${SYSTEMS.map(sys => `
        <div class="compare-item">
          <div class="label">${sys.name}</div>
          <div class="compare-pair">
            <div>
              <img src="${sys.id}-rounded/logo-128.png" width="96" height="96" style="border:1px solid #e5e7eb; border-radius: 8px;"/>
              <div class="tag">圆角</div>
            </div>
            <span class="arrow">⇄</span>
            <div>
              <img src="${sys.id}-square/logo-128.png" width="96" height="96" style="border:1px solid #e5e7eb;"/>
              <div class="tag">直角</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- 每个系统详细 -->
  ${SYSTEMS.map(sys => `
  <div class="system-block" style="margin-top: 30px;">
    <div class="system-title">
      <span class="dot" style="background: linear-gradient(135deg, ${sys.color1}, ${sys.color2});"></span>
      ${sys.name}
      <span class="tag">${sys.desc}</span>
    </div>
    <div class="type-row">
      ${['square', 'rounded'].map(type => `
        <div class="type-card">
          <h3>
            ${type === 'square' ? '🔲 直角版' : '🔵 圆角版'}
            <span class="badge ${type === 'square' ? 'badge-square' : 'badge-rounded'}">
              ${sys.id}-${type}/
            </span>
          </h3>
          <div class="icons-flex">
            ${SIZES.map(size => `
              <div class="icon-cell">
                <img src="${sys.id}-${type}/logo-${size}.png"
                     width="${Math.min(size, 96)}" height="${Math.min(size, 96)}"
                     ${type === 'rounded' ? 'style="border-radius:' + Math.round(Math.min(size,96)*10/44) + 'px;"' : ''}/>
                <span class="sz">${size}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  `).join('')}

  <div class="folder-map">
    <strong>📁 文件夹对照：</strong><br/>
    <code>crm-square/</code> → CRM系统直角图标 → 替换到 <code>public/icons/</code><br/>
    <code>crm-rounded/</code> → CRM系统圆角图标（已有原版）<br/>
    <code>website-square/</code> → 官网直角图标<br/>
    <code>website-rounded/</code> → 官网圆角图标 → 替换到 <code>website/public/</code><br/>
    <code>admin-square/</code> → 管理后台直角图标<br/>
    <code>admin-rounded/</code> → 管理后台圆角图标 → 替换到 <code>admin/public/</code>
  </div>

  <div class="tip">
    <strong>💡 使用建议：</strong><br/>
    • 应用商店上架图标：使用 <strong>直角版</strong>（商店会自动加圆角蒙版）<br/>
    • 网页 favicon：使用 <strong>直角版 32px</strong><br/>
    • 网页侧边栏 logo：使用 <strong>圆角版 44~128px</strong><br/>
    • SVG 文件适用于所有矢量场景，无损缩放
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_BASE, 'preview.html'), html);
}

main().catch(console.error);

