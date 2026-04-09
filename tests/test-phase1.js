/**
 * 第1阶段测试脚本 - 管理后台基础设置
 * 创建广州天环(租户) + 深圳平安(私有客户)
 *
 * 使用方法: cd backend && node test-phase1.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
const API_PREFIX = '/api/v1';
const results = [];
let adminToken = '';

// ============ HTTP请求工具 ============
function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = urlPath.startsWith('/api/') ? urlPath : API_PREFIX + urlPath;
    const url = new URL(API_BASE + fullPath);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function log(id, name, status, detail) {
  const entry = { id, name, status, detail, time: new Date().toISOString() };
  results.push(entry);
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[SKIP]';
  console.log(`${icon} ${id} - ${name}: ${detail}`);
}

// ============ 测试用例 ============

async function testHealthCheck() {
  try {
    const res = await request('GET', '/health', null, null);
    if (res.status === 200 && res.data.success) {
      log('P-001', '健康检查', 'PASS', 'API服务运行正常');
      return true;
    } else {
      log('P-001', '健康检查', 'FAIL', 'Status: ' + res.status);
      return false;
    }
  } catch (e) {
    log('P-001', '健康检查', 'FAIL', '服务不可达: ' + e.message);
    return false;
  }
}

async function testAdminLogin() {
  try {
    // 开发环境不需要验证码
    const res = await request('POST', '/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    if (res.status === 200 && res.data.success && res.data.data && res.data.data.token) {
      adminToken = res.data.data.token;
      log('A-001', 'Admin登录(admin/admin123)', 'PASS', 'Token获取成功, role=' + res.data.data.admin.role);
      return true;
    }
    // 尝试其他常见密码
    const passwords = ['Admin123', 'Aa123456', 'admin', '123456', 'Admin@123'];
    for (const pwd of passwords) {
      const res2 = await request('POST', '/admin/auth/login', {
        username: 'admin',
        password: pwd
      });
      if (res2.status === 200 && res2.data.success && res2.data.data && res2.data.data.token) {
        adminToken = res2.data.data.token;
        log('A-001', 'Admin登录(admin/' + pwd + ')', 'PASS', 'Token获取成功, role=' + res2.data.data.admin.role);
        return true;
      }
    }
    log('A-001', 'Admin登录', 'FAIL', '所有密码尝试失败: ' + JSON.stringify(res.data));
    return false;
  } catch (e) {
    log('A-001', 'Admin登录', 'FAIL', e.message);
    return false;
  }
}

async function testInvalidToken() {
  try {
    const res = await request('GET', '/admin/auth/profile', null, 'invalid_token_123');
    if (res.status === 401 || res.status === 403) {
      log('A-003', '无效Token验证', 'PASS', '正确返回' + res.status);
    } else {
      log('A-003', '无效Token验证', 'FAIL', '未正确拦截, status=' + res.status);
    }
  } catch (e) {
    log('A-003', '无效Token验证', 'FAIL', e.message);
  }
}

async function testAdminProfile() {
  try {
    const res = await request('GET', '/admin/auth/profile', null, adminToken);
    if (res.status === 200 && res.data.success) {
      log('A-004', '获取Admin信息', 'PASS', 'name=' + res.data.data.name + ', role=' + res.data.data.role);
    } else {
      log('A-004', '获取Admin信息', 'FAIL', JSON.stringify(res.data));
    }
  } catch (e) {
    log('A-004', '获取Admin信息', 'FAIL', e.message);
  }
}

async function testGetPackages() {
  try {
    const res = await request('GET', '/admin/packages', null, adminToken);
    if (res.status === 200 && res.data.success) {
      const count = res.data.data ? (Array.isArray(res.data.data) ? res.data.data.length : (res.data.data.items ? res.data.data.items.length : 0)) : 0;
      log('A-018', '查看套餐列表', 'PASS', '共' + count + '个套餐');
      return res.data.data;
    } else {
      log('A-018', '查看套餐列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
      return null;
    }
  } catch (e) {
    log('A-018', '查看套餐列表', 'FAIL', e.message);
    return null;
  }
}

async function testCreateTenant() {
  try {
    // 先检查是否已存在
    const listRes = await request('GET', '/admin/tenants?keyword=13800138001', null, adminToken);
    if (listRes.status === 200 && listRes.data.success) {
      const items = listRes.data.data && listRes.data.data.items ? listRes.data.data.items : (Array.isArray(listRes.data.data) ? listRes.data.data : []);
      const existing = items.find(t => t.phone === '13800138001' || t.name === '广州天环贸易有限公司');
      if (existing) {
        log('A-006', '创建租户-广州天环', 'PASS', '已存在, id=' + existing.id + ', code=' + existing.code);
        return existing;
      }
    }

    // 创建新租户
    const res = await request('POST', '/admin/tenants', {
      name: '广州天环贸易有限公司',
      contact: '张天环',
      phone: '13800138001',
      email: 'tianhuan@test.com',
      maxUsers: 10,
      maxStorageGb: 5,
      remark: '全流程测试-SaaS租户'
    }, adminToken);

    if (res.status === 200 && res.data.success) {
      const tenant = res.data.data;
      log('A-006', '创建租户-广州天环', 'PASS', 'id=' + tenant.id + ', code=' + (tenant.code || 'N/A'));
      return tenant;
    } else if (res.status === 201 && res.data.success) {
      const tenant = res.data.data;
      log('A-006', '创建租户-广州天环', 'PASS', 'id=' + tenant.id);
      return tenant;
    } else {
      log('A-006', '创建租户-广州天环', 'FAIL', JSON.stringify(res.data).substring(0, 300));
      return null;
    }
  } catch (e) {
    log('A-006', '创建租户-广州天环', 'FAIL', e.message);
    return null;
  }
}

async function testGetTenantList() {
  try {
    const res = await request('GET', '/admin/tenants', null, adminToken);
    if (res.status === 200 && res.data.success) {
      const total = res.data.data && res.data.data.total ? res.data.data.total : (Array.isArray(res.data.data) ? res.data.data.length : 0);
      log('A-007', '查看租户列表', 'PASS', '共' + total + '个租户');
      return res.data.data;
    } else {
      log('A-007', '查看租户列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
      return null;
    }
  } catch (e) {
    log('A-007', '查看租户列表', 'FAIL', e.message);
    return null;
  }
}

async function testCreatePrivateCustomer() {
  try {
    // 先检查是否已存在
    const listRes = await request('GET', '/admin/private-customers', null, adminToken);
    if (listRes.status === 200 && listRes.data.success) {
      const items = listRes.data.data && listRes.data.data.items ? listRes.data.data.items : (Array.isArray(listRes.data.data) ? listRes.data.data : []);
      const existing = items.find(c => c.contactPhone === '13900139001' || c.customerName === '深圳平安科技集团');
      if (existing) {
        log('A-012', '创建私有客户-深圳平安', 'PASS', '已存在, id=' + existing.id);
        return existing;
      }
    }

    // 创建私有客户
    const res = await request('POST', '/admin/private-customers', {
      customerName: '深圳平安科技集团',
      contactPerson: '李平安',
      contactPhone: '13900139001',
      contactEmail: 'pingan@test.com',
      companyAddress: '广东省深圳市福田区平安金融中心',
      industry: '科技/金融',
      companySize: '100-500人',
      deploymentType: 'on-premise',
      licenseType: 'annual',
      maxUsers: 50,
      maxStorageGb: 100,
      features: ['customer', 'order', 'product', 'logistics', 'performance'],
      notes: '全流程测试-私有部署客户'
    }, adminToken);

    if ((res.status === 200 || res.status === 201) && res.data.success) {
      const result = res.data.data;
      // 返回数据可能是 {customer, license} 或直接是customer对象
      const customer = result.customer || result;
      const custId = customer.id || result.id || 'N/A';
      const licKey = (result.license && result.license.license_key) || (result.licenseKey) || 'N/A';
      log('A-012', '创建私有客户-深圳平安', 'PASS', 'id=' + custId + ', licenseKey=' + licKey);
      return { id: custId, license: result.license };
    } else {
      log('A-012', '创建私有客户-深圳平安', 'FAIL', JSON.stringify(res.data).substring(0, 300));
      return null;
    }
  } catch (e) {
    log('A-012', '创建私有客户-深圳平安', 'FAIL', e.message);
    return null;
  }
}

async function testGetPrivateCustomerList() {
  try {
    const res = await request('GET', '/admin/private-customers', null, adminToken);
    if (res.status === 200 && res.data.success) {
      const items = res.data.data && res.data.data.items ? res.data.data.items : (Array.isArray(res.data.data) ? res.data.data : []);
      log('A-013', '查看私有客户列表', 'PASS', '共' + items.length + '个私有客户');
      return items;
    } else {
      log('A-013', '查看私有客户列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
      return null;
    }
  } catch (e) {
    log('A-013', '查看私有客户列表', 'FAIL', e.message);
    return null;
  }
}

async function testGeneratePrivateLicense(customerId) {
  if (!customerId) {
    log('A-015', '生成私有授权', 'SKIP', '无私有客户ID');
    return null;
  }
  try {
    const res = await request('POST', '/admin/private-customers/' + customerId + '/licenses', {
      licenseType: 'annual',
      maxUsers: 50,
      maxStorageGb: 100,
      customerName: '深圳平安科技集团',
      customerContact: '李平安',
      customerPhone: '13900139001',
      customerEmail: 'pingan@test.com',
      notes: '全流程测试授权-年授权'
    }, adminToken);

    if ((res.status === 200 || res.status === 201) && res.data.success) {
      const license = res.data.data;
      const key = license.licenseKey || license.license_key || 'N/A';
      log('A-015', '生成私有授权', 'PASS', 'key=' + key);
      return license;
    } else {
      log('A-015', '生成私有授权', 'FAIL', JSON.stringify(res.data).substring(0, 300));
      return null;
    }
  } catch (e) {
    log('A-015', '生成私有授权', 'FAIL', e.message);
    return null;
  }
}

async function testGetPrivateCustomerLicenses(customerId) {
  if (!customerId) {
    log('A-017', '查看客户授权列表', 'SKIP', '无私有客户ID');
    return;
  }
  try {
    const res = await request('GET', '/admin/private-customers/' + customerId + '/licenses', null, adminToken);
    if (res.status === 200 && res.data.success) {
      const items = Array.isArray(res.data.data) ? res.data.data : (res.data.data && res.data.data.items ? res.data.data.items : []);
      log('A-017', '查看客户授权列表', 'PASS', '共' + items.length + '个授权');
    } else {
      log('A-017', '查看客户授权列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) {
    log('A-017', '查看客户授权列表', 'FAIL', e.message);
  }
}

async function testLicenseStats() {
  try {
    const res = await request('GET', '/admin/licenses/stats', null, adminToken);
    if (res.status === 200 && res.data.success) {
      const d = res.data.data;
      log('A-024', '授权统计', 'PASS', 'total=' + d.total + ', active=' + d.active + ', pending=' + d.pending);
    } else {
      log('A-024', '授权统计', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) {
    log('A-024', '授权统计', 'FAIL', e.message);
  }
}

async function testLicenseList() {
  try {
    const res = await request('GET', '/admin/licenses', null, adminToken);
    if (res.status === 200 && res.data.success) {
      const total = res.data.data && res.data.data.total ? res.data.data.total : 0;
      log('A-025', '授权列表', 'PASS', '共' + total + '条授权记录');
    } else {
      log('A-025', '授权列表', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) {
    log('A-025', '授权列表', 'FAIL', e.message);
  }
}

async function testDashboard() {
  try {
    const res = await request('GET', '/admin/dashboard/stats', null, adminToken);
    if (res.status === 200 && res.data.success) {
      log('A-030', '仪表盘统计', 'PASS', JSON.stringify(res.data.data).substring(0, 200));
    } else {
      log('A-030', '仪表盘统计', 'FAIL', JSON.stringify(res.data).substring(0, 200));
    }
  } catch (e) {
    log('A-030', '仪表盘统计', 'FAIL', e.message);
  }
}

// ============ 主函数 ============
async function main() {
  console.log('='.repeat(60));
  console.log('CRM系统全流程测试 - 第1阶段: 管理后台基础设置');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(60));
  console.log('');

  // 1. 健康检查
  const healthy = await testHealthCheck();
  if (!healthy) {
    console.log('\n[ERROR] 后端服务不可达，请先启动: cd backend && npm run dev');
    console.log('启动命令: cd "D:\\kaifa\\CRM - 1.8.0\\backend" && npm run dev');
    saveResults();
    return;
  }

  // 2. Admin登录
  const loggedIn = await testAdminLogin();
  if (!loggedIn) {
    console.log('\n[ERROR] Admin登录失败，无法继续测试');
    console.log('请检查admin_users表中是否有admin用户');
    saveResults();
    return;
  }

  // 3. 无效Token测试
  await testInvalidToken();

  // 4. Admin信息
  await testAdminProfile();

  // 5. 套餐管理
  await testGetPackages();

  // 6. 创建租户-广州天环
  const tenant = await testCreateTenant();

  // 7. 查看租户列表
  await testGetTenantList();

  // 8. 创建私有客户-深圳平安
  const privateCustomer = await testCreatePrivateCustomer();

  // 9. 查看私有客户列表
  await testGetPrivateCustomerList();

  // 10. 生成私有授权
  const privateCustomerId = privateCustomer ? (privateCustomer.id || null) : null;
  const license = await testGeneratePrivateLicense(privateCustomerId);

  // 11. 查看客户授权列表
  await testGetPrivateCustomerLicenses(privateCustomerId);

  // 12. 授权统计
  await testLicenseStats();

  // 13. 授权列表
  await testLicenseList();

  // 14. 仪表盘
  await testDashboard();

  // 输出汇总
  console.log('\n' + '='.repeat(60));
  console.log('第1阶段测试汇总');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  console.log('通过: ' + passed + '  失败: ' + failed + '  跳过: ' + skipped + '  总计: ' + results.length);

  if (failed > 0) {
    console.log('\n失败用例:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log('  - ' + r.id + ' ' + r.name + ': ' + r.detail);
    });
  }

  if (tenant) {
    console.log('\n广州天环(租户)信息:');
    console.log('  ID: ' + (tenant.id || 'N/A'));
    console.log('  编码: ' + (tenant.code || 'N/A'));
    console.log('  授权码: ' + (tenant.licenseKey || tenant.license_key || 'N/A'));
  }

  if (privateCustomer) {
    console.log('\n深圳平安(私有客户)信息:');
    console.log('  ID: ' + (privateCustomer.id || 'N/A'));
  }

  if (license) {
    console.log('\n深圳平安授权信息:');
    console.log('  授权码: ' + (license.licenseKey || license.license_key || 'N/A'));
    console.log('  类型: ' + (license.licenseType || license.license_type || 'N/A'));
  }

  saveResults();
}

function saveResults() {
  // 保存测试结果
  const resultFile = path.join(__dirname, '..', 'test-phase1-result.json');
  fs.writeFileSync(resultFile, JSON.stringify({ phase: 1, time: new Date().toISOString(), results }, null, 2), 'utf-8');
  console.log('\n测试结果已保存: ' + resultFile);

  // 同时保存可读报告
  const reportFile = path.join(__dirname, '..', 'test-phase1-report.md');
  let md = '# 第1阶段测试报告 - 管理后台基础设置\n\n';
  md += '> 执行时间: ' + new Date().toLocaleString('zh-CN') + '\n\n';

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  md += '## 汇总\n\n';
  md += '| 项目 | 数量 |\n|------|------|\n';
  md += '| 通过 | ' + passed + ' |\n';
  md += '| 失败 | ' + failed + ' |\n';
  md += '| 跳过 | ' + skipped + ' |\n';
  md += '| 总计 | ' + results.length + ' |\n\n';

  md += '## 详细结果\n\n';
  md += '| 编号 | 用例 | 状态 | 详情 |\n';
  md += '|------|------|------|------|\n';
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    md += '| ' + r.id + ' | ' + r.name + ' | ' + icon + ' ' + r.status + ' | ' + r.detail.substring(0, 80) + ' |\n';
  });

  if (failed > 0) {
    md += '\n## 失败分析\n\n';
    results.filter(r => r.status === 'FAIL').forEach(r => {
      md += '### ' + r.id + ' - ' + r.name + '\n';
      md += '- 详情: ' + r.detail + '\n';
      md += '- 建议: 检查对应接口和数据库\n\n';
    });
  }

  fs.writeFileSync(reportFile, md, 'utf-8');
  console.log('测试报告已保存: ' + reportFile);
}

main().catch((e) => {
  console.error('测试执行异常:', e);
  saveResults();
});






