/**
 * 数据库迁移：获客链接新增权重字段 + 渠道统计字段
 * Phase 5: 获客管理增强
 */
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const localEnvPath = path.join(__dirname, '.env.local');
const envPath = fs.existsSync(localEnvPath) ? localEnvPath : path.join(__dirname, '.env');
dotenv.config({ path: envPath });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  });

  console.log('[Migration] Altering wecom_acquisition_links table...');

  const alterStatements = [
    `ALTER TABLE wecom_acquisition_links ADD COLUMN IF NOT EXISTS weight_config TEXT NULL COMMENT '成员权重配置(JSON: [{userId,weight}])'`,
    `ALTER TABLE wecom_acquisition_links ADD COLUMN IF NOT EXISTS loss_count INT DEFAULT 0 COMMENT '流失数量'`,
    `ALTER TABLE wecom_acquisition_links ADD COLUMN IF NOT EXISTS daily_stats TEXT NULL COMMENT '每日统计(JSON: [{date,click,add,loss}])'`
  ];

  for (const sql of alterStatements) {
    try {
      await connection.execute(sql);
      console.log('[Migration] OK:', sql.substring(0, 80));
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('[Migration] Column already exists, skipping.');
      } else {
        console.warn('[Migration] Warning:', e.message);
      }
    }
  }

  console.log('[Migration] wecom_acquisition_links altered successfully.');
  await connection.end();
}

run().catch(err => {
  console.error('[Migration] Error:', err);
  process.exit(1);
});

