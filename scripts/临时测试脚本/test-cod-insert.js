// 测试代收申请插入
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 加载.env.local（如果存在）
const localEnvPath = path.join(__dirname, '.env.local');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  console.log('✅ 使用 .env.local 配置');
} else {
  dotenv.config();
  console.log('✅ 使用 .env 配置');
}

async function testInsert() {
  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm'
    });

    console.log('✅ 数据库连接成功');

    // 检查表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'cod_cancel_applications'"
    );

    if (tables.length === 0) {
      console.error('❌ 表 cod_cancel_applications 不存在');
      console.log('请执行: npm run init:cod-table');
      return;
    }

    console.log('✅ 表 cod_cancel_applications 存在');

    // 查看表结构
    const [columns] = await connection.query(
      "DESCRIBE cod_cancel_applications"
    );

    console.log('\n表结构:');
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 测试插入数据
    const testData = {
      id: 'test-' + Date.now(),
      order_id: 'test-order-id',
      order_number: 'TEST001',
      applicant_id: 'admin',
      applicant_name: '测试用户',
      department_id: null,
      department_name: null,
      original_cod_amount: 100.00,
      modified_cod_amount: 0.00,
      cancel_reason: '测试原因',
      payment_proof: JSON.stringify(['/uploads/test.png']),
      status: 'pending'
    };

    console.log('\n测试插入数据:');
    console.log(testData);

    const [result] = await connection.query(
      'INSERT INTO cod_cancel_applications SET ?',
      testData
    );

    console.log('\n✅ 插入成功!');
    console.log('插入ID:', testData.id);

    // 查询刚插入的数据
    const [rows] = await connection.query(
      'SELECT * FROM cod_cancel_applications WHERE id = ?',
      [testData.id]
    );

    console.log('\n查询结果:');
    console.log(rows[0]);

    // 删除测试数据
    await connection.query(
      'DELETE FROM cod_cancel_applications WHERE id = ?',
      [testData.id]
    );

    console.log('\n✅ 测试数据已清理');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testInsert();
