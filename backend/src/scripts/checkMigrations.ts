/**
 * 检查迁移历史记录
 */
import { AppDataSource } from '../config/database';

async function checkMigrations(): Promise<void> {
  await AppDataSource.initialize();

  console.log('\n=== SQL文件迁移记录 ===');
  const sqlMigrations = await AppDataSource.query(
    `SELECT filename, success, execution_time, error_message, executed_at
     FROM migration_history
     WHERE filename LIKE '%.sql'
     ORDER BY executed_at DESC`
  );
  for (const row of sqlMigrations) {
    const status = row.success ? '✅' : '❌';
    const err = row.error_message ? ` | ${row.error_message.substring(0, 80)}` : '';
    console.log(`${status} ${row.filename} (${row.execution_time}ms)${err}`);
  }

  console.log('\n=== 自动迁移运行记录 ===');
  const autoMigrations = await AppDataSource.query(
    `SELECT filename, error_message, executed_at
     FROM migration_history
     WHERE filename LIKE 'auto-migration-%'
     ORDER BY executed_at DESC LIMIT 5`
  );
  for (const row of autoMigrations) {
    console.log(`📊 ${row.filename} | ${row.error_message || 'OK'}`);
  }

  console.log('\n=== 自动迁移明细记录 ===');
  const details = await AppDataSource.query(
    `SELECT filename, error_message
     FROM migration_history
     WHERE filename LIKE 'auto-%' AND filename NOT LIKE 'auto-migration-%'
     ORDER BY executed_at DESC LIMIT 20`
  );
  for (const row of details) {
    console.log(`  ${row.filename} | ${row.error_message || ''}`);
  }

  console.log(`\n总计: ${sqlMigrations.length} 条SQL文件记录, ${autoMigrations.length} 条自动迁移记录, ${details.length} 条明细记录`);

  await AppDataSource.destroy();
  process.exit(0);
}

checkMigrations().catch(e => {
  console.error(e);
  process.exit(1);
});
