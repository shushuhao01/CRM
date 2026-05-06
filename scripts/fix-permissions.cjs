#!/usr/bin/env node
/**
 * 修复 node_modules 中原生可执行文件的权限
 * 解决宝塔面板/Linux服务器上 npm install 后二进制文件缺少执行权限的问题
 * 
 * 此脚本在 Windows 上自动跳过（Windows 不需要 chmod）
 * 通过 package.json 的 postinstall 钩子自动调用
 */

if (process.platform === 'win32') {
  process.exit(0);
}

const { execSync } = require('child_process');
const path = require('path');

// 获取当前 node_modules 所在目录
const projectDir = path.resolve(__dirname, '..');
const nodeModulesDir = path.join(projectDir, 'node_modules');

const commands = [
  // .bin 目录下所有文件和符号链接
  `find "${nodeModulesDir}/.bin" -type f -exec chmod +x {} \\; 2>/dev/null`,
  `find "${nodeModulesDir}/.bin" -type l -exec chmod +x {} \\; 2>/dev/null`,
  // esbuild 原生二进制
  `find "${nodeModulesDir}/@esbuild" -name "esbuild" -type f -exec chmod +x {} \\; 2>/dev/null`,
  `find "${nodeModulesDir}/esbuild" -name "esbuild" -type f -exec chmod +x {} \\; 2>/dev/null`,
  // sass-embedded 原生二进制（dart 引擎）
  `find "${nodeModulesDir}" -path "*/sass-embedded-linux-*/dart-sass/src/dart" -exec chmod +x {} \\; 2>/dev/null`,
  // rollup 原生二进制（以防万一）
  `find "${nodeModulesDir}/@rollup" -type f \\( -name "rollup" -o -name "*.node" \\) -exec chmod +x {} \\; 2>/dev/null`,
];

let fixed = false;
for (const cmd of commands) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    fixed = true;
  } catch {
    // 忽略错误（目录可能不存在）
  }
}

if (fixed) {
  console.log('[postinstall] node_modules 可执行文件权限已修复');
}
