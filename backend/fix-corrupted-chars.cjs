/**
 * Fix corrupted Chinese characters in TypeScript source files
 * The corruption pattern: CJK char is truncated, resulting in a partial byte
 * followed by '?' that merges comments with code or breaks string literals.
 */
const fs = require('fs');
const path = require('path');

const files = [
  'src/services/WecomApiService.ts',
  'src/services/WebSocketService.ts',
  'src/services/TimeoutReminderService.ts',
  'src/services/NotificationChannelService.ts',
  'src/services/NotificationTemplateService.ts',
  'src/services/OrderNotificationService.ts',
  'src/services/PerformanceReportScheduler.ts',
  'src/services/messageService.ts',
  'src/controllers/MessageController.ts',
  'src/controllers/PerformanceReportController.ts',
  'src/routes/logistics.ts',
  'src/routes/logs.ts',
  'src/routes/system.ts',
  'src/routes/timeoutReminder.ts',
  'src/routes/valueAdded.ts',
  'src/routes/wecom.ts',
];

let totalFixes = 0;

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filePath} not found`);
    return;
  }

  const buf = fs.readFileSync(filePath);
  let content = buf.toString('utf8');
  const originalContent = content;
  let fixes = 0;

  // Find all positions where a high byte is followed by '?'
  // This indicates a truncated CJK character
  const lines = content.split('\n');
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;

    // Pattern 1: Comment merged with next line code
    // e.g., "// 说明文字说�?        const xxx" -> "// 说明文字说明\n        const xxx"
    // e.g., "* 文字说�?   */" -> "* 文字说明\n   */"
    // e.g., "// 中间件说�?   */" -> "// 中间件说明\n   */"

    // Detect: single-line comment followed by code on same line after corrupted char
    const commentCodePattern = /(\/\/[^]*?[\u4e00-\u9fff])\uFFFD\?(\s{2,}(?:const |let |var |if |return |for |while |await |this\.|break|continue|import |export |class |function |interface |type |enum |async |private |public |protected |static |throw |try |catch |\} catch|\}|[A-Z][a-zA-Z]+\.|console\.))/;
    let match;
    while ((match = commentCodePattern.exec(line)) !== null) {
      line = line.substring(0, match.index) + match[1] + '\n' + match[2].trimStart().padStart(match[2].length, ' ');
      // Actually split into two lines
      const before = line.substring(0, match.index + match[1].length);
      const after = match[2];
      fixedLines.push(before);
      line = after;
      fixes++;
    }

    fixedLines.push(line);
  }

  content = fixedLines.join('\n');

  if (content !== originalContent) {
    // Write back
    // fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${filePath}: ${fixes} comment-code merges found`);
  }

  totalFixes += fixes;
});

console.log(`\nTotal potential fixes: ${totalFixes}`);

// Now let's just find and report the problematic lines for manual fix
console.log('\n=== Detailed corruption report ===\n');

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check for unterminated string pattern: string with corrupted char before closing quote
    // e.g., '企微配置不存在或已禁�?) -> unterminated
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]\?[)'];/.test(line) ||
        /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]\?[),]/.test(line)) {
      console.log(`${filePath}:${lineNum} [CORRUPTED_STRING] ${line.trim().substring(0, 100)}`);
    }

    // Check for comment-code merge: // comment text followed by code keywords
    if (/\/\/.*[\u4e00-\u9fff]\?.*(const |let |var |if \(|return |interface |class )/.test(line)) {
      console.log(`${filePath}:${lineNum} [COMMENT_CODE_MERGE] ${line.trim().substring(0, 100)}`);
    }

    // Check for JSDoc comment merge: * text followed by code
    if (/\*.*[\u4e00-\u9fff]\?\s{2,}(const |let |if |return |\*\/|private |public |async )/.test(line)) {
      console.log(`${filePath}:${lineNum} [JSDOC_MERGE] ${line.trim().substring(0, 100)}`);
    }

    // Check for || operator corruption: spaces where || should be
    if (/if \(![\w.]+\s{2}![\w.]+\)/.test(line) || /if \(![\w.]+\s{2}[\w.]+\.length/.test(line)) {
      console.log(`${filePath}:${lineNum} [MISSING_OR] ${line.trim().substring(0, 100)}`);
    }

    // Check for merged lines with * at doc comment boundary
    if (/[\u4e00-\u9fff]\?\s*\*/.test(line) && line.includes('*') && !line.includes('/**')) {
      console.log(`${filePath}:${lineNum} [DOC_MERGE] ${line.trim().substring(0, 100)}`);
    }
  });
});

