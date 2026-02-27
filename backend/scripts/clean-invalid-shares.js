/**
 * 清理无效的业绩分享记录（订单不存在的）
 * 执行：node backend/scripts/clean-invalid-shares.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function cleanInvalidShares() {
  let connection;

  try {
    console.log('='.repeat(60));
    console.log('清理无效的业绩分享记录');
    console.log('='.repeat(60));
    console.log();

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm_local'
    };

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    console.log();

    // 1. 统计当前数据
    const [beforeCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_shares'
    );
    const [beforeMemberCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_share_members'
    );

    console.log('📊 清理前统计:');
    console.log(`   业绩分享记录: ${beforeCount[0].total} 条`);
    console.log(`   分享成员记录: ${beforeMemberCount[0].total} 条`);
    console.log();

    // 2. 查找所有无效的分享记录（订单不存在）
    console.log('🔍 查找无效记录...');
    const [invalidShares] = await connection.query(`
      SELECT ps.id, ps.share_number, ps.order_id, ps.order_number
      FROM performance_shares ps
      LEFT JOIN orders o ON ps.order_id = o.id OR ps.order_number = o.order_number
      WHERE o.id IS NULL
    `);

    console.log(`   发现 ${invalidShares.length} 条无效记录`);
    console.log();

    if (invalidShares.length === 0) {
      console.log('✅ 没有需要清理的记录');
      return;
    }

    // 3. 显示前10条将要删除的记录
    console.log('📋 将要删除的记录（前10条）:');
    console.log('-'.repeat(60));
    invalidShares.slice(0, 10).forEach((share, index) => {
      console.log(`${index + 1}. ${share.share_number}`);
      console.log(`   订单号: ${share.order_number}`);
      console.log(`   订单ID: ${share.order_id}`);
    });
    if (invalidShares.length > 10) {
      console.log(`   ... 还有 ${invalidShares.length - 10} 条`);
    }
    console.log();

    // 4. 开始清理
    console.log('🗑️  开始清理...');

    // 获取所有无效分享记录的ID
    const invalidShareIds = invalidShares.map(s => s.id);

    // 删除分享成员（由于外键约束，会自动级联删除，但为了安全起见手动删除）
    if (invalidShareIds.length > 0) {
      const placeholders = invalidShareIds.map(() => '?').join(',');

      // 先删除成员
      const [memberResult] = await connection.query(
        `DELETE FROM performance_share_members WHERE share_id IN (${placeholders})`,
        invalidShareIds
      );
      console.log(`   ✅ 删除了 ${memberResult.affectedRows} 条分享成员记录`);

      // 再删除分享记录
      const [shareResult] = await connection.query(
        `DELETE FROM performance_shares WHERE id IN (${placeholders})`,
        invalidShareIds
      );
      console.log(`   ✅ 删除了 ${shareResult.affectedRows} 条分享记录`);
    }
    console.log();

    // 5. 统计清理后的数据
    const [afterCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_shares'
    );
    const [afterMemberCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_share_members'
    );

    console.log('='.repeat(60));
    console.log('📊 清理结果');
    console.log('='.repeat(60));
    console.log('清理前:');
    console.log(`   业绩分享记录: ${beforeCount[0].total} 条`);
    console.log(`   分享成员记录: ${beforeMemberCount[0].total} 条`);
    console.log();
    console.log('清理后:');
    console.log(`   业绩分享记录: ${afterCount[0].total} 条`);
    console.log(`   分享成员记录: ${afterMemberCount[0].total} 条`);
    console.log();
    console.log('删除数量:');
    console.log(`   业绩分享记录: ${beforeCount[0].total - afterCount[0].total} 条`);
    console.log(`   分享成员记录: ${beforeMemberCount[0].total - afterMemberCount[0].total} 条`);
    console.log();
    console.log('✅ 清理完成！');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ 清理失败:', error.message);
    console.error('   错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

cleanInvalidShares();
