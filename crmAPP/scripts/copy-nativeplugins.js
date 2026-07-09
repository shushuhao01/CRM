/**
 * 构建后处理：把 src/nativeplugins 复制到编译产物目录和项目根目录
 *
 * 背景：uni-app CLI 构建不会自动携带本地原生插件目录，而 HBuilderX
 * 云打包时会校验 manifest.json 里声明的 nativePlugins 是否存在于
 * 工程的 nativeplugins 目录下，缺失则报
 * "插件不合法：该插件在nativePlugins目录下不存在"。
 *
 * HBuilderX 查找位置取决于导入的是哪个目录：
 * - 导入 dist/build/app  → dist/build/app/nativeplugins
 * - 导入 crmAPP 项目根   → crmAPP/nativeplugins（项目根目录）
 * 因此源头统一放在 src/nativeplugins，构建后同步到以上所有位置。
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'src', 'nativeplugins')

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name)
    const toPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(fromPath, toPath)
    } else {
      fs.copyFileSync(fromPath, toPath)
    }
  }
}

if (!fs.existsSync(src)) {
  console.log('[copy-nativeplugins] src/nativeplugins 不存在，跳过')
  process.exit(0)
}

// 项目根目录（HBuilderX 直接导入 crmAPP 打包时的查找位置）：始终同步
const rootTarget = path.join(root, 'nativeplugins')
fs.rmSync(rootTarget, { recursive: true, force: true })
copyDir(src, rootTarget)
console.log('[copy-nativeplugins] 已复制本地原生插件 ->', rootTarget)

// 覆盖 build 与 dev 两种产物目录（存在哪个复制哪个）
const targets = [
  path.join(root, 'dist', 'build', 'app', 'nativeplugins'),
  path.join(root, 'dist', 'dev', 'app', 'nativeplugins'),
]

let copied = 0
for (const target of targets) {
  const appDir = path.dirname(target)
  if (!fs.existsSync(appDir)) continue
  fs.rmSync(target, { recursive: true, force: true })
  copyDir(src, target)
  copied++
  console.log('[copy-nativeplugins] 已复制本地原生插件 ->', target)
}

if (copied === 0) {
  console.warn('[copy-nativeplugins] 未找到 dist/build/app 或 dist/dev/app，请先执行构建')
}
