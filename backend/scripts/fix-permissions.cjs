#!/usr/bin/env node
/**
 * 修复后端 node_modules 中原生可执行文件的权限
 * 通过 package.json 的 postinstall 钩子自动调用
 */

if (process.platform === 'win32') {
  process.exit(0);
}

const { execSync } = require('child_process');
const path = require('path');

const nodeModulesDir = path.resolve(__dirname, '..', 'node_modules');

const commands = [
  `find "${nodeModulesDir}/.bin" -type f -exec chmod +x {} \\; 2>/dev/null`,
  `find "${nodeModulesDir}/.bin" -type l -exec chmod +x {} \\; 2>/dev/null`,
  `find "${nodeModulesDir}/@esbuild" -name "esbuild" -type f -exec chmod +x {} \\; 2>/dev/null`,
  `find "${nodeModulesDir}" -path "*/sass-embedded-linux-*/dart-sass/src/dart" -exec chmod +x {} \\; 2>/dev/null`,
];

for (const cmd of commands) {
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {}
}

console.log('[postinstall] backend node_modules 权限已修复');
