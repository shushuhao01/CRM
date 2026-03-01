/**
 * 插入备注预设数据
 */
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// 加载环境变量
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

async function insertData() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm_local'
    });

    console.log('开始插入备注预设数据...');
    console.log('数据库:', process.env.DB_DATABASE || 'crm_local');
    console.log('');

    // 无效原因预设
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

    // 通用备注预设
    const generalRemarks = [
      '正常处理',
      '需要跟进',
      '已联系客户',
      '待确认',
      '优先处理'
    ];

    console.log('1. 插入无效原因预设...');
    let insertedCount = 0;
    for (let i = 0; i < invalidReasons.length; i++) {
      try {
        await connection.query(
          'INSERT INTO value_added_remark_presets (id, remark_text, category, sort_order, is_active, usage_count) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), invalidReasons[i], 'invalid', i + 1, 1, 0]
        );
        insertedCount++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`   ⚠️  "${invalidReasons[i]}" 已存在，跳过`);
        } else {
          throw error;
        }
      }
    }
    console.log(`   ✅ 插入${insertedCount}条无效原因预设`);

    console.log('2. 插入通用备注预设...');
    insertedCount = 0;
    for (let i = 0; i < generalRemarks.length; i++) {
      try {
        await connection.query(
          'INSERT INTO value_added_remark_presets (id, remark_text, category, sort_order, is_active, usage_count) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), generalRemarks[i], 'general', i + 1, 1, 0]
        );
        insertedCount++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`   ⚠️  "${generalRemarks[i]}" 已存在，跳过`);
        } else {
          throw error;
        }
      }
    }
    console.log(`   ✅ 插入${insertedCount}条通用备注预设`);
    console.log('');

    // 验证结果
    console.log('3. 验证数据...');
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as count FROM value_added_remark_presets'
    );
    console.log('   - 预设数据总数:', countResult[0].count);

    const [categoryResult] = await connection.query(
      'SELECT category, COUNT(*) as count FROM value_added_remark_presets GROUP BY category'
    );
    categoryResult.forEach(row => {
      console.log(`     ${row.category}: ${row.count}条`);
    });

    console.log('');
    console.log('✅ 备注预设数据插入完成！');

  } catch (error) {
    console.error('❌ 插入失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

insertData().catch(console.error);
