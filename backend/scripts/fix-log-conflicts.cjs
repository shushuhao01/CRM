/**
 * 修复 log 局部变量与导入冲突
 * 将 import { log } → import { log as logger }
 * 将 log.info/error/warn → logger.info/error/warn
 */
const fs = require('fs');
const path = require('path');

const FILES = [
  'src/routes/admin/licenses.ts',
  'src/routes/admin/verify.ts',
  'src/routes/callConfig.ts',
  'src/routes/services.ts',
  'src/services/NotificationChannelService.ts',
  'src/services/OrderNotificationService.ts',
  'src/services/TenantLogService.ts', // already fixed but include for safety
];

let fixed = 0;
for (const rel of FILES) {
  const fp = path.join(__dirname, '..', rel);
  if (!fs.existsSync(fp)) { console.log('SKIP (not found):', rel); continue; }

  let content = fs.readFileSync(fp, 'utf-8');
  const original = content;

  // Replace import { log } from ... → import { log as logger } from ...
  content = content.replace(
    /import\s*\{\s*log\s*\}\s*from\s*(['"][^'"]*logger['"])/g,
    'import { log as logger } from $1'
  );

  // Also handle { logger, log } or { log, logger } patterns
  content = content.replace(
    /import\s*\{\s*logger,\s*log\s*\}\s*from\s*(['"][^'"]*logger['"])/g,
    'import { logger, log as logUtil } from $1'
  );

  // Replace log.info( → logger.info( etc. BUT NOT within const/let/var assignments
  // Only replace log.info/error/warn/debug that are our logger calls
  content = content.replace(/\blog\.info\(/g, 'logger.info(');
  content = content.replace(/\blog\.error\(/g, 'logger.error(');
  content = content.replace(/\blog\.warn\(/g, 'logger.warn(');
  content = content.replace(/\blog\.debug\(/g, 'logger.debug(');

  // If already has { log as logger }, skip double conversion
  if (content.includes('import { log as logger as logger }')) {
    content = content.replace('import { log as logger as logger }', 'import { log as logger }');
  }

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf-8');
    console.log('✅ Fixed:', rel);
    fixed++;
  } else {
    console.log('  (no change):', rel);
  }
}
console.log(`\nFixed ${fixed} files`);

