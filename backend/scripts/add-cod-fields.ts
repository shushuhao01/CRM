/**
 * 添加代收管理相关字段到orders表
 */
import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'crm_db'
  });

  try {
    // 检查字段是否存在
    const [cols] = await conn.query('SHOW COLUMNS FROM orders LIKE "cod_amount"') as any[];

    if (cols.length === 0) {
      console.log('Adding COD fields to orders table...');

      await conn.query(`
        ALTER TABLE orders
        ADD COLUMN cod_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '代收金额',
        ADD COLUMN cod_status VARCHAR(20) DEFAULT 'pending' COMMENT '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收',
        ADD COLUMN cod_returned_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '已返款金额',
        ADD COLUMN cod_returned_at DATETIME NULL COMMENT '返款时间',
        ADD COLUMN cod_cancelled_at DATETIME NULL COMMENT '取消代收时间',
        ADD COLUMN cod_remark VARCHAR(500) DEFAULT NULL COMMENT '代收备注'
      `);
      console.log('✓ Fields added successfully');

      // 添加索引
      try {
        await conn.query('ALTER TABLE orders ADD INDEX idx_cod_status (cod_status)');
        await conn.query('ALTER TABLE orders ADD INDEX idx_cod_returned_at (cod_returned_at)');
        console.log('✓ Indexes added successfully');
      } catch (e: any) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log('✓ Indexes already exist');
        } else {
          throw e;
        }
      }
    } else {
      console.log('✓ COD fields already exist');
    }

    console.log('Done!');
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
