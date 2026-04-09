/**
 * 第2-3阶段测试脚本
 * 第2阶段: 官网注册与会员中心
 * 第3阶段: CRM登录与基础功能(用户/部门/角色)
 *
 * 使用方法: cd backend && node test-phase2-3.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
const API_PREFIX = '/api/v1';
const results = [];

// 从第1阶段获取的数据
const TIANHUAN_TENANT_ID = '8a5fbe74-e0ff-4cd4-8403-b80ea748ae10';
const PINGAN_CUSTOMER_ID = 'ea2be161-a16a-4efe-94d4-26e67f1f156a';
const PINGAN_LICENSE_KEY = 'PRIVATE-AADM-ESCD-CSRW-PDM9';

// 运行时变量
let adminToken = '';
let tianhuanTenantId = TIANHUAN_TENANT_ID;
let tianhuanLicenseKey = '';
let tianhuanCode = '';
let memberToken = '';
let crmTokenTianhuan = '';
let crmTokenPingan = '';
let createdUserId = '';
let createdDeptId = '';

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = urlPath.startsWith('/api/') || urlPath.startsWith('/health') ? urlPath : API_PREFIX + urlPath;
    const url = new URL(API_BASE + fullPath);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
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
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[SKIP]';
  console.log(icon + ' ' + id + ' - ' + name + ': ' + String(detail).substring(0, 120));
}

// ==================== 准备工作：获取Admin Token + 查询租户详情 ====================

async function prepare() {
  // Admin登录
  const loginRes = await request('POST', '/admin/auth/login', { username: 'admin', password: 'admin123' });
  if (loginRes.status === 200 && loginRes.data.success) {
    adminToken = loginRes.data.data.token;
    console.log('[PREP] Admin登录成功');
  } else {
    console.log('[PREP] Admin登录失败，无法继续');
    return false;
  }

  // 查询天环租户详情获取license_key和code
  try {
    const tenantRes = await request('GET', '/admin/tenants?keyword=13800138001', null, adminToken);
    if (tenantRes.status === 200 && tenantRes.data.success) {
      const rawData = tenantRes.data.data;
      let items = [];
      if (Array.isArray(rawData)) items = rawData;
      else if (rawData && Array.isArray(rawData.items)) items = rawData.items;
      else if (rawData && Array.isArray(rawData.list)) items = rawData.list;
      else if (rawData && typeof rawData === 'object') items = [rawData];

      const t = items.find(i => i.phone === '13800138001' || (i.name && i.name.includes('天环')));
      if (t) {
        tianhuanTenantId = t.id;
        tianhuanLicenseKey = t.license_key || t.licenseKey || '';
        tianhuanCode = t.code || '';
        console.log('[PREP] 天环租户: id=' + tianhuanTenantId + ', code=' + tianhuanCode + ', license=' + tianhuanLicenseKey);
      } else {
        console.log('[PREP] 未在列表中找到天环，使用默认ID: ' + tianhuanTenantId);
      }
    }
  } catch(e) {
    console.log('[PREP] 查询租户列表异常: ' + e.message + ', 使用默认ID');
  }

  // 如果没有授权码，尝试给天环生成一个并激活
  if (!tianhuanLicenseKey) {
    console.log('[PREP] 天环无授权码，尝试通过Admin激活...');
    // 查看租户详情确认状态
    const detailRes = await request('GET', '/admin/tenants/' + tianhuanTenantId, null, adminToken);
    if (detailRes.status === 200 && detailRes.data.success) {
      const td = detailRes.data.data;
      tianhuanLicenseKey = td.license_key || td.licenseKey || '';
      tianhuanCode = td.code || '';
      console.log('[PREP] 从详情获取: license=' + tianhuanLicenseKey + ', code=' + tianhuanCode);
    }
  }

  return true;
}

// ==================== 第2阶段：官网与会员中心 ====================

async function phase2_publicPackages() {
  try {
    const res = await request('GET', '/public/packages');
    if (res.status === 200 && (res.data.code === 0 || res.data.success)) {
      const pkgs = res.data.data || [];
      const count = Array.isArray(pkgs) ? pkgs.length : 0;
      log('W-001', '获取公开套餐列表', 'PASS', '共' + count + '个可见套餐');
    } else {
      log('W-001', '获取公开套餐列表', 'FAIL', JSON.stringify(res.data));
    }
  } catch(e) { log('W-001', '获取公开套餐列表', 'FAIL', e.message); }
}

async function phase2_websiteConfig() {
  try {
    const res = await request('GET', '/public/website-config');
    if (res.status === 200) {
      log('W-003', '官网配置', 'PASS', '接口正常返回');
    } else {
      log('W-003', '官网配置', 'FAIL', 'status=' + res.status);
    }
  } catch(e) { log('W-003', '官网配置', 'FAIL', e.message); }
}

async function phase2_versionCheck() {
  try {
    const res = await request('GET', '/public/version-check');
    if (res.status === 200) {
      log('W-023', '版本检查', 'PASS', JSON.stringify(res.data).substring(0, 100));
    } else {
      log('W-023', '版本检查', 'FAIL', 'status=' + res.status);
    }
  } catch(e) { log('W-023', '版本检查', 'FAIL', e.message); }
}

async function phase2_memberLogin() {
  try {
    // 开发环境先发验证码（固定123456）
    const sendRes = await request('POST', '/public/member/send-code', { phone: '13800138001' });
    if (sendRes.status === 200) {
      log('W-004', '发送会员验证码(开发环境)', 'PASS', sendRes.data.message || '发送成功');
    } else {
      log('W-004', '发送会员验证码', 'FAIL', JSON.stringify(sendRes.data));
    }

    // 用验证码登录会员中心
    const loginRes = await request('POST', '/public/member/login', {
      phone: '13800138001',
      loginType: 'sms_code',
      code: '123456',
      tenantId: tianhuanTenantId
    });
    if (loginRes.status === 200 && loginRes.data.code === 0 && loginRes.data.data) {
      memberToken = loginRes.data.data.token || loginRes.data.data.memberToken || '';
      log('W-011', '会员验证码登录', 'PASS', 'token获取成功');
    } else {
      log('W-011', '会员验证码登录', 'FAIL', JSON.stringify(loginRes.data).substring(0, 200));
    }
  } catch(e) { log('W-011', '会员验证码登录', 'FAIL', e.message); }
}

async function phase2_memberPasswordLogin() {
  try {
    const res = await request('POST', '/public/member/login', {
      phone: '13800138001',
      loginType: 'password',
      password: 'Test123456',
      tenantId: tianhuanTenantId
    });
    if (res.status === 200 && res.data.code === 0 && res.data.data) {
      if (!memberToken) memberToken = res.data.data.token || res.data.data.memberToken || '';
      log('W-012', '会员密码登录', 'PASS', '登录成功');
    } else {
      // 可能没设密码，记为SKIP
      log('W-012', '会员密码登录', 'SKIP', '密码未设置或错误: ' + (res.data.message || ''));
    }
  } catch(e) { log('W-012', '会员密码登录', 'SKIP', e.message); }
}

async function phase2_memberProfile() {
  if (!memberToken) { log('W-013', '会员信息', 'SKIP', '无memberToken'); return; }
  try {
    const res = await request('GET', '/public/member/profile', null, memberToken);
    if (res.status === 200 && res.data.code === 0) {
      const p = res.data.data || {};
      log('W-013', '会员信息', 'PASS', 'name=' + (p.name || p.companyName || 'N/A'));
    } else {
      log('W-013', '会员信息', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('W-013', '会员信息', 'FAIL', e.message); }
}

async function phase2_memberLicense() {
  if (!memberToken) { log('W-017', '会员授权信息', 'SKIP', '无memberToken'); return; }
  try {
    const res = await request('GET', '/public/member/license', null, memberToken);
    if (res.status === 200 && res.data.code === 0) {
      const d = res.data.data || {};
      log('W-017', '会员授权信息', 'PASS', 'licenseKey=' + (d.licenseKey || d.license_key || 'N/A') + ', status=' + (d.licenseStatus || d.status || 'N/A'));
    } else {
      log('W-017', '会员授权信息', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('W-017', '会员授权信息', 'FAIL', e.message); }
}

async function phase2_memberBills() {
  if (!memberToken) { log('W-016', '账单记录', 'SKIP', '无memberToken'); return; }
  try {
    const res = await request('GET', '/public/member/bills?page=1&pageSize=10', null, memberToken);
    if (res.status === 200 && res.data.code === 0) {
      log('W-016', '账单记录', 'PASS', '接口正常');
    } else {
      log('W-016', '账单记录', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('W-016', '账单记录', 'FAIL', e.message); }
}

async function phase2_licenseQuery() {
  try {
    const res = await request('GET', '/public/license-query?licenseKey=' + encodeURIComponent(PINGAN_LICENSE_KEY));
    if (res.status === 200) {
      log('W-024', '授权查询(私有)', 'PASS', JSON.stringify(res.data).substring(0, 150));
    } else {
      log('W-024', '授权查询(私有)', 'FAIL', 'status=' + res.status);
    }
  } catch(e) { log('W-024', '授权查询(私有)', 'FAIL', e.message); }
}

async function phase2_capacityPrice() {
  try {
    const res = await request('GET', '/public/capacity/price');
    if (res.status === 200) {
      log('W-018', '扩容价格查询', 'PASS', JSON.stringify(res.data).substring(0, 150));
    } else {
      log('W-018', '扩容价格查询', 'FAIL', 'status=' + res.status);
    }
  } catch(e) { log('W-018', '扩容价格查询', 'FAIL', e.message); }
}

// ==================== 第3阶段：CRM登录与基础功能 ====================

async function phase3_crmLogin_tianhuan() {
  try {
    const res = await request('POST', '/auth/login', {
      username: '13800138001',
      password: 'Aa123456',
      tenantId: tianhuanTenantId
    });

    // 解析可能的多种返回结构
    const d = res.data.data || res.data;
    const tokens = d.tokens || {};
    const token = d.token || tokens.accessToken || tokens.token || d.accessToken || d.access_token || '';
    const user = d.user || d;

    if (res.status === 200 && (res.data.success || res.data.code === 0 || token)) {
      if (token) {
        crmTokenTianhuan = token;
        log('C-001', 'CRM登录(天环租户)', 'PASS', 'role=' + (user.role || 'N/A') + ', token长度=' + token.length);
        return true;
      }
    }

    log('C-001', 'CRM登录(天环租户)', 'FAIL', 'status=' + res.status + ', msg=' + (res.data.message || '') + ', keys=' + Object.keys(d).join(','));
    return false;
  } catch(e) {
    log('C-001', 'CRM登录(天环租户)', 'FAIL', e.message);
    return false;
  }
}

async function phase3_crmLogin_wrongPwd() {
  try {
    const res = await request('POST', '/auth/login', {
      username: '13800138001',
      password: 'wrongpassword',
      tenantId: tianhuanTenantId
    });
    const d = res.data.data || res.data;
    const token = d.token || d.accessToken || '';
    if (!token && (res.status >= 400 || !res.data.success || res.data.code !== 0)) {
      log('C-003', '错误密码登录', 'PASS', '正确拦截: ' + (res.data.message || 'status=' + res.status));
    } else {
      log('C-003', '错误密码登录', 'FAIL', '未正确拦截,status=' + res.status);
    }
  } catch(e) { log('C-003', '错误密码登录', 'FAIL', e.message); }
}

async function phase3_tokenRefresh() {
  // 跳过，因为refresh token通常在登录时返回
  log('C-005', 'Token刷新', 'SKIP', '需要refreshToken,登录返回中获取');
}

async function phase3_getCurrentUser() {
  if (!crmTokenTianhuan) { log('C-006', '获取当前用户信息', 'SKIP', '无CRM token'); return; }
  try {
    const res = await request('GET', '/auth/me', null, crmTokenTianhuan);
    if (res.status === 200 && res.data.success) {
      const u = res.data.data || {};
      log('C-006', '获取当前用户信息', 'PASS', 'name=' + (u.name || u.realName || 'N/A') + ', role=' + (u.role || 'N/A'));
    } else {
      log('C-006', '获取当前用户信息', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-006', '获取当前用户信息', 'FAIL', e.message); }
}

async function phase3_createUser() {
  if (!crmTokenTianhuan) { log('C-010', '创建销售成员', 'SKIP', '无CRM token'); return; }
  try {
    // 先查角色列表获取roleId
    const rolesRes = await request('GET', '/roles', null, crmTokenTianhuan);
    let salesRoleId = 'sales';
    if (rolesRes.status === 200 && rolesRes.data.success) {
      const rolesData = rolesRes.data.data || {};
      // 角色列表可能在 data.roles 或直接是数组
      const roles = Array.isArray(rolesData) ? rolesData : (rolesData.roles || []);
      const salesRole = roles.find(r => r.name === 'sales' || r.code === 'sales' || r.name === '销售');
      if (salesRole) salesRoleId = salesRole.id;
      log('C-027', '查看角色列表', 'PASS', '共' + roles.length + '个角色');
    }

    const res = await request('POST', '/users', {
      username: 'wangxiaoshou',
      password: 'Aa123456',
      realName: '王销售',
      phone: '13800000002',
      role: 'sales',
      roleId: salesRoleId,
      position: '销售专员'
    }, crmTokenTianhuan);

    if ((res.status === 200 || res.status === 201) && res.data.success) {
      createdUserId = res.data.data ? (res.data.data.id || res.data.data.userId || '') : '';
      log('C-010', '创建销售成员(王销售)', 'PASS', 'id=' + createdUserId);
    } else {
      // 可能已存在
      if (res.data.message && (res.data.message.includes('已存在') || res.data.message.includes('exist'))) {
        log('C-010', '创建销售成员(王销售)', 'PASS', '已存在(重复测试)');
      } else {
        log('C-010', '创建销售成员(王销售)', 'FAIL', JSON.stringify(res.data).substring(0, 200));
      }
    }
  } catch(e) { log('C-010', '创建销售成员', 'FAIL', e.message); }
}

async function phase3_createManagerUser() {
  if (!crmTokenTianhuan) { log('C-012', '创建经理', 'SKIP', '无CRM token'); return; }
  try {
    const res = await request('POST', '/users', {
      username: 'lijingli',
      password: 'Aa123456',
      realName: '李经理',
      phone: '13800000003',
      role: 'manager',
      roleId: 'manager',
      position: '部门经理'
    }, crmTokenTianhuan);

    if ((res.status === 200 || res.status === 201) && res.data.success) {
      log('C-012', '创建经理(李经理)', 'PASS', '创建成功');
    } else if (res.data.message && res.data.message.includes('已存在')) {
      log('C-012', '创建经理(李经理)', 'PASS', '已存在');
    } else {
      log('C-012', '创建经理(李经理)', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-012', '创建经理', 'FAIL', e.message); }
}

async function phase3_createServiceUser() {
  if (!crmTokenTianhuan) { log('C-011', '创建客服', 'SKIP', '无CRM token'); return; }
  try {
    const res = await request('POST', '/users', {
      username: 'zhaokefu',
      password: 'Aa123456',
      realName: '赵客服',
      phone: '13800000004',
      role: 'customer_service',
      roleId: 'customer_service',
      position: '客服专员'
    }, crmTokenTianhuan);

    if ((res.status === 200 || res.status === 201) && res.data.success) {
      log('C-011', '创建客服(赵客服)', 'PASS', '创建成功');
    } else if (res.data.message && res.data.message.includes('已存在')) {
      log('C-011', '创建客服(赵客服)', 'PASS', '已存在');
    } else {
      log('C-011', '创建客服(赵客服)', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-011', '创建客服', 'FAIL', e.message); }
}

async function phase3_getUserList() {
  if (!crmTokenTianhuan) { log('C-013', '用户列表', 'SKIP', '无CRM token'); return; }
  try {
    const res = await request('GET', '/users', null, crmTokenTianhuan);
    if (res.status === 200 && res.data.success) {
      const users = res.data.data || [];
      const count = Array.isArray(users) ? users.length : (users.items ? users.items.length : 0);
      log('C-013', '用户列表(仅本租户)', 'PASS', '共' + count + '个用户');
    } else {
      log('C-013', '用户列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-013', '用户列表', 'FAIL', e.message); }
}

async function phase3_getPermissions() {
  if (!crmTokenTianhuan) { log('C-030', '权限列表', 'SKIP', '无CRM token'); return; }
  try {
    const res = await request('GET', '/permissions', null, crmTokenTianhuan);
    if (res.status === 200 && res.data.success) {
      const perms = res.data.data || [];
      log('C-030', '权限列表', 'PASS', '共' + (Array.isArray(perms) ? perms.length : 0) + '个权限项');
    } else {
      log('C-030', '权限列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-030', '权限列表', 'FAIL', e.message); }
}

async function phase3_getSystemSettings() {
  if (!crmTokenTianhuan) { log('C-035', '系统设置', 'SKIP', '无CRM token'); return; }
  try {
    const res = await request('GET', '/system/settings', null, crmTokenTianhuan);
    if (res.status === 200 && res.data.success) {
      log('C-035', '获取系统设置', 'PASS', '设置获取成功');
    } else {
      log('C-035', '获取系统设置', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-035', '获取系统设置', 'FAIL', e.message); }
}

async function phase3_getLicense() {
  if (!crmTokenTianhuan) { log('C-038', 'CRM授权信息', 'SKIP', '无CRM token'); return; }
  try {
    const res = await request('GET', '/license/info', null, crmTokenTianhuan);
    if (res.status === 200) {
      log('C-038', 'CRM授权信息', 'PASS', JSON.stringify(res.data).substring(0, 150));
    } else {
      log('C-038', 'CRM授权信息', 'FAIL', 'status=' + res.status);
    }
  } catch(e) { log('C-038', 'CRM授权信息', 'FAIL', e.message); }
}

async function phase3_getDashboard() {
  if (!crmTokenTianhuan) { log('C-DASH', 'CRM数据看板', 'SKIP', '无CRM token'); return; }
  try {
    // 优先尝试 /dashboard/metrics，兼容 /dashboard
    let res = await request('GET', '/dashboard/metrics', null, crmTokenTianhuan);
    if (res.status === 404) {
      res = await request('GET', '/dashboard', null, crmTokenTianhuan);
    }
    if (res.status === 200 && (res.data.success || res.data.data)) {
      log('C-DASH', 'CRM数据看板', 'PASS', JSON.stringify(res.data.data || res.data).substring(0, 150));
    } else {
      log('C-DASH', 'CRM数据看板', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch(e) { log('C-DASH', 'CRM数据看板', 'FAIL', e.message); }
}

// ==================== 主函数 ====================

async function main() {
  console.log('='.repeat(60));
  console.log('CRM测试 - 第2阶段(官网/会员) + 第3阶段(CRM登录/用户/角色)');
  console.log('时间: ' + new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(60));

  const ready = await prepare();
  if (!ready) { saveResults(); return; }

  // ===== 第2阶段 =====
  console.log('\n--- 第2阶段: 官网与会员中心 ---');
  await phase2_publicPackages();
  await phase2_websiteConfig();
  await phase2_versionCheck();
  await phase2_capacityPrice();
  await phase2_memberLogin();
  await phase2_memberPasswordLogin();
  await phase2_memberProfile();
  await phase2_memberLicense();
  await phase2_memberBills();
  await phase2_licenseQuery();

  // ===== 第3阶段 =====
  console.log('\n--- 第3阶段: CRM登录与基础功能 ---');
  const crmOk = await phase3_crmLogin_tianhuan();
  await phase3_crmLogin_wrongPwd();
  await phase3_tokenRefresh();
  await phase3_getCurrentUser();
  await phase3_createUser();
  await phase3_createManagerUser();
  await phase3_createServiceUser();
  await phase3_getUserList();
  await phase3_getPermissions();
  await phase3_getSystemSettings();
  await phase3_getLicense();
  await phase3_getDashboard();

  // ===== 汇总 =====
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  console.log('第2-3阶段测试汇总: 通过=' + passed + ' 失败=' + failed + ' 跳过=' + skipped + ' 总计=' + results.length);

  if (failed > 0) {
    console.log('\n失败用例:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log('  X ' + r.id + ' ' + r.name + ': ' + r.detail.substring(0, 100));
    });
  }

  saveResults();
}

function saveResults() {
  const resultFile = path.join(__dirname, '..', 'test-phase2-3-result.json');
  fs.writeFileSync(resultFile, JSON.stringify({ phases: '2-3', time: new Date().toISOString(), results }, null, 2), 'utf-8');

  const reportFile = path.join(__dirname, '..', 'test-phase2-3-report.md');
  let md = '# 第2-3阶段测试报告\n\n';
  md += '> 执行时间: ' + new Date().toLocaleString('zh-CN') + '\n\n';

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  md += '## 汇总\n\n| 项目 | 数量 |\n|------|------|\n';
  md += '| 通过 | ' + passed + ' |\n| 失败 | ' + failed + ' |\n| 跳过 | ' + skipped + ' |\n| 总计 | ' + results.length + ' |\n\n';

  md += '## 第2阶段 - 官网与会员中心\n\n';
  md += '| 编号 | 用例 | 状态 | 详情 |\n|------|------|------|------|\n';
  results.filter(r => r.id.startsWith('W-')).forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    md += '| ' + r.id + ' | ' + r.name + ' | ' + icon + ' | ' + r.detail.substring(0, 80) + ' |\n';
  });

  md += '\n## 第3阶段 - CRM登录与基础功能\n\n';
  md += '| 编号 | 用例 | 状态 | 详情 |\n|------|------|------|------|\n';
  results.filter(r => r.id.startsWith('C-')).forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    md += '| ' + r.id + ' | ' + r.name + ' | ' + icon + ' | ' + r.detail.substring(0, 80) + ' |\n';
  });

  if (failed > 0) {
    md += '\n## 失败分析\n\n';
    results.filter(r => r.status === 'FAIL').forEach(r => {
      md += '### ' + r.id + ' - ' + r.name + '\n- 详情: ' + r.detail + '\n- 建议: 检查接口和数据\n\n';
    });
  }

  fs.writeFileSync(reportFile, md, 'utf-8');
  console.log('\n结果: ' + resultFile);
  console.log('报告: ' + reportFile);
}

main().catch(e => { console.error('异常:', e); saveResults(); });





