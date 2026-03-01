/**
 * 为SQLite创建outsource_companies表
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm.db');
const db = new sqlite3.Database(dbPath);

console.log('开始创建outsource_companies表...\n');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS outsource_companies (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(50),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  address VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  default_unit_price DECIMAL(10,2) DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 999,
  total_orders INTEGER DEFAULT 0,
  valid_orders INTEGER DEFAULT 0,
  invalid_orders INTEGER DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  settled_amount DECIMAL(12,2) DEFAULT 0,
  remark TEXT,
  created_by VARCHAR(50),
  created_by_name VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_company_name ON outsource_companies(company_name);',
  'CREATE INDEX IF NOT EXISTS idx_status ON outsource_companies(status);',
  'CREATE INDEX IF NOT EXISTS idx_created_at ON outsource_companies(created_at);',
  'CREATE INDEX IF NOT EXISTS idx_sort_order ON outsource_companies(sort_order);'
];

db.serialize(() => {
  // 创建表
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('❌ 创建表失败:', err);
      return;
    }
    console.log('✅ outsource_companies表创建成功');

    // 创建索引
    let indexCount = 0;
    createIndexes.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          console.error(`❌ 创建索引${index + 1}失败:`, err);
        } else {
          indexCount++;
          console.log(`✅ 索引${index + 1}创建成功`);
        }

        if (indexCount === createIndexes.length) {
          // 插入默认公司
          const insertSQL = `
            INSERT INTO outsource_companies (
              id, company_name, default_unit_price, is_default, sort_order,
              status, created_by_name
            ) VALUES (
              'default-company-001', '默认外包公司', 900.00, 1, 1,
              'active', '系统'
            )
          `;

          db.run(insertSQL, (err) => {
            if (err) {
              console.log('⚠️  默认公司可能已存在，跳过插入');
            } else {
              console.log('✅ 默认外包公司创建成功');
            }

            // 验证
            db.get('SELECT COUNT(*) as count FROM outsource_companies', (err, row) => {
              if (err) {
                console.error('验证失败:', err);
              } else {
                console.log(`\n✅ 表创建完成！当前有 ${row.count} 条记录`);
              }
              db.close();
            });
          });
        }
      });
    });
  });
});
