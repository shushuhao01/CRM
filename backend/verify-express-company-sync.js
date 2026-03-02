/**
 * 验证增值管理物流公司同步
 * 检查：
 * 1. 数据库字段是否存在
 * 2. 现有数据是否有物流公司信息
 * 3. 订单表中的物流公司数据
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');
const db = new sqlite3.Database(dbPath);

console.log('='.repeat(60));
console.log('增值管理物流公司同步验证');
console.log('='.repeat(60));

// 1. 检查 value_added_orders 表结构
console.log('\n1. 检查 value_added_orders 表结构:');
db.all(`PRAGMA table_info(value_added_orders)`, (err, columns) => {
  if (err) {
    console.error('❌ 查询表结构失败:', err.message);
    return;
  }

  const expressCompanyColumn = columns.find(col => col.name === 'express_company');
  if (expressCompanyColumn) {
    console.log('✅ express_company 字段已存在');
    console.log('   类型:', expressCompanyColumn.type);
    console.log('   可空:', expressCompanyColumn.notnull === 0 ? '是' : '否');
  } else {
    console.log('❌ express_company 字段不存在，需要执行迁移SQL');
  }

  // 2. 检查 value_added_orders 中的数据
  console.log('\n2. 检查 value_added_orders 中的物流公司数据:');
  db.all(`
    SELECT
      COUNT(*) as total,
      COUNT(express_company) as has_express_company,
      COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) as has_valid_express_company
    FROM value_added_orders
  `, (err, rows) => {
    if (err) {
      console.error('❌ 查询失败:', err.message);
      return;
    }

    const stats = rows[0];
    console.log(`   总记录数: ${stats.total}`);
    console.log(`   有物流公司字段的: ${stats.has_express_company}`);
    console.log(`   有有效物流公司的: ${stats.has_valid_express_company}`);

    if (stats.total > 0 && stats.has_valid_express_company === 0) {
      console.log('⚠️  所有记录的物流公司都为空，需要从订单表同步');
    } else if (stats.has_valid_express_company > 0) {
      console.log(`✅ 已有 ${stats.has_valid_express_company} 条记录包含物流公司信息`);
    }

    // 3. 检查订单表中的物流公司数据
    console.log('\n3. 检查 orders 表中的物流公司数据:');
    db.all(`
      SELECT
        COUNT(*) as total,
        COUNT(express_company) as has_express_company,
        COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) as has_valid_express_company
      FROM orders
      WHERE status IN ('delivered', 'completed')
    `, (err, rows) => {
      if (err) {
        console.error('❌ 查询失败:', err.message);
        return;
      }

      const orderStats = rows[0];
      console.log(`   已签收/已完成订单总数: ${orderStats.total}`);
      console.log(`   有物流公司字段的: ${orderStats.has_express_company}`);
      console.log(`   有有效物流公司的: ${orderStats.has_valid_express_company}`);

      // 4. 显示示例数据对比
      console.log('\n4. 示例数据对比（前5条）:');
      db.all(`
        SELECT
          vo.id,
          vo.order_number,
          vo.tracking_number,
          vo.express_company as vo_express_company,
          o.express_company as order_express_company
        FROM value_added_orders vo
        LEFT JOIN orders o ON vo.order_id = o.id
        WHERE vo.tracking_number IS NOT NULL
        LIMIT 5
      `, (err, rows) => {
        if (err) {
          console.error('❌ 查询失败:', err.message);
          db.close();
          return;
        }

        if (rows.length === 0) {
          console.log('   没有找到有物流单号的记录');
        } else {
          console.log('\n   订单号 | 物流单号 | 增值表物流公司 | 订单表物流公司');
          console.log('   ' + '-'.repeat(80));
          rows.forEach(row => {
            console.log(`   ${row.order_number || 'N/A'} | ${row.tracking_number || 'N/A'} | ${row.vo_express_company || '空'} | ${row.order_express_company || '空'}`);
          });
        }

        // 5. 提供修复建议
        console.log('\n' + '='.repeat(60));
        console.log('修复建议:');
        console.log('='.repeat(60));

        if (!expressCompanyColumn) {
          console.log('1. ❌ 需要执行数据库迁移:');
          console.log('   文件: backend/database-migrations/add-express-company-to-value-added.sql');
          console.log('   执行方式: 在数据库管理工具中执行该SQL文件');
        } else {
          console.log('1. ✅ 数据库字段已存在');
        }

        if (stats.total > 0 && stats.has_valid_express_company < stats.total) {
          console.log('\n2. ⚠️  需要同步物流公司数据:');
          console.log('   方式1: 重启后端服务，系统会自动同步最近30天的订单');
          console.log('   方式2: 在增值管理页面刷新，触发自动同步');
          console.log('   方式3: 执行迁移SQL中的UPDATE语句手动同步');
        } else {
          console.log('\n2. ✅ 物流公司数据已同步');
        }

        console.log('\n3. 📝 验证步骤:');
        console.log('   a) 重启后端服务: npm run dev');
        console.log('   b) 打开增值管理页面');
        console.log('   c) 点击任意物流单号超链接');
        console.log('   d) 检查弹窗中的物流公司是否正确显示');

        console.log('\n' + '='.repeat(60));
        db.close();
      });
    });
  });
});
