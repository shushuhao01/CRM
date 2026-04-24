/**
 * Helper: Find CRM login credentials for testing
 */
const http = require('http');
const API_BASE = 'http://localhost:3000';

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + urlPath);
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json' }, timeout: 10000,
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

async function main() {
  // 1. Admin login
  const adminRes = await request('POST', '/api/v1/admin/auth/login', { username: 'admin', password: 'admin123' });
  const adminToken = adminRes.data.data.token;
  console.log('Admin token obtained');

  // 2. Get tenants
  const tenantsRes = await request('GET', '/api/v1/admin/tenants?page=1&pageSize=5', null, adminToken);
  const tenants = tenantsRes.data.data.list;
  console.log('Tenants:', tenants.map(t => `${t.name}(${t.id})`).join(', '));

  // 3. Try to find users for first tenant
  const tenantId = tenants[0].id;
  console.log('\nTrying tenant:', tenants[0].name, tenantId);

  // Try CRM login with various credentials
  const attempts = [
    { username: 'admin', password: 'admin123' },
    { username: 'admin', password: 'Aa123456' },
    { username: '13800138001', password: 'Aa123456' },
    { username: '15815897364', password: 'Aa123456' },
    { username: '15815897364', password: 'admin123' },
    { username: '海', password: 'Aa123456' },
    { username: '海', password: 'admin123' },
  ];

  for (const attempt of attempts) {
    try {
      const res = await request('POST', '/api/v1/auth/login', { ...attempt, tenantId });
      const d = res.data;
      const token = d.token || d.data?.token || d.data?.tokens?.accessToken;
      console.log(`  ${attempt.username}/${attempt.password}: status=${res.status}, success=${d.success}, token=${token ? 'YES(' + token.length + ')' : 'NO'}, msg=${d.message || ''}`);
      if (token) {
        console.log('\n🎉 Found CRM credentials!', JSON.stringify(attempt));
        console.log('Token:', token.substring(0, 50) + '...');

        // Verify token works for SMS API
        const smsRes = await request('GET', '/api/v1/sms/quota', null, token);
        console.log('SMS quota API:', smsRes.status, JSON.stringify(smsRes.data).substring(0, 200));
        return;
      }
    } catch (e) {
      console.log(`  ${attempt.username}/${attempt.password}: ERROR ${e.message}`);
    }
  }

  // 4. Also try to get tenant detail for admin account info
  const detailRes = await request('GET', `/api/v1/admin/tenants/${tenantId}`, null, adminToken);
  console.log('\nTenant detail:', JSON.stringify(detailRes.data.data).substring(0, 500));

  // 5. Try to create a test user for CRM
  console.log('\nTrying to list users via admin...');
  // Check if there's a user management API
  try {
    const usersRes = await request('GET', `/api/v1/admin/tenant-users?tenantId=${tenantId}&page=1&pageSize=5`, null, adminToken);
    console.log('Tenant users:', JSON.stringify(usersRes.data).substring(0, 500));
  } catch (e) {
    console.log('Tenant users API error:', e.message);
  }

  // Also try the tenant-license flow
  console.log('\nTrying tenant-license verify...');
  const licenseKey = tenants[0].license_key;
  console.log('License key:', licenseKey);
  const verifyRes = await request('POST', '/api/v1/tenant-license/verify', { licenseKey });
  console.log('License verify:', verifyRes.status, JSON.stringify(verifyRes.data).substring(0, 300));

  // If verify succeeds, get activation code
  if (verifyRes.data.success && verifyRes.data.data?.code) {
    const code = verifyRes.data.data.code;
    console.log('Code:', code);
    const activateRes = await request('POST', '/api/v1/tenant-license/activate', { code });
    console.log('Activate:', activateRes.status, JSON.stringify(activateRes.data).substring(0, 300));
  }
}

main().catch(console.error);

