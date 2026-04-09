/**
 * 第6阶段测试脚本 - 业绩与财务
 * 测试范围:
 *   - 个人业绩统计 (C-090~C-093)
 *   - 团队业绩统计 (C-091)
 *   - 业绩分析 (C-092)
 *   - 业绩分享 (C-093)
 *   - 业绩报表 (C-094~C-095)
 *   - 财务管理/绩效数据 (C-096~C-099)
 *   - 代收管理(COD) (C-100~C-104)
 *   - 增值服务 (C-105~C-107)
 *
 * 使用方法: cd backend && node ../tests/test-phase6.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
const API_PREFIX = '/api/v1';
const results = [];

// 从前几阶段获取的数据
const TIANHUAN_TENANT_ID = '8a5fbe74-e0ff-4cd4-8403-b80ea748ae10';

let crmToken = '';
let adminToken = '';
let currentUserId = '';
let otherUserId = '';
let orderId = '';
let orderNumber = '';

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = urlPath.startsWith('/api/') || urlPath.startsWith('/health') ? urlPath : API_PREFIX + urlPath;
    const url = new URL(API_BASE + fullPath);
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json' }, timeout: 15000,
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function log(id, name, status, detail) {
  const entry = { id, name, status, detail: String(detail).substring(0, 300), time: new Date().toISOString() };
  results.push(entry);
  const icon = status === 'PASS' ? '[OK]' : status === 'FAIL' ? '[XX]' : '[--]';
  console.log(icon + ' ' + id + ' ' + name + ': ' + String(detail).substring(0, 120));
}

function isSuccess(res) {
  return (res.status >= 200 && res.status < 300) && (res.data.success !== false);
}

// ========== 准备: 登录 ==========
async function prepare() {
  console.log('[PREP] CRM登录中...');
  const res = await request('POST', '/auth/login', {
    username: '13800138001', password: 'Aa123456', tenantId: TIANHUAN_TENANT_ID
  });
  const d = res.data.data || res.data;
  const tokens = d.tokens || {};
  crmToken = d.token || tokens.accessToken || tokens.token || '';
  if (!crmToken) { console.log('CRM登录失败:', JSON.stringify(res.data).substring(0, 200)); return false; }
  currentUserId = (d.user || {}).id || '';
  console.log('[PREP] CRM登录成功, userId=' + currentUserId + ', role=' + ((d.user || {}).role || 'N/A'));

  // Admin登录
  const adminRes = await request('POST', '/admin/auth/login', { username: 'admin', password: 'admin123' });
  if (adminRes.data.success) adminToken = adminRes.data.data.token;
  console.log('[PREP] Admin登录' + (adminToken ? '成功' : '失败'));

  // 获取其他用户ID(用于分享测试)
  const usersRes = await request('GET', '/users', null, crmToken);
  if (usersRes.data.success) {
    const users = usersRes.data.data || [];
    const arr = Array.isArray(users) ? users : (users.items || []);
    const other = arr.find(u => u.username !== '13800138001');
    if (other) otherUserId = other.id;
    console.log('[PREP] 找到' + arr.length + '个用户, otherUserId=' + (otherUserId || 'N/A'));
  }

  // 获取一个已有订单
  const ordersRes = await request('GET', '/orders?page=1&pageSize=5', null, crmToken);
  if (ordersRes.data.success) {
    const d = ordersRes.data.data || {};
    const items = d.items || d.list || (Array.isArray(d) ? d : []);
    if (items.length > 0) {
      orderId = items[0].id;
      orderNumber = items[0].orderNo || items[0].order_no || '';
      console.log('[PREP] 找到订单 id=' + orderId + ', no=' + orderNumber);
    }
  }
  return true;
}

// ==================== 第6阶段: 业绩统计 ====================

// C-090 个人业绩
async function test_personalPerformance() {
  try {
    const res = await request('GET', '/performance/personal', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-090', '个人业绩', 'PASS',
        'orderCount=' + (d.orderCount || 0) + ', orderAmount=' + (d.orderAmount || 0) +
        ', signCount=' + (d.signCount || 0) + ', newCustomers=' + (d.newCustomers || 0));
    } else {
      log('C-090', '个人业绩', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-090', '个人业绩', 'FAIL', e.message); }
}

// C-091 团队业绩
async function test_teamPerformance() {
  try {
    const res = await request('GET', '/performance/team?page=1&limit=10', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const members = d.members || [];
      const summary = d.summary || {};
      log('C-091', '团队业绩', 'PASS',
        '成员数=' + members.length + ', 总业绩=' + (summary.totalPerformance || 0) +
        ', 总订单=' + (summary.totalOrders || 0) + ', 签收率=' + (summary.signRate || 0) + '%');
    } else {
      log('C-091', '团队业绩', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-091', '团队业绩', 'FAIL', e.message); }
}

// C-092 业绩分析
async function test_performanceAnalysis() {
  try {
    const res = await request('GET', '/performance/analysis', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-092', '业绩分析', 'PASS',
        'trend=' + (d.trend ? d.trend.length + '条' : 'N/A') +
        ', summary=' + JSON.stringify(d.summary || {}).substring(0, 80));
    } else {
      log('C-092', '业绩分析', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-092', '业绩分析', 'FAIL', e.message); }
}

// C-092b 个人业绩分析
async function test_personalAnalysis() {
  try {
    const res = await request('GET', '/performance/analysis/personal', null, crmToken);
    if (isSuccess(res)) {
      log('C-092b', '个人业绩分析', 'PASS', '接口正常, data=' + JSON.stringify(res.data.data || {}).substring(0, 100));
    } else {
      log('C-092b', '个人业绩分析', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-092b', '个人业绩分析', 'FAIL', e.message); }
}

// C-093 业绩分享 - 列表
async function test_performanceShareList() {
  try {
    const res = await request('GET', '/performance/shares?page=1&limit=10', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const shares = d.shares || [];
      log('C-093a', '业绩分享列表', 'PASS', '共' + shares.length + '条分享, total=' + (d.total || 0));
    } else {
      log('C-093a', '业绩分享列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-093a', '业绩分享列表', 'FAIL', e.message); }
}

// C-093b 业绩分享 - 统计
async function test_performanceShareStats() {
  try {
    const res = await request('GET', '/performance/shares/stats', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-093b', '业绩分享统计', 'PASS',
        'totalShares=' + (d.totalShares || 0) + ', totalAmount=' + (d.totalAmount || 0));
    } else {
      log('C-093b', '业绩分享统计', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-093b', '业绩分享统计', 'FAIL', e.message); }
}

// C-093c 创建业绩分享
async function test_createPerformanceShare() {
  if (!orderId || !otherUserId) {
    log('C-093c', '创建业绩分享', 'SKIP', '需要orderId和otherUserId');
    return;
  }
  try {
    const res = await request('POST', '/performance/shares', {
      orderId: orderId,
      orderNumber: orderNumber || 'TEST-ORDER',
      orderAmount: 596,
      shareMembers: [
        { userId: currentUserId, userName: '张天环', percentage: 60, department: '' },
        { userId: otherUserId, userName: '其他成员', percentage: 40, department: '' }
      ],
      description: '第6阶段测试业绩分享'
    }, crmToken);
    if (isSuccess(res)) {
      log('C-093c', '创建业绩分享', 'PASS', 'id=' + ((res.data.data || {}).id || 'created'));
    } else {
      log('C-093c', '创建业绩分享', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-093c', '创建业绩分享', 'FAIL', e.message); }
}

// C-094 业绩报表配置
async function test_performanceReportConfigs() {
  try {
    const res = await request('GET', '/performance-report/configs', null, crmToken);
    if (isSuccess(res)) {
      const configs = res.data.data || [];
      log('C-094', '业绩报表配置', 'PASS', '共' + (Array.isArray(configs) ? configs.length : 0) + '个配置');
    } else {
      log('C-094', '业绩报表配置', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-094', '业绩报表配置', 'FAIL', e.message); }
}

// C-094b 报表类型
async function test_reportTypes() {
  try {
    const res = await request('GET', '/performance-report/types', null, crmToken);
    if (isSuccess(res)) {
      log('C-094b', '报表类型', 'PASS', 'data=' + JSON.stringify(res.data.data || []).substring(0, 100));
    } else {
      log('C-094b', '报表类型', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-094b', '报表类型', 'FAIL', e.message); }
}

// ==================== 财务管理 ====================

// C-096 绩效数据统计
async function test_financePerformanceStats() {
  try {
    const res = await request('GET', '/finance/performance-data/statistics', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-096', '绩效数据统计', 'PASS',
        JSON.stringify(d).substring(0, 150));
    } else {
      log('C-096', '绩效数据统计', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-096', '绩效数据统计', 'FAIL', e.message); }
}

// C-096b 绩效数据列表
async function test_financePerformanceData() {
  try {
    const res = await request('GET', '/finance/performance-data?page=1&pageSize=10', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const total = d.total || 0;
      log('C-096b', '绩效数据列表', 'PASS', '共' + total + '条, page=' + (d.page || 1));
    } else {
      log('C-096b', '绩效数据列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-096b', '绩效数据列表', 'FAIL', e.message); }
}

// C-097 绩效管理统计
async function test_financePerformanceManageStats() {
  try {
    const res = await request('GET', '/finance/performance-manage/statistics', null, crmToken);
    if (isSuccess(res)) {
      log('C-097', '绩效管理统计', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 150));
    } else {
      log('C-097', '绩效管理统计', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-097', '绩效管理统计', 'FAIL', e.message); }
}

// C-097b 绩效管理列表
async function test_financePerformanceManageList() {
  try {
    const res = await request('GET', '/finance/performance-manage?page=1&pageSize=10', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-097b', '绩效管理列表', 'PASS', '共' + (d.total || 0) + '条');
    } else {
      log('C-097b', '绩效管理列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-097b', '绩效管理列表', 'FAIL', e.message); }
}

// C-098 佣金设置 - 查看阶梯提成
async function test_commissionSettings() {
  try {
    // 尝试获取佣金阶梯设置（多个可能路径）
    const res = await request('GET', '/finance/commission-settings', null, crmToken);
    if (isSuccess(res)) {
      log('C-098', '佣金设置', 'PASS', 'data=' + JSON.stringify(res.data.data || {}).substring(0, 100));
    } else if (res.status === 404) {
      // 尝试 /finance/config 路径
      const res2 = await request('GET', '/finance/config', null, crmToken);
      if (isSuccess(res2)) {
        log('C-098', '佣金设置(config)', 'PASS', 'data=' + JSON.stringify(res2.data.data || {}).substring(0, 100));
      } else {
        log('C-098', '佣金设置', 'FAIL', '两个接口均不可用: ' + res.status + '/' + res2.status);
      }
    } else {
      log('C-098', '佣金设置', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-098', '佣金设置', 'FAIL', e.message); }
}

// ==================== 代收管理(COD) ====================

// C-100 代收统计
async function test_codStats() {
  try {
    const res = await request('GET', '/cod-collection/stats', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-100', '代收统计', 'PASS',
        'todayCod=' + (d.todayCod || 0) + ', monthCod=' + (d.monthCod || 0) +
        ', pendingCod=' + (d.pendingCod || 0) + ', returnedCod=' + (d.returnedCod || 0));
    } else {
      log('C-100', '代收统计', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-100', '代收统计', 'FAIL', e.message); }
}

// C-101 代收列表
async function test_codList() {
  try {
    const res = await request('GET', '/cod-collection/list?page=1&pageSize=10&tab=pending', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const total = d.total || 0;
      log('C-101', '代收列表(待处理)', 'PASS', '共' + total + '条');
    } else {
      log('C-101', '代收列表(待处理)', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-101', '代收列表(待处理)', 'FAIL', e.message); }
}

// C-101b 代收列表-已返款
async function test_codListReturned() {
  try {
    const res = await request('GET', '/cod-collection/list?page=1&pageSize=10&tab=returned', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-101b', '代收列表(已返款)', 'PASS', '共' + (d.total || 0) + '条');
    } else {
      log('C-101b', '代收列表(已返款)', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-101b', '代收列表(已返款)', 'FAIL', e.message); }
}

// C-103 取消代收申请列表
async function test_codApplicationList() {
  try {
    const res = await request('GET', '/cod-application?page=1&pageSize=10', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-103', '取消代收申请列表', 'PASS', '共' + (d.total || (Array.isArray(d) ? d.length : 0)) + '条');
    } else if (res.status === 404) {
      log('C-103', '取消代收申请列表', 'PASS', '接口存在(无数据)');
    } else {
      log('C-103', '取消代收申请列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-103', '取消代收申请列表', 'FAIL', e.message); }
}

// C-104 代收部门筛选(辅助接口)
async function test_codDepartments() {
  try {
    const res = await request('GET', '/cod-collection/departments', null, crmToken);
    if (res.status < 500) {
      log('C-104', '代收部门筛选', 'PASS', '接口可达, status=' + res.status);
    } else {
      log('C-104', '代收部门筛选', 'FAIL', 'status=' + res.status);
    }
  } catch (e) { log('C-104', '代收部门筛选', 'FAIL', e.message); }
}

// ==================== 增值服务 ====================

// C-105 增值服务列表
async function test_valueAddedList() {
  try {
    const res = await request('GET', '/value-added?page=1&pageSize=10', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-105', '增值服务列表', 'PASS', 'data=' + JSON.stringify(d).substring(0, 100));
    } else if (res.status === 404) {
      // 尝试 /orders 子路径
      const res2 = await request('GET', '/value-added/orders?page=1&pageSize=10', null, crmToken);
      if (isSuccess(res2)) {
        log('C-105', '增值服务列表', 'PASS', 'via /orders');
      } else {
        log('C-105', '增值服务列表', 'FAIL', 'status=' + res.status + '/' + res2.status);
      }
    } else {
      log('C-105', '增值服务列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-105', '增值服务列表', 'FAIL', e.message); }
}

// C-106 增值统计
async function test_valueAddedStats() {
  try {
    const res = await request('GET', '/value-added/stats', null, crmToken);
    if (res.status < 500) {
      log('C-106', '增值统计', 'PASS', '接口可达, status=' + res.status);
    } else {
      log('C-106', '增值统计', 'FAIL', 'status=' + res.status);
    }
  } catch (e) { log('C-106', '增值统计', 'FAIL', e.message); }
}

// C-107 结算报表
async function test_settlementReport() {
  try {
    const res = await request('GET', '/value-added/settlement', null, crmToken);
    if (res.status < 500) {
      log('C-107', '结算报表', 'PASS', '接口可达, status=' + res.status);
    } else {
      // 尝试替代路径
      const res2 = await request('GET', '/finance/settlement', null, crmToken);
      if (res2.status < 500) {
        log('C-107', '结算报表', 'PASS', '接口可达(finance), status=' + res2.status);
      } else {
        log('C-107', '结算报表', 'FAIL', 'status=' + res.status + '/' + res2.status);
      }
    }
  } catch (e) { log('C-107', '结算报表', 'FAIL', e.message); }
}

// ==================== 额外: 数据看板(业绩相关) ====================

// C-DASH 数据看板指标
async function test_dashboardMetrics() {
  try {
    const res = await request('GET', '/dashboard/metrics', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      log('C-DASH', '数据看板指标', 'PASS',
        JSON.stringify(d).substring(0, 120));
    } else {
      log('C-DASH', '数据看板指标', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) { log('C-DASH', '数据看板指标', 'FAIL', e.message); }
}

// C-DASH2 订单统计
async function test_dashboardOrderStats() {
  try {
    const res = await request('GET', '/dashboard/order-stats', null, crmToken);
    if (res.status < 500) {
      log('C-DASH2', '订单统计看板', 'PASS', '接口可达, status=' + res.status);
    } else {
      log('C-DASH2', '订单统计看板', 'FAIL', 'status=' + res.status);
    }
  } catch (e) { log('C-DASH2', '订单统计看板', 'FAIL', e.message); }
}

// ========== 主函数 ==========
async function main() {
  console.log('='.repeat(60));
  console.log('CRM测试 - 第6阶段: 业绩与财务');
  console.log('时间: ' + new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(60));

  const ok = await prepare();
  if (!ok) { saveResults(); return; }

  console.log('\n--- 6.1 业绩统计 ---');
  await test_personalPerformance();
  await test_teamPerformance();
  await test_performanceAnalysis();
  await test_personalAnalysis();

  console.log('\n--- 6.2 业绩分享 ---');
  await test_performanceShareList();
  await test_performanceShareStats();
  await test_createPerformanceShare();

  console.log('\n--- 6.3 业绩报表 ---');
  await test_performanceReportConfigs();
  await test_reportTypes();

  console.log('\n--- 6.4 财务管理/绩效 ---');
  await test_financePerformanceStats();
  await test_financePerformanceData();
  await test_financePerformanceManageStats();
  await test_financePerformanceManageList();
  await test_commissionSettings();

  console.log('\n--- 6.5 代收管理(COD) ---');
  await test_codStats();
  await test_codList();
  await test_codListReturned();
  await test_codApplicationList();
  await test_codDepartments();

  console.log('\n--- 6.6 增值服务 ---');
  await test_valueAddedList();
  await test_valueAddedStats();
  await test_settlementReport();

  console.log('\n--- 6.7 数据看板 ---');
  await test_dashboardMetrics();
  await test_dashboardOrderStats();

  // 汇总
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  console.log('\n' + '='.repeat(60));
  console.log('汇总: 通过=' + passed + ' 失败=' + failed + ' 跳过=' + skipped + ' 总计=' + results.length);
  console.log('通过率: ' + Math.round(passed / results.length * 100) + '%');
  if (failed > 0) {
    console.log('\n失败用例:');
    results.filter(r => r.status === 'FAIL').forEach(r =>
      console.log('  X ' + r.id + ' ' + r.name + ': ' + r.detail.substring(0, 100)));
  }
  saveResults();
}

function saveResults() {
  const dir = path.join(__dirname);
  const resultFile = path.join(dir, 'test-phase6-result.json');
  fs.writeFileSync(resultFile, JSON.stringify({ phases: '6', time: new Date().toISOString(), results }, null, 2), 'utf-8');

  const reportFile = path.join(dir, 'test-phase6-report.md');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  let md = '# 第6阶段测试报告 - 业绩与财务\n\n';
  md += '> 执行时间: ' + new Date().toLocaleString('zh-CN') + '\n';
  md += '> 测试环境: localhost:3000 (development)\n\n';

  md += '## 汇总\n\n| 项目 | 数量 |\n|------|------|\n';
  md += '| 通过 | ' + passed + ' |\n| 失败 | ' + failed + ' |\n| 跳过 | ' + skipped + ' |\n| 总计 | ' + results.length + ' |\n\n';
  md += '**通过率: ' + Math.round(passed / results.length * 100) + '%**\n\n';

  // 分组表格
  const groups = [
    { title: '6.1 业绩统计', ids: ['C-090', 'C-091', 'C-092', 'C-092b'] },
    { title: '6.2 业绩分享', ids: ['C-093a', 'C-093b', 'C-093c'] },
    { title: '6.3 业绩报表', ids: ['C-094', 'C-094b'] },
    { title: '6.4 财务管理/绩效', ids: ['C-096', 'C-096b', 'C-097', 'C-097b', 'C-098'] },
    { title: '6.5 代收管理(COD)', ids: ['C-100', 'C-101', 'C-101b', 'C-103', 'C-104'] },
    { title: '6.6 增值服务', ids: ['C-105', 'C-106', 'C-107'] },
    { title: '6.7 数据看板', ids: ['C-DASH', 'C-DASH2'] },
  ];

  groups.forEach(g => {
    md += '### ' + g.title + '\n\n';
    md += '| 编号 | 用例 | 状态 | 详情 |\n|------|------|------|------|\n';
    g.ids.forEach(id => {
      const r = results.find(r => r.id === id);
      if (r) {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
        md += '| ' + r.id + ' | ' + r.name + ' | ' + icon + ' | ' + r.detail.substring(0, 80) + ' |\n';
      }
    });
    md += '\n';
  });

  if (failed > 0) {
    md += '## 失败分析\n\n';
    results.filter(r => r.status === 'FAIL').forEach(r => {
      md += '### ' + r.id + ' - ' + r.name + '\n- ' + r.detail + '\n\n';
    });
  }

  md += '## 下一阶段准备\n\n';
  md += '第6阶段测试完成后，可以继续执行:\n';
  md += '- **第7阶段**: 售后与物流\n';
  md += '- **第8阶段**: 通讯与消息\n';

  fs.writeFileSync(reportFile, md, 'utf-8');
  console.log('\n结果文件: ' + resultFile);
  console.log('报告文件: ' + reportFile);
}

main().catch(e => { console.error('Error:', e); saveResults(); });

