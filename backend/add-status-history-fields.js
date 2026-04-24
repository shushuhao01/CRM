/**
 * 为 order_status_history 表添加新字段：operator_department, action_type, change_detail
 * 用于记录详细的订单操作轨迹
 * 执行方式：node add-status-history-fields.js
 */
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm'
  });

  console.log('连接数据库成功，开始迁移...');

  const alterQueries = [
    `ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS operator_department VARCHAR(100) NULL COMMENT '操作人部门'`,
    `ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) NULL COMMENT '操作类型：status_change/edit/audit/cancel/shipment/create等'`,
    `ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS change_detail TEXT NULL COMMENT '变更详情JSON'`
  ];

  for (const sql of alterQueries) {
    try {
      await connection.query(sql);
      console.log('✅ 执行成功:', sql.substring(0, 80) + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
        console.log('⏭️ 字段已存在，跳过:', sql.substring(0, 60) + '...');
      } else {
        console.error('❌ 执行失败:', err.message);
      }
    }
  }

  await connection.end();
  console.log('迁移完成！');
}

migrate().catch(console.error);

