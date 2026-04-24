const fs = require('fs');
const filePath = 'backend/src/routes/orders/orderCrud.ts';
let c = fs.readFileSync(filePath, 'utf-8');

// Fix remaining corrupted patterns
const fixes = [
  [/拒收 \uFFFD\?拒收已退\uFFFD\?/g, '拒收 → 拒收已退回'],
  [/物流退\uFFFD\?\uFFFD\?重新/g, '物流退回 → 重新'],
  [/物流取消 \uFFFD\?已取\uFFFD\?/g, '物流取消 → 已取消'],
  [/包裹异常 \uFFFD\?重新/g, '包裹异常 → 重新'],
  [/状态历\uFFFD\?/g, '状态历史'],
  [/操作人信\uFFFD\?/g, '操作人信息'],
  [/历史记\uFFFD\?/g, '历史记录'],
  [/变更\uFFFD\?\$\{getStatusName/g, '变更为"${getStatusName'],
  // Catch any remaining \uFFFD? patterns
  [/已签\uFFFD\?\uFFFD\?已建/g, '已签收 → 已建'],
  [/待流转\uFFFD\?待审核/g, '待流转 → 待审核'],
];

for (const [pattern, replacement] of fixes) {
  c = c.replace(pattern, replacement);
}

// Check remaining
const lines = c.split('\n');
let rem = 0;
lines.forEach((l, i) => {
  if (l.includes('\uFFFD')) {
    rem++;
    console.log(`Line ${i+1}: ${l.trim().substring(0, 150)}`);
  }
});
console.log(`Remaining corrupted lines: ${rem}`);

fs.writeFileSync(filePath, c, 'utf-8');
console.log('File saved.');

