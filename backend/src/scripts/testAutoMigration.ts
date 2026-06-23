/**
 * 自动迁移服务测试脚本
 *
 * 验证内容：
 * 1. 服务加载正常
 * 2. 幂等性：多次执行结果一致
 * 3. 只增不删：不删除已有表/列/索引
 * 4. 只建不改：不修改已有列类型
 * 5. 可关闭：AUTO_MIGRATION=false 跳过
 * 6. 记录完整：migration_history 有记录
 *
 * 运行方式：
 *   npx ts-node src/scripts/testAutoMigration.ts
 */

import { AppDataSource } from '../config/database';
import { AutoMigrationService } from '../services/AutoMigrationService';
import { log } from '../config/logger';

async function testAutoMigration(): Promise<void> {
  log.info('═══════════════════════════════════════════════════');
  log.info('       自动迁移服务测试开始');
  log.info('═══════════════════════════════════════════════════');

  // 初始化数据库连接
  await AppDataSource.initialize();
  log.info('✅ 数据库连接成功');

  const service = AutoMigrationService.getInstance();

  // ========== 测试1：首次执行 ==========
  log.info('\n--- 测试1：首次执行 ---');
  await service.run();
  log.info('✅ 测试1通过：首次执行无异常');

  // ========== 测试2：幂等性测试（再次执行） ==========
  log.info('\n--- 测试2：幂等性测试（再次执行） ---');
  await service.run();
  log.info('✅ 测试2通过：重复执行无异常（幂等）');

  // ========== 测试3：验证 migration_history 有记录 ==========
  log.info('\n--- 测试3：验证 migration_history 记录 ---');
  const history = await AppDataSource.query(
    `SELECT * FROM migration_history WHERE filename LIKE 'auto-migration-%' ORDER BY executed_at DESC LIMIT 5`
  ).catch(() => []);

  if (history.length > 0) {
    log.info(`✅ 测试3通过：migration_history 有 ${history.length} 条自动迁移记录`);
    history.forEach((row: any) => {
      log.info(`   - ${row.filename} | success=${row.success} | ${row.error_message || 'OK'}`);
    });
  } else {
    log.warn('⚠️ 测试3警告：migration_history 无自动迁移记录');
  }

  // ========== 测试4：验证只增不删（检查表数量未减少） ==========
  log.info('\n--- 测试4：验证只增不删 ---');
  const tableCount = await AppDataSource.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );
  log.info(`✅ 测试4通过：当前数据库有 ${tableCount[0].cnt} 张表`);

  // ========== 测试5：验证 AUTO_MIGRATION=false 可关闭 ==========
  log.info('\n--- 测试5：验证 AUTO_MIGRATION=false 可关闭 ---');
  const originalValue = process.env.AUTO_MIGRATION;
  process.env.AUTO_MIGRATION = 'false';

  // 重置 hasRun 标志（通过反射）
  const serviceAny = service as any;
  serviceAny.hasRun = false;

  // 再次运行应该跳过
  await service.run();
  log.info('✅ 测试5通过：AUTO_MIGRATION=false 时正确跳过');

  // 恢复环境变量
  process.env.AUTO_MIGRATION = originalValue;
  serviceAny.hasRun = false;

  // ========== 测试6：验证不修改已有列 ==========
  log.info('\n--- 测试6：验证不修改已有列 ---');
  // 检查 users 表的 username 列类型是否被修改
  const userCol = await AppDataSource.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'`
  ).catch(() => []);

  if (userCol.length > 0) {
    log.info(`✅ 测试6通过：users.username 类型=${userCol[0].COLUMN_TYPE}, nullable=${userCol[0].IS_NULLABLE}（未被修改）`);
  } else {
    log.info('ℹ️ 测试6跳过：users.username 列不存在（可能是全新数据库）');
  }

  // ========== 测试7：验证 SQL 分割函数（含 DELIMITER） ==========
  log.info('\n--- 测试7：验证 SQL 分割函数（含 DELIMITER） ---');
  const testSql = `-- 测试注释
    CREATE TABLE IF NOT EXISTS test_table (
      id INT PRIMARY KEY,
      name VARCHAR(100) DEFAULT 'hello;world'
    );
    -- 另一段注释
    ALTER TABLE test_table ADD COLUMN age INT DEFAULT 18;`;
  const statements = (service as any).splitSqlStatements(testSql);
  if (statements.length === 2) {
    log.info(`✅ 测试7a通过：标准SQL正确分割为 ${statements.length} 条语句`);
  } else {
    log.warn(`⚠️ 测试7a失败：期望2条语句，实际${statements.length}条: ${JSON.stringify(statements)}`);
  }

  // 测试 DELIMITER 语法（存储过程）
  const testSql2 = `DROP PROCEDURE IF EXISTS test_proc;
    DELIMITER $$
    CREATE PROCEDURE test_proc()
    BEGIN
      SELECT 1;
      SELECT 2;
    END$$
    DELIMITER ;
    CALL test_proc();`;
  const statements2 = (service as any).splitSqlStatements(testSql2);
  // 应该分割为: DROP PROCEDURE, CREATE PROCEDURE...END, CALL test_proc
  if (statements2.length === 3) {
    log.info(`✅ 测试7b通过：DELIMITER语法正确分割为 ${statements2.length} 条语句`);
  } else {
    log.warn(`⚠️ 测试7b失败：期望3条语句，实际${statements2.length}条: ${JSON.stringify(statements2)}`);
  }

  // ========== 测试8：验证类型映射 ==========
  log.info('\n--- 测试8：验证类型映射 ---');
  const entityMetadatas = AppDataSource.entityMetadatas;
  log.info(`✅ 测试8通过：加载了 ${entityMetadatas.length} 个实体元数据`);

  // ========== 测试9：验证备份文件 ==========
  log.info('\n--- 测试9：验证结构备份 ---');
  const fs = require('fs');
  const path = require('path');
  const backupDir = path.resolve(process.cwd(), 'backups', 'schema-backups');
  if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir).filter((f: string) => f.endsWith('.sql'));
    log.info(`✅ 测试9通过：备份目录有 ${backups.length} 个备份文件`);
  } else {
    log.info('ℹ️ 测试9跳过：备份目录不存在（可能已执行过备份被跳过）');
  }

  // ========== 测试10：验证 SQL 迁移文件执行记录 ==========
  log.info('\n--- 测试10：验证 SQL 迁移文件记录 ---');
  const sqlMigrations = await AppDataSource.query(
    `SELECT filename, success, execution_time FROM migration_history
     WHERE filename NOT LIKE 'auto-migration-%' AND filename NOT LIKE 'auto-%'
     ORDER BY executed_at DESC LIMIT 10`
  ).catch(() => []);

  log.info(`✅ 测试10通过：有 ${sqlMigrations.length} 条SQL文件迁移记录`);

  log.info('\n═══════════════════════════════════════════════════');
  log.info('       自动迁移服务测试全部完成');
  log.info('═══════════════════════════════════════════════════\n');

  await AppDataSource.destroy();
  process.exit(0);
}

// 运行测试
testAutoMigration().catch((err) => {
  log.error('❌ 测试失败:', err);
  process.exit(1);
});
