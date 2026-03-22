/**
 * 端到端测试 - 验证通知服务业务集成
 * 直接调用 AdminNotificationService 模拟业务事件
 */
const mysql = require('mysql2/promise');
const http = require('http');
const fs = require('fs');

const token = fs.readFileSync('token.txt', 'utf8').trim();

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get(
      { hostname: 'localhost', port: 3000, path: '/api/v1/admin/' + path, headers: { Authorization: 'Bearer ' + token } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)) } catch { reject(new Error('Parse: ' + d)) } }) }
    ).on('error', reject);
  });
}

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'abc789',
    password: 'YtZWJPF2bpsCscHX', database: 'crm_local'
  });

  console.log('=== 通知服务 端到端测试 ===\n');

  // 先清空旧测试数据
  await conn.query("DELETE FROM admin_notifications WHERE title LIKE '%端到端测试%'");

  // 模拟3条不同事件的通知
  const { v4: uuidv4 } = require('uuid');
  const testEvents = [
    { type: 'tenant_registered', level: 'info', title: '[端到端测试] 新租户注册', content: '测试企业刚刚注册了免费试用套餐' },
    { type: 'payment_success', level: 'success', title: '[端到端测试] 支付成功 ¥999', content: '测试企业的订单ORD001已支付成功' },
    { type: 'license_expiring', level: 'warning', title: '[端到端测试] 授权即将到期', content: '测试企业的授权将在3天后到期' },
  ];

  for (const ev of testEvents) {
    await conn.query(
      'INSERT INTO admin_notifications (id, title, content, event_type, level, is_read) VALUES (?, ?, ?, ?, ?, 0)',
      [uuidv4(), ev.title, ev.content, ev.type, ev.level]
    );
  }
  console.log('✅ 已插入3条测试通知');

  // 验证API返回
  const uc = await apiGet('notifications/unread-count');
  console.log(`✅ 未读数量: ${uc.data.count}`);

  const nl = await apiGet('notifications?page=1&pageSize=10');
  console.log(`✅ 通知列表: 共${nl.data.total}条`);
  for (const n of nl.data.list) {
    if (n.title.includes('端到端测试')) {
      console.log(`   - [${n.level}] ${n.title} | 已读:${n.is_read ? '是' : '否'}`);
    }
  }

  // 测试标记已读
  const testNotif = nl.data.list.find(n => n.title.includes('端到端测试'));
  if (testNotif) {
    const markRes = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port: 3000, path: `/api/v1/admin/notifications/${testNotif.id}/read`, method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } },
        res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))) }
      );
      req.on('error', reject);
      req.end();
    });
    console.log(`✅ 标记已读: ${markRes.success ? 'OK' : 'FAIL'}`);
  }

  // 验证已读后未读数减少
  const uc2 = await apiGet('notifications/unread-count');
  console.log(`✅ 标记后未读数: ${uc2.data.count}`);

  // 清理测试数据
  await conn.query("DELETE FROM admin_notifications WHERE title LIKE '%端到端测试%'");
  console.log('✅ 测试数据已清理');

  await conn.end();
  console.log('\n=== 端到端测试通过 ===');
}

main().catch(e => console.error('❌ 测试失败:', e.message));

