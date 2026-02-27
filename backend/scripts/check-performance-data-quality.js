/**
 * 检查业绩分享数据质量
 * 执行：node backend/scripts/check-performance-data-quality.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function checkDataQuality() {
  let connection;

  try {
    console.log('='.repeat(60));
    console.log('检查业绩分享数据质量');
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

    // 1. 检查孤立的分享记录（没有成员）
    console.log('🔍 检查孤立的分享记录（没有成员）...');
    const [orphanShares] = await connection.query(`
      SELECT ps.id, ps.share_number, ps.order_number, ps.created_at
      FROM performance_shares ps
      LEFT JOIN performance_share_members psm ON ps.id = psm.share_id
      WHERE psm.id IS NULL
      LIMIT 5
    `);

    if (orphanShares.length > 0) {
      console.log(`   ⚠️  发现 ${orphanShares.length} 条孤立记录（前5条）:`);
      orphanShares.forEach(share => {
        console.log(`      - ${share.share_number} (${share.order_number})`);
      });
    } else {
      console.log('   ✅ 没有孤立记录');
    }
    console.log();

    // 2. 检查 NULL 值
    console.log('🔍 检查关键字段的 NULL 值...');
    const [nullChecks] = await connection.query(`
      SELECT
        SUM(CASE WHEN order_id IS NULL THEN 1 ELSE 0 END) as null_order_id,
        SUM(CASE WHEN order_number IS NULL THEN 1 ELSE 0 END) as null_order_number,
        SUM(CASE WHEN order_amount IS NULL THEN 1 ELSE 0 END) as null_order_amount,
        SUM(CASE WHEN created_by IS NULL THEN 1 ELSE 0 END) as null_created_by
      FROM performance_shares
    `);

    const nullCheck = nullChecks[0];
    let hasNulls = false;

    if (nullCheck.null_order_id > 0) {
      console.log(`   ⚠️  order_id 为 NULL: ${nullCheck.null_order_id} 条`);
      hasNulls = true;
    }
    if (nullCheck.null_order_number > 0) {
      console.log(`   ⚠️  order_number 为 NULL: ${nullCheck.null_order_number} 条`);
      hasNulls = true;
    }
    if (nullCheck.null_order_amount > 0) {
      console.log(`   ⚠️  order_amount 为 NULL: ${nullCheck.null_order_amount} 条`);
      hasNulls = true;
    }
    if (nullCheck.null_created_by > 0) {
      console.log(`   ⚠️  created_by 为 NULL: ${nullCheck.null_created_by} 条`);
      hasNulls = true;
    }

    if (!hasNulls) {
      console.log('   ✅ 没有 NULL 值');
    }
    console.log();

    // 3. 测试 JSON_ARRAYAGG 查询
    console.log('🔍 测试 JSON_ARRAYAGG 查询（模拟后端 API）...');
    try {
      const [testQuery] = await connection.query(`
        SELECT ps.*,
               (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                 'id', psm.id,
                 'userId', psm.user_id,
                 'userName', psm.user_name,
                 'department', psm.department,
                 'percentage', psm.share_percentage,
                 'shareAmount', psm.share_amount,
                 'status', psm.status
               )) FROM performance_share_members psm WHERE psm.share_id = ps.id) as shareMembers
        FROM performance_shares ps
        LIMIT 1
      `);

      if (testQuery.length > 0) {
        const share = testQuery[0];
        console.log('   ✅ JSON_ARRAYAGG 查询成功');
        console.log(`   📋 示例数据:`);
        console.log(`      订单号: ${share.order_number}`);
        console.log(`      订单金额: ${share.order_amount}`);
        console.log(`      shareMembers 类型: ${typeof share.shareMembers}`);

        if (share.shareMembers) {
          try {
            const members = JSON.parse(share.shareMembers);
            console.log(`      成员数量: ${members ? members.length : 0}`);
          } catch (e) {
            console.log(`      ⚠️  JSON 解析失败: ${e.message}`);
          }
        } else {
          console.log(`      ⚠️  shareMembers 为 NULL`);
        }
      }
    } catch (error) {
      console.log(`   ❌ JSON_ARRAYAGG 查询失败: ${error.message}`);
    }
    console.log();

    // 4. 检查成员表的数据完整性
    console.log('🔍 检查成员表数据完整性...');
    const [memberNulls] = await connection.query(`
      SELECT
        SUM(CASE WHEN share_id IS NULL THEN 1 ELSE 0 END) as null_share_id,
        SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as null_user_id,
        SUM(CASE WHEN user_name IS NULL THEN 1 ELSE 0 END) as null_user_name,
        SUM(CASE WHEN share_percentage IS NULL THEN 1 ELSE 0 END) as null_percentage,
        SUM(CASE WHEN share_amount IS NULL THEN 1 ELSE 0 END) as null_amount
      FROM performance_share_members
    `);

    const memberNull = memberNulls[0];
    let hasMemberNulls = false;

    if (memberNull.null_share_id > 0) {
      console.log(`   ⚠️  share_id 为 NULL: ${memberNull.null_share_id} 条`);
      hasMemberNulls = true;
    }
    if (memberNull.null_user_id > 0) {
      console.log(`   ⚠️  user_id 为 NULL: ${memberNull.null_user_id} 条`);
      hasMemberNulls = true;
    }
    if (memberNull.null_user_name > 0) {
      console.log(`   ⚠️  user_name 为 NULL: ${memberNull.null_user_name} 条`);
      hasMemberNulls = true;
    }
    if (memberNull.null_percentage > 0) {
      console.log(`   ⚠️  share_percentage 为 NULL: ${memberNull.null_percentage} 条`);
      hasMemberNulls = true;
    }
    if (memberNull.null_amount > 0) {
      console.log(`   ⚠️  share_amount 为 NULL: ${memberNull.null_amount} 条`);
      hasMemberNulls = true;
    }

    if (!hasMemberNulls) {
      console.log('   ✅ 成员表数据完整');
    }
    console.log();

    // 5. 检查最近的记录
    console.log('🔍 查看最近的 3 条分享记录...');
    const [recentShares] = await connection.query(`
      SELECT id, share_number, order_number, order_amount, status, created_at
      FROM performance_shares
      ORDER BY created_at DESC
      LIMIT 3
    `);

    recentShares.forEach((share, index) => {
      console.log(`   ${index + 1}. ${share.share_number}`);
      console.log(`      订单: ${share.order_number}`);
      console.log(`      金额: ¥${share.order_amount}`);
      console.log(`      状态: ${share.status}`);
      console.log(`      时间: ${share.created_at}`);
    });
    console.log();

    console.log('='.repeat(60));
    console.log('✅ 数据质量检查完成');
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

checkDataQuality();
