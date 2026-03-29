/**
 * 清理硬编码示例分享记录（包含张三、李四、小明的虚假数据）
 * 执行：node backend/scripts/clean-demo-shares.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function cleanDemoShares() {
  let connection;

  try {
    console.log('='.repeat(60));
    console.log('清理硬编码示例分享记录（张三、李四、小明）');
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

    // 1. 查找包含示例用户名的分享成员记录
    console.log('🔍 查找包含示例用户名（张三、李四、小明）的分享成员记录...');
    const [demoMembers] = await connection.query(`
      SELECT psm.id, psm.share_id, psm.user_id, psm.user_name
      FROM performance_share_members psm
      WHERE psm.user_name IN ('张三', '李四', '小明')
         OR psm.user_id IN ('sales1', 'sales2', 'sales3')
    `);

    console.log(`   找到 ${demoMembers.length} 条示例成员记录`);
    if (demoMembers.length > 0) {
      demoMembers.forEach(m => {
        console.log(`   - ID: ${m.id}, 分享ID: ${m.share_id}, 用户: ${m.user_name} (${m.user_id})`);
      });
    }
    console.log();

    // 2. 获取相关的分享记录ID
    const shareIds = [...new Set(demoMembers.map(m => m.share_id))];

    if (shareIds.length > 0) {
      // 查找这些分享记录
      const placeholders = shareIds.map(() => '?').join(',');
      const [demoShares] = await connection.query(
        `SELECT id, share_number, order_number, order_amount, created_at
         FROM performance_shares WHERE id IN (${placeholders})`,
        shareIds
      );

      console.log(`🔍 关联的分享记录 ${demoShares.length} 条:`);
      demoShares.forEach(s => {
        console.log(`   - ID: ${s.id}, 编号: ${s.share_number}, 订单: ${s.order_number}, 金额: ${s.order_amount}`);
      });
      console.log();

      // 3. 也查找通过订单号匹配的硬编码示例订单
      const [demoOrderShares] = await connection.query(`
        SELECT id, share_number, order_number, order_amount
        FROM performance_shares
        WHERE order_number IN ('ORD202401150001', 'ORD202401160002')
           OR order_id IN ('1', '2')
      `);

      if (demoOrderShares.length > 0) {
        console.log(`🔍 通过硬编码订单号找到的分享记录 ${demoOrderShares.length} 条:`);
        demoOrderShares.forEach(s => {
          console.log(`   - ID: ${s.id}, 编号: ${s.share_number}, 订单: ${s.order_number}`);
        });
        console.log();

        // 合并所有需要删除的分享ID
        demoOrderShares.forEach(s => {
          if (!shareIds.includes(s.id)) {
            shareIds.push(s.id);
          }
        });
      }

      // 4. 执行删除
      console.log('🗑️ 开始清理...');

      // 先删除成员记录
      const allPlaceholders = shareIds.map(() => '?').join(',');
      const [memberResult] = await connection.query(
        `DELETE FROM performance_share_members WHERE share_id IN (${allPlaceholders})`,
        shareIds
      );
      console.log(`   删除分享成员记录: ${memberResult.affectedRows} 条`);

      // 再删除分享记录
      const [shareResult] = await connection.query(
        `DELETE FROM performance_shares WHERE id IN (${allPlaceholders})`,
        shareIds
      );
      console.log(`   删除分享记录: ${shareResult.affectedRows} 条`);
    } else {
      console.log('✅ 数据库中没有找到示例分享数据，无需清理');
    }

    console.log();

    // 5. 统计清理后的数据
    const [afterCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_shares'
    );
    const [afterMemberCount] = await connection.query(
      'SELECT COUNT(*) as total FROM performance_share_members'
    );

    console.log('📊 清理后统计:');
    console.log(`   业绩分享记录: ${afterCount[0].total} 条`);
    console.log(`   分享成员记录: ${afterMemberCount[0].total} 条`);
    console.log();
    console.log('✅ 清理完成！');

  } catch (error) {
    console.error('❌ 清理失败:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('ℹ️ 表不存在，无需清理');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

cleanDemoShares();

