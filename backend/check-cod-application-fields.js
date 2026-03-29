const { AppDataSource } = require('./dist/config/database');

async function checkFields() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();

    // 查询表结构
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cod_cancel_applications'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 cod_cancel_applications 表字段列表:');
    console.log('='.repeat(100));
    columns.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(25)} | ${col.COLUMN_TYPE.padEnd(20)} | ${col.IS_NULLABLE.padEnd(5)} | ${col.COLUMN_COMMENT || ''}`);
    });
    console.log('='.repeat(100));

    // 检查是否存在 reviewed_at 和 reviewer_name 字段
    const hasReviewedAt = columns.some(col => col.COLUMN_NAME === 'reviewed_at');
    const hasReviewerName = columns.some(col => col.COLUMN_NAME === 'reviewer_name');

    console.log('\n🔍 字段检查结果:');
    console.log(`reviewed_at: ${hasReviewedAt ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`reviewer_name: ${hasReviewerName ? '✅ 存在' : '❌ 不存在'}`);

    await queryRunner.release();
    await AppDataSource.destroy();

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkFields();
