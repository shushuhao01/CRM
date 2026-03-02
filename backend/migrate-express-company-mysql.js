/**
 * 为增值订单表添加物流公司字段 (MySQL版本)
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 加载环境变量
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

async function migrate() {
  let connection;

  try {
    console.log('='.repeat(60));
    console.log('增值管理物流公司字段迁移 (MySQL)');
    console.log('='.repeat(60));
    console.log('数据库:', process.env.DB_DATABASE || 'crm');
    console.log('主机:', process.env.DB_HOST || 'localhost');
    console.log('='.repeat(60));

    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm'
    });

    console.log('\n✅ 数据库连接成功');

    // 1. 检查字段是否存在
    console.log('\n步骤1: 检查表结构...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'value_added_orders'
        AND COLUMN_NAME = 'express_company'
    `, [process.env.DB_DATABASE || 'crm']);

    if (columns.length > 0) {
      console.log('✅ express_company 字段已存在');
    } else {
      console.log('❌ express_company 字段不存在，开始添加...');

      // 2. 添加字段
      await connection.query(`
        ALTER TABLE value_added_orders
        ADD COLUMN express_company VARCHAR(50) NULL COMMENT '物流公司'
        AFTER tracking_number
      `);
      console.log('✅ express_company 字段添加成功');
    }

    // 3. 同步数据
    console.log('\n步骤2: 同步物流公司数据...');
    const [result] = await connection.query(`
      UPDATE value_added_orders vo
      INNER JOIN orders o ON vo.order_id = o.id
      SET vo.express_company = o.express_company
      WHERE vo.order_id IS NOT NULL
        AND o.express_company IS NOT NULL
    `);
    console.log(`✅ 数据同步完成 (更新了 ${result.affectedRows} 条记录)`);

    // 4. 验证结果
    console.log('\n步骤3: 验证结果...');
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) as synced
      FROM value_added_orders
    `);

    const stat = stats[0];
    console.log(`  总记录数: ${stat.total}`);
    console.log(`  已同步物流公司: ${stat.synced}`);
    if (stat.total > 0) {
      console.log(`  同步率: ${((stat.synced / stat.total) * 100).toFixed(1)}%`);
    }

    // 5. 显示示例数据
    console.log('\n步骤4: 示例数据（前5条）...');
    const [samples] = await connection.query(`
      SELECT
        order_number,
        tracking_number,
        express_company
      FROM value_added_orders
      WHERE tracking_number IS NOT NULL
      LIMIT 5
    `);

    if (samples.length === 0) {
      console.log('  没有找到有物流单号的记录');
    } else {
      console.log('\n  订单号 | 物流单号 | 物流公司');
      console.log('  ' + '-'.repeat(60));
      samples.forEach(row => {
        console.log(`  ${row.order_number || 'N/A'} | ${row.tracking_number || 'N/A'} | ${row.express_company || '空'}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 迁移完成！');
    console.log('='.repeat(60));
    console.log('下一步操作:');
    console.log('1. 重启后端服务: npm run dev');
    console.log('2. 打开增值管理页面');
    console.log('3. 点击物流单号超链接测试弹窗');
    console.log('4. 检查物流公司是否正确显示');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n提示: value_added_orders 表不存在');
      console.error('请先执行增值管理系统的初始化SQL');
    } else if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('\n✅ 字段已存在，继续同步数据...');
      // 如果字段已存在，继续执行数据同步
      try {
        const [result] = await connection.query(`
          UPDATE value_added_orders vo
          INNER JOIN orders o ON vo.order_id = o.id
          SET vo.express_company = o.express_company
          WHERE vo.order_id IS NOT NULL
            AND o.express_company IS NOT NULL
        `);
        console.log(`✅ 数据同步完成 (更新了 ${result.affectedRows} 条记录)`);
      } catch (syncError) {
        console.error('❌ 数据同步失败:', syncError.message);
      }
    }
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

migrate().catch(err => {
  console.error('执行出错:', err.message);
  process.exit(1);
});
