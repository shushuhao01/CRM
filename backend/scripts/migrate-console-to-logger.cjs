/**
 * 任务3.8: 将 console.log/error/warn/info 替换为 Winston logger
 *
 * 安全策略：
 * 1. 只处理 backend/src/ 下的 .ts 文件（排除 scripts/）
 * 2. 跳过已导入 logger 的文件中不需要重复导入
 * 3. 使用 { log } 包装器（console兼容接口），避免参数丢失
 * 4. 先输出预览模式，确认后执行
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// 排除目录
const EXCLUDE_DIRS = ['scripts', 'node_modules', '__tests__', 'test'];

// 统计
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;
let skippedFiles = [];

function getAllTsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) {
        results.push(...getAllTsFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getRelativeImportPath(filePath) {
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(SRC_DIR, 'config', 'logger');
  let rel = path.relative(fileDir, loggerPath).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function processFile(filePath) {
  totalFiles++;
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // 检查是否有 console 调用
  const consolePattern = /console\.(log|error|warn|info)\(/g;
  const matches = content.match(consolePattern);
  if (!matches || matches.length === 0) return;

  // 跳过 logger.ts 自身
  if (filePath.endsWith('logger.ts') && filePath.includes('config')) return;

  const relPath = path.relative(SRC_DIR, filePath);
  let replacements = 0;

  // 替换 console 调用
  content = content.replace(/console\.log\(/g, () => { replacements++; return 'log.info('; });
  content = content.replace(/console\.error\(/g, () => { replacements++; return 'log.error('; });
  content = content.replace(/console\.warn\(/g, () => { replacements++; return 'log.warn('; });
  content = content.replace(/console\.info\(/g, () => { replacements++; return 'log.info('; });

  if (replacements === 0) return;

  // 检查是否已经有 logger 的 import
  const hasLogImport = /import\s+\{[^}]*\blog\b[^}]*\}\s+from\s+['"][^'"]*logger['"]/m.test(content);
  const hasLoggerImport = /import\s+\{[^}]*\blogger\b[^}]*\}\s+from\s+['"][^'"]*logger['"]/m.test(content);
  const hasDefaultLoggerImport = /import\s+logger\s+from\s+['"][^'"]*logger['"]/m.test(content);

  if (!hasLogImport) {
    const importPath = getRelativeImportPath(filePath);

    if (hasLoggerImport) {
      // 已有 { logger } import，添加 log
      content = content.replace(
        /import\s+\{([^}]*)\blogger\b([^}]*)\}\s+from\s+(['"][^'"]*logger['"])/m,
        (match, before, after, fromPath) => {
          // 检查是否已包含 log
          if (/\blog\b/.test(before + after)) return match;
          return `import {${before}logger, log${after}} from ${fromPath}`;
        }
      );
    } else if (hasDefaultLoggerImport) {
      // 已有 default import, 在其后添加命名import
      content = content.replace(
        /import\s+logger\s+from\s+(['"][^'"]*logger['"])/m,
        (match, fromPath) => `import logger from ${fromPath}\nimport { log } from ${fromPath}`
      );
    } else {
      // 没有任何 logger import，需要新增
      const importStatement = `import { log } from '${importPath}';\n`;

      // 在最后一个 import 语句之后插入
      const lastImportIndex = content.lastIndexOf('\nimport ');
      if (lastImportIndex !== -1) {
        // 找到这个 import 语句的结尾
        const afterLastImport = content.indexOf('\n', lastImportIndex + 1);
        if (afterLastImport !== -1) {
          // 找到该import行的真正结尾（可能是多行import）
          let insertPos = afterLastImport;
          // 处理多行 import {...} from '...' 的情况
          const remainingContent = content.substring(lastImportIndex + 1);
          const importMatch = remainingContent.match(/^import\s[\s\S]*?from\s+['"][^'"]*['"];?\s*\n?/);
          if (importMatch) {
            insertPos = lastImportIndex + 1 + importMatch[0].length;
          }
          content = content.substring(0, insertPos) + importStatement + content.substring(insertPos);
        }
      } else {
        // 没有 import 语句，在文件开头添加
        content = importStatement + content;
      }
    }
  }

  if (content !== originalContent) {
    modifiedFiles++;
    totalReplacements += replacements;

    if (VERBOSE || DRY_RUN) {
      console.log(`  ${replacements} 处替换 - ${relPath}`);
    }

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
}

// 执行
console.log(`\n${'='.repeat(60)}`);
console.log(DRY_RUN ? '🔍 预览模式（不写入文件）' : '🔧 执行模式（写入文件）');
console.log(`${'='.repeat(60)}\n`);

const files = getAllTsFiles(SRC_DIR);
for (const f of files) {
  processFile(f);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 统计结果：`);
console.log(`  扫描文件: ${totalFiles}`);
console.log(`  修改文件: ${modifiedFiles}`);
console.log(`  替换次数: ${totalReplacements}`);
if (skippedFiles.length > 0) {
  console.log(`  跳过文件: ${skippedFiles.length}`);
  skippedFiles.forEach(f => console.log(`    - ${f}`));
}
console.log(`${'='.repeat(60)}\n`);

if (DRY_RUN) {
  console.log('💡 确认无误后执行: node scripts/migrate-console-to-logger.cjs');
}

