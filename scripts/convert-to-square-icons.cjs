/**
 * 将现有圆角CRM图标转换为直角图标
 *
 * 原理：现有图标是圆角+透明背景的，圆角外是透明像素。
 * 方案：以最大尺寸(1024)为基准，把图标内容放在纯色背景上，
 *       这样就没有圆角了（直角正方形填满），然后缩放到各尺寸。
 *
 * 用法: node scripts/convert-to-square-icons.cjs
 */

const fs = require('fs');
const path = require('path');

const sharp = require(path.join(__dirname, '..', 'crmAPP', 'node_modules', 'sharp'));

const SOURCE_DIR = path.join(__dirname, '..', 'public', 'icons');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons-square-crm');

const SIZES = [16, 32, 48, 64, 128, 192, 256, 512, 1024];

async function main() {
  console.log('🔲 CRM图标 圆角→直角 转换器');
  console.log('============================\n');

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 用最大的源文件（1024px）作为基准
  const source1024 = path.join(SOURCE_DIR, 'logo-1024.png');
  const source512 = path.join(SOURCE_DIR, 'logo-512.png');

  let sourcePath;
  if (fs.existsSync(source1024)) {
    sourcePath = source1024;
    console.log('📄 源文件: logo-1024.png');
  } else {
    sourcePath = source512;
    console.log('📄 源文件: logo-512.png (将放大到1024)');
  }

  // 读取源图，分析透明区域，提取实际内容区域
  const sourceMeta = await sharp(sourcePath).metadata();
  console.log(`   尺寸: ${sourceMeta.width}x${sourceMeta.height}, 通道: ${sourceMeta.channels}\n`);

  // 提取源图的像素数据来分析内容边界
  const { data, info } = await sharp(sourcePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels;

  // 找到非透明像素的边界框
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * channels;
      const alpha = channels === 4 ? data[idx + 3] : 255;
      if (alpha > 10) { // 非透明像素
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  console.log(`📐 内容区域: (${minX},${minY}) → (${maxX},${maxY})`);
  console.log(`   内容尺寸: ${contentW}x${contentH}`);
  console.log(`   图标尺寸: ${w}x${h}`);

  // 采样内容区域的主色调（从边缘采样背景色）
  // 取内容区域内层靠近边缘的像素来确定背景色
  const samplePoints = [];
  // 从内容区域的四角附近采样
  const margin = Math.floor(contentW * 0.05);
  const samplePositions = [
    [minX + margin, minY + margin],       // 左上
    [maxX - margin, minY + margin],       // 右上
    [minX + margin, maxY - margin],       // 左下
    [maxX - margin, maxY - margin],       // 右下
    [minX + contentW/2, minY + margin],   // 上中
    [minX + margin, minY + contentH/2],   // 左中
  ];

  for (const [sx, sy] of samplePositions) {
    const x = Math.floor(sx);
    const y = Math.floor(sy);
    if (x >= 0 && x < w && y >= 0 && y < h) {
      const idx = (y * w + x) * channels;
      samplePoints.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: channels === 4 ? data[idx + 3] : 255
      });
    }
  }

  // 找到最常见的非透明颜色作为填充背景色
  const opaquesamples = samplePoints.filter(s => s.a > 200);
  let bgR = 16, bgG = 185, bgB = 129; // 默认品牌绿色 #10B981

  if (opaquesamples.length > 0) {
    bgR = Math.round(opaquesamples.reduce((s, p) => s + p.r, 0) / opaquesamples.length);
    bgG = Math.round(opaquesamples.reduce((s, p) => s + p.g, 0) / opaquesamples.length);
    bgB = Math.round(opaquesamples.reduce((s, p) => s + p.b, 0) / opaquesamples.length);
  }

  const bgHex = `#${bgR.toString(16).padStart(2,'0')}${bgG.toString(16).padStart(2,'0')}${bgB.toString(16).padStart(2,'0')}`;
  console.log(`🎨 检测到背景色: rgb(${bgR},${bgG},${bgB}) = ${bgHex}\n`);

  // 方案1：用检测到的背景色填充透明区域
  console.log('--- 方案1: 用原图背景色填充圆角 ---');
  const dir1 = path.join(OUTPUT_DIR, 'original-fill');
  if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });

  for (const size of SIZES) {
    const outputPath = path.join(dir1, `logo-${size}.png`);
    await sharp(sourcePath)
      .flatten({ background: { r: bgR, g: bgG, b: bgB } })  // 用背景色填充透明区域
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png({ quality: 100 })
      .toFile(outputPath);
  }
  console.log(`   ✅ 已生成 ${SIZES.length} 个尺寸到 original-fill/`);

  // 方案2：白色背景填充
  console.log('--- 方案2: 白色背景填充圆角 ---');
  const dir2 = path.join(OUTPUT_DIR, 'white-fill');
  if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });

  for (const size of SIZES) {
    const outputPath = path.join(dir2, `logo-${size}.png`);
    await sharp(sourcePath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png({ quality: 100 })
      .toFile(outputPath);
  }
  console.log(`   ✅ 已生成 ${SIZES.length} 个尺寸到 white-fill/`);

  // 方案3：提取内容，放大到完全填满正方形（去掉多余padding）
  console.log('--- 方案3: 内容裁剪+填满(去除多余留白) ---');
  const dir3 = path.join(OUTPUT_DIR, 'content-fill');
  if (!fs.existsSync(dir3)) fs.mkdirSync(dir3, { recursive: true });

  // 给内容区域加少量padding
  const padPx = Math.floor(Math.max(contentW, contentH) * 0.02);
  const cropX = Math.max(0, minX - padPx);
  const cropY = Math.max(0, minY - padPx);
  const cropW = Math.min(w - cropX, contentW + padPx * 2);
  const cropH = Math.min(h - cropY, contentH + padPx * 2);
  // 取正方形
  const cropSize = Math.max(cropW, cropH);
  const finalCropX = Math.max(0, Math.floor(minX + contentW/2 - cropSize/2));
  const finalCropY = Math.max(0, Math.floor(minY + contentH/2 - cropSize/2));
  const finalCropSize = Math.min(cropSize, w - finalCropX, h - finalCropY);

  for (const size of SIZES) {
    const outputPath = path.join(dir3, `logo-${size}.png`);
    await sharp(sourcePath)
      .extract({ left: finalCropX, top: finalCropY, width: finalCropSize, height: finalCropSize })
      .flatten({ background: { r: bgR, g: bgG, b: bgB } })
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png({ quality: 100 })
      .toFile(outputPath);
  }
  console.log(`   ✅ 已生成 ${SIZES.length} 个尺寸到 content-fill/`);

  // 生成预览HTML
  generatePreview();

  console.log(`\n🎉 完成！共生成 ${SIZES.length * 3} 个直角图标`);
  console.log(`📂 输出目录: ${OUTPUT_DIR}`);
  console.log(`🌐 预览页面: ${path.join(OUTPUT_DIR, 'preview.html')}`);
  console.log('\n💡 选好方案后，用对应文件夹的图标替换 public/icons/ 中的文件');
}

function generatePreview() {
  const schemes = [
    { dir: 'original-fill', name: '方案1: 原图背景色填充', desc: '用图标自身的背景色填充圆角透明区域，效果最自然' },
    { dir: 'white-fill', name: '方案2: 白色背景填充', desc: '白色填充圆角区域，适合浅色系界面' },
    { dir: 'content-fill', name: '方案3: 内容裁剪填满', desc: '裁掉多余留白，内容放大填满正方形' },
  ];

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>CRM图标 圆角→直角 对比预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f3f4f6; padding: 30px; }
    h1 { text-align: center; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #6b7280; margin-bottom: 30px; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { font-size: 18px; margin-bottom: 4px; }
    .section p { color: #6b7280; font-size: 14px; margin-bottom: 16px; }
    .row { display: flex; align-items: end; gap: 16px; flex-wrap: wrap; }
    .item { text-align: center; }
    .item img { display: block; margin: 0 auto 4px; border: 1px solid #e5e7eb; }
    .item span { font-size: 11px; color: #9ca3af; }
    .original { border: 2px dashed #FDE68A !important; }
    .compare { display: flex; gap: 30px; align-items: center; margin-bottom: 20px; padding: 16px; background: #F9FAFB; border-radius: 8px; }
    .compare .label { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
    .badge { background: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 8px; font-size: 12px; }
    .badge.rec { background: #DEF7EC; color: #065F46; }
  </style>
</head>
<body>
  <h1>🔲 CRM图标 圆角→直角 对比预览</h1>
  <p class="subtitle">原始圆角图标 vs 3种直角处理方案</p>

  <div class="section">
    <h2>📎 原始圆角图标（对比参考）</h2>
    <p>当前 public/icons/ 中的圆角版本</p>
    <div class="row">
      ${[64, 128, 256, 512].map(s => `
        <div class="item">
          <img src="../icons/logo-${s}.png" width="${Math.min(s, 128)}" height="${Math.min(s, 128)}" class="original"/>
          <span>${s}px (圆角)</span>
        </div>
      `).join('')}
    </div>
  </div>

  ${schemes.map((scheme, i) => `
  <div class="section">
    <h2>${scheme.name} ${i === 0 ? '<span class="badge rec">⭐ 推荐</span>' : ''}</h2>
    <p>${scheme.desc}</p>
    <div class="compare">
      <div>
        <div class="label">圆角原图</div>
        <img src="../icons/logo-128.png" width="128" height="128" style="border:1px solid #e5e7eb;"/>
      </div>
      <div style="font-size: 24px; color: #9ca3af;">→</div>
      <div>
        <div class="label">直角转换后</div>
        <img src="${scheme.dir}/logo-128.png" width="128" height="128" style="border:1px solid #e5e7eb;"/>
      </div>
    </div>
    <div class="row">
      ${SIZES.map(s => `
        <div class="item">
          <img src="${scheme.dir}/logo-${s}.png" width="${Math.min(s, 128)}" height="${Math.min(s, 128)}"/>
          <span>${s}px</span>
        </div>
      `).join('')}
    </div>
  </div>
  `).join('')}
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'preview.html'), html);
}

main().catch(console.error);

