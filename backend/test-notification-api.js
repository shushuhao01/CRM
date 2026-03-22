/**
 * 通知服务API完整测试
 */
const http = require('http');
const fs = require('fs');

const token = fs.readFileSync('token.txt', 'utf8').trim();

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get(
      { hostname: 'localhost', port: 3000, path: '/api/v1/admin/' + path, headers: { Authorization: 'Bearer ' + token } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)) } catch { reject(new Error('Parse error: ' + d)) } }) }
    ).on('error', reject);
  });
}

async function main() {
  console.log('=== 通知服务API完整测试 ===\n');

  // 1. 事件类型
  const et = await apiGet('notifications/event-types');
  console.log('1. 事件类型:', et.success ? `✅ OK (${et.data.length}种)` : '❌ FAIL');

  // 2. 渠道配置
  const ch = await apiGet('notifications/channels');
  console.log('2. 渠道配置:', ch.success ? `✅ OK (${ch.data.length}个)` : '❌ FAIL');

  // 3. 通知规则
  const ru = await apiGet('notifications/rules');
  console.log('3. 通知规则:', ru.success ? `✅ OK (${ru.data.length}条)` : '❌ FAIL');

  // 4. 未读计数
  const uc = await apiGet('notifications/unread-count');
  console.log('4. 未读计数:', uc.success ? `✅ OK (${uc.data.count}条未读)` : '❌ FAIL');

  // 5. 通知列表
  const nl = await apiGet('notifications?page=1&pageSize=10');
  console.log('5. 通知列表:', nl.success ? `✅ OK (总共${nl.data.total}条)` : '❌ FAIL');

  console.log('\n=== 测试完成 ===');
}

main().catch(e => console.error('测试出错:', e.message));

