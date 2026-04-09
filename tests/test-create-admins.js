/**
 * 为测试租户创建CRM管理员账号
 * 使用方法: cd backend && node test-create-admins.js
 */
const http = require('http');

const API_BASE = 'http://localhost:3000';
const API_PREFIX = '/api/v1';

const TIANHUAN_TENANT_ID = '8a5fbe74-e0ff-4cd4-8403-b80ea748ae10';

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = urlPath.startsWith('/api/') || urlPath.startsWith('/health') ? urlPath : API_PREFIX + urlPath;
    const url = new URL(API_BASE + fullPath);
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json' }, timeout: 15000,
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

async function main() {
  console.log('=== 为测试租户创建CRM管理员 ===');

  // 1. Admin登录
  const loginRes = await request('POST', '/admin/auth/login', { username: 'admin', password: 'admin123' });
  if (!loginRes.data.success) { console.log('Admin登录失败'); return; }
  const adminToken = loginRes.data.data.token;
  console.log('Admin登录成功');

  // 2. 先激活天环的授权(确保license_status=active)
  console.log('\n--- 激活天环租户授权 ---');
  const activateRes = await request('PUT', '/admin/tenants/' + TIANHUAN_TENANT_ID, {
    status: 'active',
    license_status: 'active',
    licenseStatus: 'active'
  }, adminToken);
  console.log('激活结果:', activateRes.status, JSON.stringify(activateRes.data).substring(0, 200));

  // 3. 查看天环详情确认
  const detailRes = await request('GET', '/admin/tenants/' + TIANHUAN_TENANT_ID, null, adminToken);
  if (detailRes.status === 200 && detailRes.data.success) {
    const t = detailRes.data.data;
    console.log('天环状态:', 'status=' + t.status, 'licenseStatus=' + (t.license_status || t.licenseStatus));
    console.log('天环授权码:', t.license_key || t.licenseKey || '无');
    console.log('天环code:', t.code);
  }

  // 4. 调用Admin接口为租户初始化管理员
  // 先检查tenants路由中是否有初始化管理员的端点
  console.log('\n--- 为天环创建CRM管理员 ---');
  const initRes = await request('POST', '/admin/tenants/' + TIANHUAN_TENANT_ID + '/init-admin', {
    phone: '13800138001',
    realName: '张天环',
    email: 'tianhuan@test.com'
  }, adminToken);
  console.log('初始化管理员:', initRes.status, JSON.stringify(initRes.data).substring(0, 200));

  // 如果没有init-admin端点，尝试直接创建
  if (initRes.status === 404) {
    console.log('\n没有init-admin端点，尝试通过create-admin端点...');
    const createRes = await request('POST', '/admin/tenants/' + TIANHUAN_TENANT_ID + '/create-admin', {
      phone: '13800138001',
      realName: '张天环'
    }, adminToken);
    console.log('create-admin结果:', createRes.status, JSON.stringify(createRes.data).substring(0, 200));
  }

  // 5. 尝试直接用CRM登录看看有什么用户
  console.log('\n--- 尝试CRM登录 ---');
  const loginTest = await request('POST', '/auth/login', {
    username: '13800138001', password: 'Aa123456', tenantId: TIANHUAN_TENANT_ID
  });
  console.log('CRM登录(13800138001):', loginTest.status, JSON.stringify(loginTest.data).substring(0, 200));

  const loginTest2 = await request('POST', '/auth/login', {
    username: 'admin', password: 'Aa123456', tenantId: TIANHUAN_TENANT_ID
  });
  console.log('CRM登录(admin):', loginTest2.status, JSON.stringify(loginTest2.data).substring(0, 200));

  // 尝试不带tenantId(SaaS模式是否强制)
  const loginTest3 = await request('POST', '/auth/login', {
    username: '13800138001', password: 'Aa123456'
  });
  console.log('CRM登录(无tenantId):', loginTest3.status, JSON.stringify(loginTest3.data).substring(0, 200));

  console.log('\n=== 完成 ===');
}

main().catch(e => console.error('Error:', e));

