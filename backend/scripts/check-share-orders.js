/**
 * 检查业绩分享记录对应的订单是否存在
 * 执行：node backend/scripts/check-share-orders.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function checkShareOrders() {
  let connection;

  try {
    console.log('='.repeat(60));
    console.log('检查业绩分享记录对应的订单');
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

    // 1. 查看业绩分享记录总数
    const [shareCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_shares'
    );
    console.log(`📊 业绩分享记录总数: ${shareCount[0].total} 条`);
    console.log();

    // 2. 查看前20条分享记录
    console.log('📋 前20条业绩分享记录:');
    console.log('-'.repeat(60));
    const [shares] = await connection.query(`
      SELECT
        id,
        share_number,
        order_id,
        order_number,
        order_amount,
        status,
        created_at
      FROM performance_shares
      ORDER BY created_at DESC
      LIMIT 20
    `);

    let existCount = 0;
    let notExistCount = 0;

    for (const share of shares) {
      // 检查订单是否存在
      const [orderCheck] = await connection.query(
        'SELECT id, order_number, total_amount, status FROM orders WHERE id = ? OR order_number = ?',
        [share.order_id, share.order_number]
      );

      const orderExists = orderCheck.length > 0;

      if (orderExists) {
        existCount++;
        const order = orderCheck[0];
        console.log(`✅ ${share.share_number}`);
        console.log(`   订单号: ${share.order_number}`);
        console.log(`   订单ID: ${share.order_id}`);
        console.log(`   分享金额: ¥${share.order_amount}`);
        console.log(`   订单状态: ${order.status}`);
        console.log(`   订单金额: ¥${order.total_amount}`);

        // 检查金额是否一致
        if (parseFloat(share.order_amount) !== parseFloat(order.total_amount)) {
          console.log(`   ⚠️  金额不一致！分享记录: ¥${share.order_amount}, 订单: ¥${order.total_amount}`);
        }
      } else {
        notExistCount++;
        console.log(`❌ ${share.share_number}`);
        console.log(`   订单号: ${share.order_number}`);
        console.log(`   订单ID: ${share.order_id}`);
        console.log(`   ⚠️  订单不存在！`);
      }
      console.log();
    }

    // 3. 统计
    console.log('='.repeat(60));
    console.log('📊 统计结果');
    console.log('='.repeat(60));
    console.log(`✅ 订单存在: ${existCount} 条`);
    console.log(`❌ 订单不存在: ${notExistCount} 条`);
    console.log();

    // 4. 检查分享成员
    console.log('👥 检查分享成员数据...');
    const [memberCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_share_members'
    );
    console.log(`   总成员数: ${memberCount[0].total}`);

    // 检查是否有孤立成员（分享记录不存在）
    const [orphanMembers] = await connection.query(`
      SELECT COUNT(*) as count
      FROM performance_share_members psm
      LEFT JOIN performance_shares ps ON psm.share_id = ps.id
      WHERE ps.id IS NULL
    `);

    if (orphanMembers[0].count > 0) {
      console.log(`   ⚠️  孤立成员（分享记录不存在）: ${orphanMembers[0].count} 条`);
    } else {
      console.log(`   ✅ 没有孤立成员`);
    }
    console.log();

    // 5. 建议
    console.log('='.repeat(60));
    console.log('💡 建议');
    console.log('='.repeat(60));

    if (notExistCount > 0) {
      console.log('⚠️  发现有分享记录对应的订单不存在');
      console.log();
      console.log('可能的原因：');
      console.log('1. 订单被删除了');
      console.log('2. 订单ID不匹配');
      console.log('3. 测试数据');
      console.log();
      console.log('建议操作：');
      console.log('1. 清理这些无效的分享记录');
      console.log('2. 或者创建对应的订单数据');
    } else {
      console.log('✅ 所有分享记录对应的订单都存在');
      console.log('   数据完整性良好');
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ 检查失败:', error.message);
    console.error('   错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkShareOrders();
