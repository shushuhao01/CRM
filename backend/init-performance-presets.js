/**
 * 初始化绩效配置系统级预设数据
 * 这些预设 tenant_id = NULL，对所有租户和私有客户可见，不可删除
 *
 * 使用方式: node init-performance-presets.js
 */
const path = require('path');
const fs = require('fs');

// 加载环境配置
const isProduction = process.env.NODE_ENV === 'production';
const envFile = (!isProduction && fs.existsSync(path.join(__dirname, '.env.local')))
  ? '.env.local'
  : '.env';
require('dotenv').config({ path: path.join(__dirname, envFile) });

const mysql = require('mysql2/promise');

// 系统级预设数据
const SYSTEM_PRESETS = [
  // 有效状态预设 — configValue 用英文（与订单字段一致），configLabel 用中文
  { config_type: 'status', config_value: 'pending', config_label: '待处理', sort_order: 1 },
  { config_type: 'status', config_value: 'valid',   config_label: '有效',   sort_order: 2 },
  { config_type: 'status', config_value: 'invalid', config_label: '无效',   sort_order: 3 },
  // 系数预设
  { config_type: 'coefficient', config_value: '1',    config_label: '1',    sort_order: 1 },
  { config_type: 'coefficient', config_value: '0.8',  config_label: '0.8',  sort_order: 2 },
  { config_type: 'coefficient', config_value: '0.5',  config_label: '0.5',  sort_order: 3 },
  { config_type: 'coefficient', config_value: '0',    config_label: '0',    sort_order: 4 },
  // 备注预设 — 直接使用中文
  { config_type: 'remark', config_value: '正常订单',   config_label: '正常订单',   sort_order: 1 },
  { config_type: 'remark', config_value: '部分退款',   config_label: '部分退款',   sort_order: 2 },
  { config_type: 'remark', config_value: '客户取消',   config_label: '客户取消',   sort_order: 3 },
  { config_type: 'remark', config_value: '疾病换单',   config_label: '疾病换单',   sort_order: 4 },
  { config_type: 'remark', config_value: '未使用退货', config_label: '未使用退货', sort_order: 5 },
  { config_type: 'remark', config_value: '已使用退货', config_label: '已使用退货', sort_order: 6 },
  { config_type: 'remark', config_value: '自己指导',   config_label: '自己指导',   sort_order: 7 },
  { config_type: 'remark', config_value: '拒收',       config_label: '拒收',       sort_order: 8 },
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm',
  });

  console.log('✅ 数据库连接成功');

  // 确保表存在
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS performance_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID，NULL为系统级预设',
      config_type VARCHAR(20) NOT NULL COMMENT '配置类型: status/coefficient/remark',
      config_value VARCHAR(50) NOT NULL COMMENT '配置值',
      config_label VARCHAR(50) DEFAULT NULL COMMENT '显示标签',
      sort_order INT DEFAULT 0 COMMENT '排序',
      is_active TINYINT DEFAULT 1 COMMENT '是否启用',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_type (tenant_id, config_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  let inserted = 0, skipped = 0;

  for (const preset of SYSTEM_PRESETS) {
    // 检查是否已存在同类型同值的系统级预设
    const [existing] = await connection.execute(
      `SELECT id FROM performance_config WHERE tenant_id IS NULL AND config_type = ? AND config_value = ?`,
      [preset.config_type, preset.config_value]
    );

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await connection.execute(
      `INSERT INTO performance_config (tenant_id, config_type, config_value, config_label, sort_order, is_active)
       VALUES (NULL, ?, ?, ?, ?, 1)`,
      [preset.config_type, preset.config_value, preset.config_label, preset.sort_order]
    );
    inserted++;
    console.log(`  ✅ [${preset.config_type}] ${preset.config_value}`);
  }

  console.log(`\n🎉 完成！新增 ${inserted} 条，跳过 ${skipped} 条（已存在）`);
  await connection.end();
}

main().catch(err => {
  console.error('❌ 执行失败:', err.message);
  process.exit(1);
});

