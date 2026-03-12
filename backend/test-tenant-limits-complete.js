/**
 * 租户套餐限制功能完整测试
 *
 * 测试内容：
 * 1. 过期时间检查
 * 2. 用户数限制检查
 * 3. 存储空间限制检查
 * 4. 用户创建后自动更新统计
 * 5. 文件上传后自动更新统计
 */

const mysql = require('mysql2/promise');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local'
};

// API配置
const API_BASE = 'http://localhost:3000/api/v1';

// 测试结果
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

async function testExpireCheck() {
  log('\n=== 测试1: 过期时间检查 ===', 'info');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 创建测试租户（已过期）
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // 昨天过期

    await connection.execute(`
      INSERT INTO tenants (id, code, name, status, license_status, expire_date, max_users, max_storage_gb)
      VALUES ('test_expired', 'TEST_EXP', '过期租户', 'active', 'active', ?, 10, 10)
      ON DUPLICATE KEY UPDATE expire_date = ?
    `, [expiredDate, expiredDate]);

    // 创建测试用户
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123', 12);

    await connection.execute(`
      INSERT INTO users (id, username, password, name, real_name, role, role_id, tenant_id, status)
      VALUES ('test_user_expired', 'testexpired', ?, 'Test User', 'Test User', 'admin', 'admin', 'test_expired', 'active')
      ON DUPLICATE KEY UPDATE tenant_id = 'test_expired'
    `, [hashedPassword]);

    // 尝试登录
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        username: 'testexpired',
        password: 'test123'
      });

      const token = loginRes.data.data.token;

      // 尝试访问API（应该被拒绝）
      try {
        await axios.get(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        results.failed.push('过期检查失败：过期租户仍可访问API');
        log('❌ 过期检查失败：过期租户仍可访问API', 'error');
      } catch (error) {
        if (error.response?.status === 403 && error.response?.data?.message?.includes('过期')) {
          results.passed.push('过期检查通过：过期租户被正确拒绝');
          log('✅ 过期检查通过：过期租户被正确拒绝', 'success');
        } else {
          results.failed.push(`过期检查失败：错误响应 ${error.response?.status}`);
          log(`❌ 过期检查失败：错误响应 ${error.response?.status}`, 'error');
        }
      }
    } catch (error) {
      results.failed.push(`登录失败: ${error.message}`);
      log(`❌ 登录失败: ${error.message}`, 'error');
    }

  } finally {
    await connection.end();
  }
}

async function testUserLimit() {
  log('\n=== 测试2: 用户数限制检查 ===', 'info');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 创建测试租户（最多2个用户）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    await connection.execute(`
      INSERT INTO tenants (id, code, name, status, license_status, expire_date, max_users, max_storage_gb, user_count)
      VALUES ('test_limit', 'TEST_LIM', '限制租户', 'active', 'active', ?, 2, 10, 0)
      ON DUPLICATE KEY UPDATE max_users = 2, user_count = 0, expire_date = ?
    `, [futureDate, futureDate]);

    // 创建管理员用户
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123', 12);

    await connection.execute(`
      INSERT INTO users (id, username, password, name, real_name, role, role_id, tenant_id, status)
      VALUES ('test_admin_limit', 'testadmin', ?, 'Admin User', 'Admin User', 'admin', 'admin', 'test_limit', 'active')
      ON DUPLICATE KEY UPDATE tenant_id = 'test_limit'
    `, [hashedPassword]);

    // 登录
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'testadmin',
      password: 'test123'
    });

    const token = loginRes.data.data.token;

    // 创建第1个用户（应该成功）
    try {
      await axios.post(`${API_BASE}/users`, {
        username: 'testuser1',
        password: 'test123',
        realName: 'Test User 1',
        role: 'sales'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      results.passed.push('用户限制检查：第1个用户创建成功');
      log('✅ 第1个用户创建成功', 'success');

      // 检查统计是否更新
      const [rows] = await connection.execute(
        'SELECT user_count FROM tenants WHERE id = ?',
        ['test_limit']
      );

      if (rows[0].user_count === 1) {
        results.passed.push('用户统计更新：user_count正确更新为1');
        log('✅ 用户统计正确更新为1', 'success');
      } else {
        results.failed.push(`用户统计更新失败：期望1，实际${rows[0].user_count}`);
        log(`❌ 用户统计更新失败：期望1，实际${rows[0].user_count}`, 'error');
      }

    } catch (error) {
      results.failed.push(`第1个用户创建失败: ${error.response?.data?.message || error.message}`);
      log(`❌ 第1个用户创建失败: ${error.response?.data?.message || error.message}`, 'error');
    }

    // 创建第2个用户（应该被拒绝，因为已经有admin + user1 = 2个用户）
    try {
      await axios.post(`${API_BASE}/users`, {
        username: 'testuser2',
        password: 'test123',
        realName: 'Test User 2',
        role: 'sales'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      results.failed.push('用户限制检查失败：超过限制仍可创建用户');
      log('❌ 用户限制检查失败：超过限制仍可创建用户', 'error');

    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message?.includes('上限')) {
        results.passed.push('用户限制检查通过：超限创建被正确拒绝');
        log('✅ 用户限制检查通过：超限创建被正确拒绝', 'success');
      } else {
        results.failed.push(`用户限制检查失败：错误响应 ${error.response?.status}`);
        log(`❌ 用户限制检查失败：错误响应 ${error.response?.status}`, 'error');
      }
    }

  } finally {
    await connection.end();
  }
}

async function testStorageLimit() {
  log('\n=== 测试3: 存储空间限制检查 ===', 'info');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 创建测试租户（最多1MB存储）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    await connection.execute(`
      INSERT INTO tenants (id, code, name, status, license_status, expire_date, max_users, max_storage_gb, used_storage_mb)
      VALUES ('test_storage', 'TEST_STO', '存储租户', 'active', 'active', ?, 10, 0.001, 0)
      ON DUPLICATE KEY UPDATE max_storage_gb = 0.001, used_storage_mb = 0, expire_date = ?
    `, [futureDate, futureDate]);

    // 创建管理员用户
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123', 12);

    await connection.execute(`
      INSERT INTO users (id, username, password, name, real_name, role, role_id, tenant_id, status)
      VALUES ('test_admin_storage', 'teststorage', ?, 'Storage Admin', 'Storage Admin', 'admin', 'admin', 'test_storage', 'active')
      ON DUPLICATE KEY UPDATE tenant_id = 'test_storage'
    `, [hashedPassword]);

    // 登录
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'teststorage',
      password: 'test123'
    });

    const token = loginRes.data.data.token;

    // 创建一个小文件（0.5KB）
    const smallFile = Buffer.alloc(512, 'a');
    const smallFilePath = path.join(__dirname, 'test-small.txt');
    fs.writeFileSync(smallFilePath, smallFile);

    // 上传小文件（应该成功）
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(smallFilePath));

      await axios.post(`${API_BASE}/system/upload-avatar`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      });

      results.passed.push('存储限制检查：小文件上传成功');
      log('✅ 小文件上传成功', 'success');

      // 检查统计是否更新
      const [rows] = await connection.execute(
        'SELECT used_storage_mb FROM tenants WHERE id = ?',
        ['test_storage']
      );

      if (rows[0].used_storage_mb > 0) {
        results.passed.push(`存储统计更新：used_storage_mb正确更新为${rows[0].used_storage_mb.toFixed(4)}MB`);
        log(`✅ 存储统计正确更新为${rows[0].used_storage_mb.toFixed(4)}MB`, 'success');
      } else {
        results.failed.push('存储统计更新失败：used_storage_mb仍为0');
        log('❌ 存储统计更新失败：used_storage_mb仍为0', 'error');
      }

    } catch (error) {
      results.failed.push(`小文件上传失败: ${error.response?.data?.message || error.message}`);
      log(`❌ 小文件上传失败: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      fs.unlinkSync(smallFilePath);
    }

    // 创建一个大文件（2MB，超过限制）
    const largeFile = Buffer.alloc(2 * 1024 * 1024, 'b');
    const largeFilePath = path.join(__dirname, 'test-large.txt');
    fs.writeFileSync(largeFilePath, largeFile);

    // 上传大文件（应该被拒绝）
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(largeFilePath));

      await axios.post(`${API_BASE}/system/upload-avatar`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      });

      results.failed.push('存储限制检查失败：超过限制仍可上传文件');
      log('❌ 存储限制检查失败：超过限制仍可上传文件', 'error');

    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message?.includes('存储')) {
        results.passed.push('存储限制检查通过：超限上传被正确拒绝');
        log('✅ 存储限制检查通过：超限上传被正确拒绝', 'success');
      } else {
        results.failed.push(`存储限制检查失败：错误响应 ${error.response?.status}`);
        log(`❌ 存储限制检查失败：错误响应 ${error.response?.status}`, 'error');
      }
    } finally {
      fs.unlinkSync(largeFilePath);
    }

  } finally {
    await connection.end();
  }
}

async function cleanup() {
  log('\n=== 清理测试数据 ===', 'info');

  const connection = await mysql.createConnection(dbConfig);

  try {
    await connection.execute('DELETE FROM users WHERE username IN (?, ?, ?, ?)',
      ['testexpired', 'testadmin', 'testuser1', 'teststorage']);
    await connection.execute('DELETE FROM tenants WHERE id IN (?, ?, ?)',
      ['test_expired', 'test_limit', 'test_storage']);

    log('✅ 测试数据清理完成', 'success');
  } finally {
    await connection.end();
  }
}

async function printSummary() {
  log('\n' + '='.repeat(60), 'info');
  log('测试总结', 'info');
  log('='.repeat(60), 'info');

  log(`\n✅ 通过: ${results.passed.length}`, 'success');
  results.passed.forEach(msg => log(`  - ${msg}`, 'success'));

  if (results.warnings.length > 0) {
    log(`\n⚠️  警告: ${results.warnings.length}`, 'warning');
    results.warnings.forEach(msg => log(`  - ${msg}`, 'warning'));
  }

  if (results.failed.length > 0) {
    log(`\n❌ 失败: ${results.failed.length}`, 'error');
    results.failed.forEach(msg => log(`  - ${msg}`, 'error'));
  }

  log('\n' + '='.repeat(60), 'info');

  const total = results.passed.length + results.failed.length;
  const passRate = ((results.passed.length / total) * 100).toFixed(1);

  if (results.failed.length === 0) {
    log(`🎉 所有测试通过！(${results.passed.length}/${total}, ${passRate}%)`, 'success');
  } else {
    log(`⚠️  部分测试失败 (${results.passed.length}/${total}, ${passRate}%)`, 'warning');
  }
}

async function main() {
  log('租户套餐限制功能完整测试', 'info');
  log('='.repeat(60), 'info');

  try {
    await testExpireCheck();
    await testUserLimit();
    await testStorageLimit();
  } catch (error) {
    log(`\n测试执行出错: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await cleanup();
    await printSummary();
  }
}

main();
