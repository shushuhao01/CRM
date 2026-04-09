/**
 * HBuilderX 云打包配置全面诊断
 * 检查 manifest.json 中所有引用的文件、字段是否完整
 */
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..', 'crmAPP');
const SRC_DIR = path.join(APP_ROOT, 'src');
const manifest = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'manifest.json'), 'utf8'));

let errors = [];
let warnings = [];
let ok = [];

function check(condition, msg) {
  if (condition) { ok.push('✅ ' + msg); }
  else { errors.push('❌ ' + msg); }
}
function warn(condition, msg) {
  if (condition) { ok.push('✅ ' + msg); }
  else { warnings.push('⚠️ ' + msg); }
}
function fileExists(relPath, base) {
  return fs.existsSync(path.join(base || SRC_DIR, relPath));
}

console.log('🔍 HBuilderX 云打包配置全面诊断');
console.log('================================\n');

// === 1. 基础配置 ===
console.log('【1. 基础配置】');
check(manifest.name, `应用名称: ${manifest.name || '未设置'}`);
check(manifest.appid && manifest.appid !== '__UNI__CRM_DIALER' && manifest.appid.startsWith('__UNI__'), `AppID: ${manifest.appid || '未设置'} (必须是DCloud分配的正式ID)`);
check(manifest.versionName, `版本名: ${manifest.versionName || '未设置'}`);
check(manifest.versionCode, `版本号: ${manifest.versionCode || '未设置'}`);
check(manifest.description, `描述: ${manifest.description ? '已设置' : '未设置'}`);

// === 2. app-plus 配置 ===
console.log('\n【2. App-Plus 配置】');
const appPlus = manifest['app-plus'] || {};
check(appPlus.distribute, 'distribute 配置块存在');

const distribute = appPlus.distribute || {};

// === 3. Android 配置 ===
console.log('\n【3. Android 配置】');
const android = distribute.android || {};
check(android.packagename, `包名: ${android.packagename || '❌ 未设置！这是必填项！'}`);
check(android.minSdkVersion, `最低SDK: ${android.minSdkVersion || '未设置'}`);
check(android.targetSdkVersion, `目标SDK: ${android.targetSdkVersion || '未设置'}`);
warn(android.permissions && android.permissions.length > 0, `权限数量: ${(android.permissions||[]).length}`);

// === 4. Android 图标检查 ===
console.log('\n【4. Android 图标文件】');
const icons = distribute.icons || {};
const androidIcons = icons.android || {};
const requiredAndroidDensities = ['ldpi', 'mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

for (const density of requiredAndroidDensities) {
  const iconPath = androidIcons[density];
  if (!iconPath) {
    errors.push(`❌ Android ${density} 图标: 未在manifest中配置`);
  } else {
    const exists = fileExists(iconPath);
    if (exists) {
      ok.push(`✅ Android ${density}: ${iconPath}`);
    } else {
      // 也检查 APP_ROOT 目录
      const existsInRoot = fileExists(iconPath, APP_ROOT);
      if (existsInRoot) {
        warnings.push(`⚠️ Android ${density}: ${iconPath} - 文件在crmAPP/下存在但不在src/下`);
      } else {
        errors.push(`❌ Android ${density}: ${iconPath} - 文件不存在！`);
      }
    }
  }
}

// === 5. iOS 图标检查 ===
console.log('\n【5. iOS 图标文件】');
const iosIcons = icons.ios || {};
if (iosIcons.appstore) {
  const exists = fileExists(iosIcons.appstore);
  check(exists, `iOS AppStore 图标: ${iosIcons.appstore}`);
}
// 检查所有 iPhone 图标
const iphoneIcons = iosIcons.iphone || {};
for (const [key, val] of Object.entries(iphoneIcons)) {
  const exists = fileExists(val);
  if (!exists) {
    const existsInRoot = fileExists(val, APP_ROOT);
    if (existsInRoot) {
      warnings.push(`⚠️ iOS iPhone ${key}: ${val} - 在crmAPP/下但不在src/下`);
    } else {
      errors.push(`❌ iOS iPhone ${key}: ${val} - 文件不存在！`);
    }
  }
}
// iPad 图标
const ipadIcons = iosIcons.ipad || {};
for (const [key, val] of Object.entries(ipadIcons)) {
  const exists = fileExists(val);
  if (!exists) {
    const existsInRoot = fileExists(val, APP_ROOT);
    if (existsInRoot) {
      warnings.push(`⚠️ iOS iPad ${key}: ${val} - 在crmAPP/下但不在src/下`);
    } else {
      errors.push(`❌ iOS iPad ${key}: ${val} - 文件不存在！`);
    }
  }
}

// === 6. 启动图(Splash Screen)检查 ===
console.log('\n【6. 启动图配置】');
const splash = distribute.splashscreen || {};
warn(splash.androidStyle, `Android启动图样式: ${splash.androidStyle || '未设置'}`);

// === 7. iOS 配置 ===
console.log('\n【7. iOS 配置】');
const ios = distribute.ios || {};
warn(ios.dSYMs !== undefined, `iOS dSYMs: ${ios.dSYMs}`);

// === 8. 模块配置 ===
console.log('\n【8. 模块配置】');
const modules = appPlus.modules || {};
for (const [mod, config] of Object.entries(modules)) {
  ok.push(`✅ 模块 ${mod}: 已启用`);
}

// === 9. Keystore 文件 ===
console.log('\n【9. 签名证书】');
const keystorePath = path.join(APP_ROOT, 'crm-dialer-release.keystore');
check(fs.existsSync(keystorePath), `签名证书: ${fs.existsSync(keystorePath) ? '存在' : '不存在！'}`);

// === 10. pages.json ===
console.log('\n【10. 其他必要文件】');
check(fs.existsSync(path.join(SRC_DIR, 'pages.json')), 'pages.json 存在');
check(fs.existsSync(path.join(SRC_DIR, 'App.vue')), 'App.vue 存在');
check(fs.existsSync(path.join(SRC_DIR, 'main.ts')), 'main.ts 存在');
check(fs.existsSync(path.join(APP_ROOT, 'package.json')), 'package.json 存在');

// === 10.5 Android 隐私合规（关键！）===
console.log('\n【10.5 Android 隐私合规】');
const privacyPath = path.join(SRC_DIR, 'androidPrivacy.json');
check(fs.existsSync(privacyPath), `androidPrivacy.json: ${fs.existsSync(privacyPath) ? '存在 ✅' : '❌ 不存在！HBuilderX 3.x+ 强制要求此文件！'}`);
if (fs.existsSync(privacyPath)) {
  try {
    const privacy = JSON.parse(fs.readFileSync(privacyPath, 'utf8'));
    check(privacy.version, 'androidPrivacy version 已设置');
    check(privacy.prompt, 'androidPrivacy prompt 已设置');
    check(privacy.message, 'androidPrivacy message 已设置');
  } catch(e) {
    errors.push('❌ androidPrivacy.json 格式错误: ' + e.message);
  }
}

// === 11. 检查 static/logo.png (HBuilderX 默认启动图) ===
console.log('\n【11. 默认启动图/Logo】');
warn(fs.existsSync(path.join(SRC_DIR, 'static', 'logo.png')), 'static/logo.png 存在');

// === 12. versionCode 格式 ===
console.log('\n【12. 版本号格式】');
check(typeof manifest.versionCode === 'string', `versionCode是字符串: "${manifest.versionCode}" (HBuilderX要求字符串格式)`);
check(/^\d+$/.test(manifest.versionCode), `versionCode是纯数字: ${manifest.versionCode}`);

// === 输出结果 ===
console.log('\n' + '='.repeat(50));
console.log(`\n✅ 通过: ${ok.length} 项`);
ok.forEach(o => console.log('  ' + o));

if (warnings.length > 0) {
  console.log(`\n⚠️ 警告: ${warnings.length} 项`);
  warnings.forEach(w => console.log('  ' + w));
}

if (errors.length > 0) {
  console.log(`\n❌ 错误: ${errors.length} 项 ← 这些可能导致"缺少配置"！`);
  errors.forEach(e => console.log('  ' + e));
} else {
  console.log('\n🎉 manifest.json 配置检查全部通过！');
  console.log('\n如果 HBuilderX 仍然提示"缺少配置"，问题可能在：');
  console.log('  1. DCloud 开发者中心网站上的 Android 包名/SHA 未保存成功');
  console.log('  2. HBuilderX 缓存问题 → 关闭项目重新打开');
  console.log('  3. HBuilderX 版本太旧 → 更新到最新版');
  console.log('  4. 需要在 HBuilderX 可视化编辑器中点一次"配置"按钮完成关联');
}

