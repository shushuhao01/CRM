/**
 * 执行备注预设表迁移脚本 (SQLite版本)
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function executeMigration() {
  const dbPath = path.join(__dirname, 'data', 'crm_dev.db');
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    console.log('开始执行备注预设表迁移 (SQLite)...');
    console.log('数据库路径:', dbPath);
    console.log('');

    db.serialize(() => {
      // 1. 创建备注预设表
      console.log('1. 创建 value_added_remark_presets 表...');
      db.run(`
        CREATE TABLE IF NOT EXISTS value_added_remark_presets (
          id TEXT PRIMARY KEY,
          remark_text TEXT NOT NULL,
          category TEXT DEFAULT 'general' CHECK(category IN ('invalid', 'general')),
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          usage_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('   ❌ 创建表失败:', err.message);
        } else {
          console.log('   ✅ 表创建成功');
        }
      });

      // 2. 为 value_added_orders 表添加备注字段
      console.log('2. 添加 remark 字段到 value_added_orders 表...');
      db.run(`
        ALTER TABLE value_added_orders
        ADD COLUMN remark TEXT DEFAULT NULL
      `, (err) => {
        if (err) {
          if (err.message.includes('duplicate column')) {
            console.log('   ⚠️  字段已存在，跳过');
          } else {
            console.error('   ❌ 添加字段失败:', err.message);
          }
        } else {
          console.log('   ✅ 字段添加成功');
        }
      });

      // 3. 插入无效原因预设
      console.log('3. 插入无效原因预设...');
      const invalidReasons = [
        '客户拒收',
        '地址错误无法送达',
        '客户电话无法接通',
        '客户取消订单',
        '商品质量问题',
        '发货错误',
        '物流丢失',
        '超时未签收',
        '客户信息不符',
        '其他原因'
      ];

      const stmt1 = db.prepare(`
        INSERT OR IGNORE INTO value_added_remark_presets
        (id, remark_text, category, sort_order, is_active, usage_count)
        VALUES (?, ?, 'invalid', ?, 1, 0)
      `);

      invalidReasons.forEach((reason, index) => {
        stmt1.run(uuidv4(), reason, index + 1);
      });
      stmt1.finalize(() => {
        console.log('   ✅ 插入10条无效原因预设');
      });

      // 4. 插入通用备注预设
      console.log('4. 插入通用备注预设...');
      const generalRemarks = [
        '正常处理',
        '需要跟进',
        '已联系客户',
        '待确认',
        '优先处理'
      ];

      const stmt2 = db.prepare(`
        INSERT OR IGNORE INTO value_added_remark_presets
        (id, remark_text, category, sort_order, is_active, usage_count)
        VALUES (?, ?, 'general', ?, 1, 0)
      `);

      generalRemarks.forEach((remark, index) => {
        stmt2.run(uuidv4(), remark, index + 1);
      });
      stmt2.finalize(() => {
        console.log('   ✅ 插入5条通用备注预设');
        console.log('');

        // 5. 验证结果
        console.log('5. 验证迁移结果...');

        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='value_added_remark_presets'", (err, row) => {
          console.log('   - value_added_remark_presets 表:', row ? '✅ 存在' : '❌ 不存在');
        });

        db.all("PRAGMA table_info(value_added_orders)", (err, rows) => {
          if (!err && rows) {
            const remarkField = rows.find(r => r.name === 'remark');
            console.log('   - value_added_orders.remark 字段:', remarkField ? '✅ 存在' : '❌ 不存在');
          }
        });

        db.get('SELECT COUNT(*) as count FROM value_added_remark_presets', (err, row) => {
          if (!err && row) {
            console.log('   - 预设数据总数:', row.count);
          }

          db.all('SELECT category, COUNT(*) as count FROM value_added_remark_presets GROUP BY category', (err, rows) => {
            if (!err && rows) {
              rows.forEach(r => {
                console.log(`     ${r.category}: ${r.count}条`);
              });
            }

            console.log('');
            console.log('✅ 备注预设表迁移完成！');
            db.close();
            resolve();
          });
        });
      });
    });
  });
}

executeMigration().catch(console.error);
