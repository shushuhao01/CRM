/**
 * 执行私有部署数据隔离唯一约束修复
 * 为 users 和 roles 表添加租户级复合唯一索引
 * 日期: 2026-04-04
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'localhost',
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local',
  multipleStatements: true
};

async function executeMigration() {
  let connection;

  try {
    console.log('='.repeat(60));
    console.log('私有部署数据隔离 - 唯一约束修复');
    console.log('数据库:', config.database);
    console.log('='.repeat(60));

    console.log('\n🔌 连接数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // ========== 第1步：检查冲突数据 ==========
    console.log('📋 第1步：检查是否有冲突数据...\n');

    const [userDups] = await connection.query(
      `SELECT tenant_id, username, COUNT(*) as cnt FROM users GROUP BY tenant_id, username HAVING COUNT(*) > 1`
    );
    if (userDups.length > 0) {
      console.log('⚠️  发现 users 表重复数据:');
      console.table(userDups);
      console.log('   请先处理重复数据后再执行迁移！\n');
    } else {
      console.log('  ✓ users 表无 (tenant_id, username) 冲突数据');
    }

    const [roleDups] = await connection.query(
      `SELECT tenant_id, code, COUNT(*) as cnt FROM roles GROUP BY tenant_id, code HAVING COUNT(*) > 1`
    );
    if (roleDups.length > 0) {
      console.log('⚠️  发现 roles 表重复数据:');
      console.table(roleDups);
      console.log('   请先处理重复数据后再执行迁移！\n');
    } else {
      console.log('  ✓ roles 表无 (tenant_id, code) 冲突数据');
    }

    if (userDups.length > 0 || roleDups.length > 0) {
      console.log('\n⚠️  检测到冲突数据，继续执行可能会失败（索引创建已做幂等检查，会跳过已存在索引）...');
    }

    // ========== 第2步：users 表添加复合唯一索引 ==========
    console.log('\n📋 第2步：users 表添加 (tenant_id, username) 复合唯一索引...');

    const [userIndexCheck] = await connection.query(
      `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uk_tenant_username'`
    );

    if (userIndexCheck[0].cnt > 0) {
      console.log('  ⏭️  uk_tenant_username 索引已存在，跳过');
    } else {
      try {
        await connection.query('ALTER TABLE users ADD UNIQUE INDEX uk_tenant_username (tenant_id, username)');
        console.log('  ✅ uk_tenant_username 索引创建成功');
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log('  ❌ 创建失败：存在重复的 (tenant_id, username) 数据，请先清理');
        } else {
          throw err;
        }
      }
    }

    // ========== 第3步：roles 表修改唯一约束为租户级 ==========
    console.log('\n📋 第3步：roles 表修改 code 唯一约束为租户级...');

    // 检查并删除旧的全局 code 唯一索引
    const [oldRoleIndex] = await connection.query(
      `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND INDEX_NAME = 'code' AND NON_UNIQUE = 0`
    );

    if (oldRoleIndex[0].cnt > 0) {
      await connection.query('ALTER TABLE roles DROP INDEX `code`');
      console.log('  ✅ 已删除旧的全局 code 唯一索引');
    } else {
      console.log('  ⏭️  旧的全局 code 唯一索引不存在，跳过删除');
    }

    // 添加新的租户级复合唯一索引
    const [newRoleIndex] = await connection.query(
      `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND INDEX_NAME = 'uk_tenant_role_code'`
    );

    if (newRoleIndex[0].cnt > 0) {
      console.log('  ⏭️  uk_tenant_role_code 索引已存在，跳过');
    } else {
      try {
        await connection.query('ALTER TABLE roles ADD UNIQUE INDEX uk_tenant_role_code (tenant_id, code)');
        console.log('  ✅ uk_tenant_role_code 索引创建成功');
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log('  ❌ 创建失败：存在重复的 (tenant_id, code) 数据，请先清理');
        } else {
          throw err;
        }
      }
    }

    // ========== 第4步：验证结果 ==========
    console.log('\n📋 第4步：验证索引创建结果...\n');

    const [usersIndexes] = await connection.query(
      `SHOW INDEX FROM users WHERE Key_name = 'uk_tenant_username'`
    );
    if (usersIndexes.length > 0) {
      console.log('  ✅ users.uk_tenant_username 索引已就绪');
      usersIndexes.forEach(idx => {
        console.log(`     - 列: ${idx.Column_name}, 唯一: ${idx.Non_unique === 0 ? '是' : '否'}`);
      });
    } else {
      console.log('  ❌ users.uk_tenant_username 索引不存在');
    }

    const [rolesIndexes] = await connection.query(
      `SHOW INDEX FROM roles WHERE Key_name = 'uk_tenant_role_code'`
    );
    if (rolesIndexes.length > 0) {
      console.log('  ✅ roles.uk_tenant_role_code 索引已就绪');
      rolesIndexes.forEach(idx => {
        console.log(`     - 列: ${idx.Column_name}, 唯一: ${idx.Non_unique === 0 ? '是' : '否'}`);
      });
    } else {
      console.log('  ❌ roles.uk_tenant_role_code 索引不存在');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 数据隔离唯一约束修复完成！');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

executeMigration();

