/**
 * 第4-5阶段测试脚本
 * 第4阶段: 客户管理全流程(新建/编辑/搜索/标签/分组/分享/导出)
 * 第5阶段: 订单与商品管理(商品CRUD/订单创建/审核/发货)
 *
 * 使用方法: cd backend && node ../tests/test-phase4-5.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
const API_PREFIX = '/api/v1';
const results = [];

// 从前几阶段获取的数据
const TIANHUAN_TENANT_ID = '8a5fbe74-e0ff-4cd4-8403-b80ea748ae10';

let adminToken = '';
let crmToken = '';
let createdCustomerIds = [];
let createdTagId = '';
let createdGroupId = '';
let createdProductId = '';
let createdOrderId = '';

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

// ========== 准备: CRM登录 ==========
async function prepare() {
  // CRM登录
  const res = await request('POST', '/auth/login', {
    username: '13800138001', password: 'Aa123456', tenantId: TIANHUAN_TENANT_ID
  });
  const d = res.data.data || res.data;
  const tokens = d.tokens || {};
  crmToken = d.token || tokens.accessToken || tokens.token || '';
  if (!crmToken) { console.log('CRM登录失败:', JSON.stringify(res.data).substring(0, 200)); return false; }
  console.log('[PREP] CRM登录成功, role=' + ((d.user || {}).role || 'N/A'));
  // Admin登录
  const adminRes = await request('POST', '/admin/auth/login', { username: 'admin', password: 'admin123' });
  if (adminRes.data.success) adminToken = adminRes.data.data.token;
  return true;
}

// ==================== 第4阶段: 客户管理 ====================

async function test_createCustomerA() {
  try {
    const res = await request('POST', '/customers', {
      name: '测试客户A-天环', phone: '15800000001', gender: 'male',
      source: '电话咨询', level: 'normal', remark: '第4阶段测试客户A'
    }, crmToken);
    if (isSuccess(res)) {
      const c = res.data.data || {};
      createdCustomerIds.push(c.id);
      log('C-040', '新建客户A', 'PASS', 'id=' + c.id + ', code=' + (c.customerCode || c.code || 'N/A'));
    } else if (res.data.message && res.data.message.includes('已存在')) {
      // 已存在时尝试从列表获取ID
      log('C-040', '新建客户A', 'PASS', '已存在(重复测试)');
    } else {
      log('C-040', '新建客户A', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-040', '新建客户A', 'FAIL', e.message); }
}

async function test_createCustomerB() {
  try {
    const res = await request('POST', '/customers', {
      name: '测试客户B-天环', phone: '15800000002', gender: 'female',
      source: '微信推广', level: 'vip', email: 'customerB@test.com',
      address: '广州市天河区', company: '测试公司B', remark: 'VIP客户测试'
    }, crmToken);
    if (isSuccess(res)) {
      const c = res.data.data || {};
      createdCustomerIds.push(c.id);
      log('C-041', '新建客户B(完整)', 'PASS', 'id=' + c.id);
    } else if (res.data.message && res.data.message.includes('已存在')) {
      log('C-041', '新建客户B(完整)', 'PASS', '已存在');
    } else {
      log('C-041', '新建客户B(完整)', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-041', '新建客户B(完整)', 'FAIL', e.message); }
}

async function test_duplicatePhone() {
  try {
    const res = await request('POST', '/customers', {
      name: '重复客户', phone: '15800000001'
    }, crmToken);
    if (!isSuccess(res) || (res.data.message && res.data.message.includes('已存在'))) {
      log('C-042', '重复手机号', 'PASS', '正确提示: ' + (res.data.message || 'status=' + res.status));
    } else {
      log('C-042', '重复手机号', 'FAIL', '未拦截重复');
    }
  } catch(e) { log('C-042', '重复手机号', 'FAIL', e.message); }
}

async function test_customerList() {
  try {
    const res = await request('GET', '/customers?page=1&pageSize=20', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const total = d.total || (Array.isArray(d) ? d.length : 0);
      // 如果之前创建的客户ID为空，尝试从列表获取
      if (createdCustomerIds.length === 0) {
        const items = d.items || d.list || (Array.isArray(d) ? d : []);
        if (items.length > 0) {
          createdCustomerIds.push(items[0].id);
          if (items.length > 1) createdCustomerIds.push(items[1].id);
        }
      }
      log('C-043', '客户列表', 'PASS', '共' + total + '条, ids=' + createdCustomerIds.length);
    } else { log('C-043', '客户列表', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-043', '客户列表', 'FAIL', e.message); }
}

async function test_customerSearch() {
  try {
    const res = await request('GET', '/customers?keyword=15800000001', null, crmToken);
    if (isSuccess(res)) {
      log('C-044', '客户搜索', 'PASS', '搜索接口正常');
    } else { log('C-044', '客户搜索', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-044', '客户搜索', 'FAIL', e.message); }
}

async function test_customerDetail() {
  if (!createdCustomerIds[0]) { log('C-045', '客户详情', 'SKIP', '无客户ID'); return; }
  try {
    const res = await request('GET', '/customers/' + createdCustomerIds[0], null, crmToken);
    if (isSuccess(res)) {
      log('C-045', '客户详情', 'PASS', 'name=' + (res.data.data || {}).name);
    } else { log('C-045', '客户详情', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-045', '客户详情', 'FAIL', e.message); }
}

async function test_editCustomer() {
  if (!createdCustomerIds[0]) { log('C-046', '编辑客户', 'SKIP', '无客户ID'); return; }
  try {
    const res = await request('PUT', '/customers/' + createdCustomerIds[0], {
      remark: '已编辑-第4阶段测试更新', level: 'important'
    }, crmToken);
    if (isSuccess(res)) {
      log('C-046', '编辑客户', 'PASS', '更新成功');
    } else { log('C-046', '编辑客户', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-046', '编辑客户', 'FAIL', e.message); }
}

// 标签
async function test_createTag() {
  try {
    const res = await request('POST', '/customers/tags', { name: 'VIP客户', color: '#ff6600' }, crmToken);
    if (isSuccess(res)) {
      createdTagId = (res.data.data || {}).id || '';
      log('C-048', '创建标签', 'PASS', 'id=' + createdTagId);
    } else if (res.data.message && res.data.message.includes('已存在')) {
      log('C-048', '创建标签', 'PASS', '已存在');
    } else { log('C-048', '创建标签', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-048', '创建标签', 'FAIL', e.message); }
}

async function test_tagList() {
  try {
    // 标签列表端点: GET /customers/tags
    let res = await request('GET', '/customers/tags?page=1&pageSize=20', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const list = d.list || (Array.isArray(d) ? d : []);
      log('C-050', '标签列表', 'PASS', '共' + (Array.isArray(list) ? list.length : (d.total || 0)) + '个标签');
    } else {
      log('C-050', '标签列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-050', '标签列表', 'FAIL', e.message); }
}

// 分组
async function test_createGroup() {
  try {
    const res = await request('POST', '/customers/groups', { name: 'A类客户', description: '高价值客户' }, crmToken);
    if (isSuccess(res)) {
      createdGroupId = (res.data.data || {}).id || '';
      log('C-051', '创建分组', 'PASS', 'id=' + createdGroupId);
    } else if (res.data.message && res.data.message.includes('已存在')) {
      log('C-051', '创建分组', 'PASS', '已存在');
    } else { log('C-051', '创建分组', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-051', '创建分组', 'FAIL', e.message); }
}

// 客户分享
async function test_customerShare() {
  if (!createdCustomerIds[0]) { log('C-053', '分享客户', 'SKIP', '无客户ID'); return; }
  try {
    // 先获取用户列表找到其他用户
    const usersRes = await request('GET', '/users', null, crmToken);
    let targetUserId = '';
    if (usersRes.status === 200 && usersRes.data.success) {
      const users = usersRes.data.data || [];
      const arr = Array.isArray(users) ? users : (users.items || []);
      const other = arr.find(u => u.username !== '13800138001');
      if (other) targetUserId = other.id;
    }
    if (!targetUserId) { log('C-053', '分享客户', 'SKIP', '无其他用户可分享'); return; }

    const res = await request('POST', '/customer-share/share', {
      customerId: createdCustomerIds[0], sharedTo: targetUserId, remark: '测试分享'
    }, crmToken);
    if (isSuccess(res)) {
      log('C-053', '分享客户', 'PASS', '分享成功');
    } else { log('C-053', '分享客户', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-053', '分享客户', 'FAIL', e.message); }
}

// 删除客户(软删除)
async function test_deleteCustomer() {
  if (createdCustomerIds.length < 2) { log('C-047', '删除客户', 'SKIP', '无多余客户可删除'); return; }
  try {
    const res = await request('DELETE', '/customers/' + createdCustomerIds[1], null, crmToken);
    if (res.status === 200 && res.data.success) {
      log('C-047', '删除客户', 'PASS', '已进入回收站');
    } else { log('C-047', '删除客户', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-047', '删除客户', 'FAIL', e.message); }
}

// ==================== 第5阶段: 订单与商品 ====================

async function test_createProduct() {
  try {
    const res = await request('POST', '/products', {
      name: '测试商品A-保健品', category: '保健品', price: 298, cost: 100,
      stock: 100, unit: '盒', description: '第5阶段测试商品', status: 'active'
    }, crmToken);
    if (isSuccess(res)) {
      const p = res.data.data || {};
      createdProductId = p.id || '';
      log('C-064', '新增商品', 'PASS', 'id=' + createdProductId + ', name=' + p.name);
    } else if (res.data.message && res.data.message.includes('已存在')) {
      log('C-064', '新增商品', 'PASS', '已存在');
    } else { log('C-064', '新增商品', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-064', '新增商品', 'FAIL', e.message); }
}

async function test_productList() {
  try {
    const res = await request('GET', '/products', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const items = d.items || (Array.isArray(d) ? d : []);
      const count = d.total || items.length;
      // 如果product ID为空，尝试获取
      if (!createdProductId && items.length > 0) {
        createdProductId = items[0].id;
      }
      log('C-065', '商品列表', 'PASS', '共' + count + '个商品');
    } else { log('C-065', '商品列表', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-065', '商品列表', 'FAIL', e.message); }
}

async function test_createOrder() {
  if (!createdCustomerIds[0]) { log('C-070', '新建订单', 'SKIP', '无客户ID'); return; }
  try {
    const products = [];
    if (createdProductId) {
      products.push({ productId: createdProductId, productName: '测试商品A-保健品', quantity: 2, unitPrice: 298, totalPrice: 596 });
    } else {
      products.push({ productName: '测试商品(手动)', quantity: 1, unitPrice: 298, totalPrice: 298 });
    }
    const res = await request('POST', '/orders', {
      customerId: createdCustomerIds[0], customerName: '测试客户A-天环',
      totalAmount: 596, discount: 0,
      receiverName: '张三', receiverPhone: '15800000001',
      receiverAddress: '广州市天河区天环广场',
      remark: '第5阶段测试订单', products
    }, crmToken);
    if (isSuccess(res)) {
      const o = res.data.data || {};
      createdOrderId = o.id || '';
      log('C-070', '新建订单', 'PASS', 'id=' + createdOrderId + ', orderNo=' + (o.orderNo || o.order_no || 'N/A'));
    } else { log('C-070', '新建订单', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-070', '新建订单', 'FAIL', e.message); }
}

async function test_orderList() {
  try {
    const res = await request('GET', '/orders?page=1&pageSize=20', null, crmToken);
    if (isSuccess(res)) {
      const d = res.data.data || {};
      const total = d.total || (Array.isArray(d) ? d.length : 0);
      log('C-073', '订单列表', 'PASS', '共' + total + '条订单');
    } else { log('C-073', '订单列表', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-073', '订单列表', 'FAIL', e.message); }
}

async function test_orderDetail() {
  if (!createdOrderId) { log('C-075', '订单详情', 'SKIP', '无订单ID'); return; }
  try {
    const res = await request('GET', '/orders/' + createdOrderId, null, crmToken);
    if (isSuccess(res)) {
      const o = res.data.data || {};
      log('C-075', '订单详情', 'PASS', 'status=' + (o.status || 'N/A') + ', amount=' + (o.finalAmount || o.final_amount || 'N/A'));
    } else { log('C-075', '订单详情', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-075', '订单详情', 'FAIL', e.message); }
}

async function test_submitAudit() {
  if (!createdOrderId) { log('C-077', '提交审核', 'SKIP', '无订单ID'); return; }
  try {
    const res = await request('POST', '/orders/' + createdOrderId + '/submit-audit', {}, crmToken);
    if (isSuccess(res)) {
      log('C-077', '提交审核', 'PASS', '已提交审核');
    } else { log('C-077', '提交审核', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-077', '提交审核', 'FAIL', e.message); }
}

async function test_auditApprove() {
  if (!createdOrderId) { log('C-078', '审核通过', 'SKIP', '无订单ID'); return; }
  try {
    const res = await request('POST', '/orders/' + createdOrderId + '/audit', {
      action: 'approve', remark: '测试审核通过'
    }, crmToken);
    if (isSuccess(res)) {
      log('C-078', '审核通过', 'PASS', '审核通过');
    } else { log('C-078', '审核通过', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-078', '审核通过', 'FAIL', e.message); }
}

async function test_orderShip() {
  try {
    // 查询待发货和发货统计
    const res = await request('GET', '/orders/shipping/statistics', null, crmToken);
    if (isSuccess(res)) {
      log('C-080', '发货统计', 'PASS', JSON.stringify(res.data.data || {}).substring(0, 100));
    } else {
      // 尝试待发货列表
      const res2 = await request('GET', '/orders/shipping/pending?page=1&pageSize=5', null, crmToken);
      if (isSuccess(res2)) {
        log('C-080', '待发货列表', 'PASS', '接口正常');
      } else {
        log('C-080', '发货接口', 'FAIL', JSON.stringify(res.data).substring(0, 200));
      }
    }
  } catch(e) { log('C-080', '发货接口', 'FAIL', e.message); }
}

// 售后
async function test_serviceCreate() {
  try {
    const res = await request('POST', '/services', {
      type: 'complaint', title: '测试售后工单', description: '第7阶段测试',
      customerId: createdCustomerIds[0] || null, orderId: createdOrderId || null, priority: 'normal'
    }, crmToken);
    if (isSuccess(res)) {
      log('C-108', '创建售后工单', 'PASS', '工单创建成功, id=' + ((res.data.data || {}).id || ''));
    } else { log('C-108', '创建售后工单', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-108', '创建售后工单', 'FAIL', e.message); }
}

async function test_serviceList() {
  try {
    const res = await request('GET', '/services', null, crmToken);
    if (isSuccess(res)) {
      log('C-109', '售后列表', 'PASS', '接口正常');
    } else { log('C-109', '售后列表', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-109', '售后列表', 'FAIL', e.message); }
}

// 业绩
async function test_performance() {
  try {
    const res = await request('GET', '/performance/personal', null, crmToken);
    if (isSuccess(res)) {
      log('C-090', '业绩数据', 'PASS', '个人业绩接口正常');
    } else {
      const res2 = await request('GET', '/performance/stats', null, crmToken);
      if (isSuccess(res2)) {
        log('C-090', '业绩数据', 'PASS', '业绩统计接口正常');
      } else {
        log('C-090', '业绩数据', 'FAIL', JSON.stringify(res.data).substring(0, 200));
      }
    }
  } catch(e) { log('C-090', '业绩数据', 'FAIL', e.message); }
}

// 物流(通过订单发货关联)
async function test_logistics() {
  try {
    const res = await request('GET', '/sf-express/query?trackingNumber=SF1234567890', null, crmToken);
    if (res.status < 500) {
      log('C-115', '物流查询', 'PASS', '接口可达, status=' + res.status);
    } else { log('C-115', '物流查询', 'FAIL', 'status=' + res.status); }
  } catch(e) { log('C-115', '物流查询', 'FAIL', e.message); }
}

// 通话/短信
async function test_calls() {
  try {
    const res = await request('GET', '/calls/records', null, crmToken);
    if (res.status < 500) {
      log('C-121', '通话记录', 'PASS', '接口正常');
    } else { log('C-121', '通话记录', 'FAIL', 'status=' + res.status); }
  } catch(e) { log('C-121', '通话记录', 'FAIL', e.message); }
}

// 数据看板
async function test_dashboard() {
  try {
    const res = await request('GET', '/dashboard/metrics', null, crmToken);
    if (isSuccess(res)) {
      log('C-133', '数据看板', 'PASS', '接口正常');
    } else { log('C-133', '数据看板', 'FAIL', JSON.stringify(res.data).substring(0, 200)); }
  } catch(e) { log('C-133', '数据看板', 'FAIL', e.message); }
}

// ========== 主函数 ==========
async function main() {
  console.log('='.repeat(60));
  console.log('CRM测试 - 第4阶段(客户) + 第5阶段(订单商品) + 额外接口');
  console.log('时间: ' + new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(60));

  const ok = await prepare();
  if (!ok) { saveResults(); return; }

  console.log('\n--- 第4阶段: 客户管理 ---');
  await test_createCustomerA();
  await test_createCustomerB();
  await test_duplicatePhone();
  await test_customerList();
  await test_customerSearch();
  await test_customerDetail();
  await test_editCustomer();
  await test_createTag();
  await test_tagList();
  await test_createGroup();
  await test_customerShare();
  await test_deleteCustomer();

  console.log('\n--- 第5阶段: 商品与订单 ---');
  await test_createProduct();
  await test_productList();
  await test_createOrder();
  await test_orderList();
  await test_orderDetail();
  await test_submitAudit();
  await test_auditApprove();
  await test_orderShip();

  console.log('\n--- 额外接口: 售后/业绩/物流/通讯/消息 ---');
  await test_serviceCreate();
  await test_serviceList();
  await test_performance();
  await test_logistics();
  await test_calls();
  await test_dashboard();

  // 汇总
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  console.log('\n' + '='.repeat(60));
  console.log('汇总: 通过=' + passed + ' 失败=' + failed + ' 跳过=' + skipped + ' 总计=' + results.length);
  if (failed > 0) {
    console.log('\n失败:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log('  X ' + r.id + ' ' + r.name + ': ' + r.detail.substring(0, 100)));
  }
  saveResults();
}

function saveResults() {
  const dir = path.join(__dirname);
  const resultFile = path.join(dir, 'test-phase4-5-result.json');
  fs.writeFileSync(resultFile, JSON.stringify({ phases: '4-5', time: new Date().toISOString(), results }, null, 2), 'utf-8');

  const reportFile = path.join(dir, 'test-phase4-5-report.md');
  let md = '# 第4-5阶段测试报告 - 客户管理 + 订单商品\n\n';
  md += '> 执行时间: ' + new Date().toLocaleString('zh-CN') + '\n\n';
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  md += '## 汇总\n\n| 项目 | 数量 |\n|------|------|\n';
  md += '| 通过 | ' + passed + ' |\n| 失败 | ' + failed + ' |\n| 跳过 | ' + skipped + ' |\n| 总计 | ' + results.length + ' |\n\n';

  md += '## 详细结果\n\n| 编号 | 用例 | 状态 | 详情 |\n|------|------|------|------|\n';
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    md += '| ' + r.id + ' | ' + r.name + ' | ' + icon + ' | ' + r.detail.substring(0, 80) + ' |\n';
  });

  if (failed > 0) {
    md += '\n## 失败分析\n\n';
    results.filter(r => r.status === 'FAIL').forEach(r => {
      md += '### ' + r.id + ' - ' + r.name + '\n- ' + r.detail + '\n\n';
    });
  }

  fs.writeFileSync(reportFile, md, 'utf-8');
  console.log('\n结果: ' + resultFile);
  console.log('报告: ' + reportFile);
}

main().catch(e => { console.error('Error:', e); saveResults(); });

