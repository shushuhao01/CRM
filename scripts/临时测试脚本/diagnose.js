// 快速诊断脚本 - 检查代收取消申请功能的所有依赖
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 加载环境变量
const localEnvPath = path.join(__dirname, '.env.local');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  console.log('✅ 使用 .env.local 配置\n');
} else {
  dotenv.config();
  console.log('✅ 使用 .env 配置\n');
}

async function diagnose() {
  console.log('='.repeat(60));
  console.log('代收取消申请功能诊断');
  console.log('='.repeat(60));
  console.log('');

  let connection;
  const results = {
    database: false,
    table: false,
    entity: false,
    backend: false,
    route: false
  };

  try {
    // 1. 检查数据库连接
    console.log('1️⃣  检查数据库连接...');
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'crm'
      });
      console.log('   ✅ 数据库连接成功');
      console.log(`   📍 数据库: ${process.env.DB_DATABASE}`);
      results.database = true;
    } catch (error) {
      console.log('   ❌ 数据库连接失败:', error.message);
      console.log('   💡 请检查 .env.local 中的数据库配置');
      return;
    }

    // 2. 检查表是否存在
    console.log('\n2️⃣  检查数据库表...');
    try {
      const [tables] = await connection.query(
        "SHOW TABLES LIKE 'cod_cancel_applications'"
      );
      if (tables.length === 0) {
        console.log('   ❌ 表 cod_cancel_applications 不存在');
        console.log('   💡 请执行: npm run init:cod-table');
        return;
      }
      console.log('   ✅ 表 cod_cancel_applications 存在');
      results.table = true;

      // 检查表结构
      const [columns] = await connection.query(
        "DESCRIBE cod_cancel_applications"
      );
      const paymentProofCol = columns.find(col => col.Field === 'payment_proof');
      if (paymentProofCol) {
        console.log(`   📍 payment_proof 字段类型: ${paymentProofCol.Type}`);
        if (paymentProofCol.Type === 'json') {
          console.log('   ✅ 字段类型正确');
        } else {
          console.log('   ⚠️  字段类型应该是 json，当前是', paymentProofCol.Type);
          console.log('   💡 执行: ALTER TABLE cod_cancel_applications MODIFY COLUMN payment_proof JSON;');
        }
      }
    } catch (error) {
      console.log('   ❌ 检查表失败:', error.message);
      return;
    }

    // 3. 检查实体文件
    console.log('\n3️⃣  检查实体文件...');
    const entityPath = path.join(__dirname, 'src/entities/CodCancelApplication.ts');
    if (fs.existsSync(entityPath)) {
      console.log('   ✅ 实体文件存在');
      const content = fs.readFileSync(entityPath, 'utf8');
      if (content.includes("@Column('json'")) {
        console.log('   ✅ 使用正确的 json 类型');
      } else if (content.includes("@Column('simple-json'")) {
        console.log('   ⚠️  使用了 simple-json 类型，应该改为 json');
      }
      results.entity = true;
    } else {
      console.log('   ❌ 实体文件不存在');
      return;
    }

    // 4. 检查路由文件
    console.log('\n4️⃣  检查路由文件...');
    const routePath = path.join(__dirname, 'src/routes/codApplication.ts');
    if (fs.existsSync(routePath)) {
      console.log('   ✅ 路由文件存在');
      const content = fs.readFileSync(routePath, 'utf8');
      if (content.includes("router.post('/create'")) {
        console.log('   ✅ 创建申请路由已定义');
      }
      if (content.includes('console.log')) {
        console.log('   ✅ 包含调试日志');
      }
      results.route = true;
    } else {
      console.log('   ❌ 路由文件不存在');
      return;
    }

    // 5. 检查后端服务
    console.log('\n5️⃣  检查后端服务...');
    const port = process.env.PORT || 3000;
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/api/v1/health`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            console.log(`   ✅ 后端服务运行在端口 ${port}`);
            results.backend = true;
            resolve();
          } else {
            reject(new Error(`状态码: ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(2000, () => reject(new Error('超时')));
      });
    } catch (error) {
      console.log(`   ❌ 后端服务未运行在端口 ${port}`);
      console.log('   💡 请启动后端: npm run dev');
    }

    // 6. 测试插入
    console.log('\n6️⃣  测试数据插入...');
    try {
      const testId = 'diagnose-' + Date.now();
      const testData = {
        id: testId,
        order_id: 'test-order',
        order_number: 'TEST001',
        applicant_id: 'admin',
        applicant_name: '测试',
        department_id: null,
        department_name: null,
        original_cod_amount: 100.00,
        modified_cod_amount: 0.00,
        cancel_reason: '诊断测试',
        payment_proof: JSON.stringify(['/test.png']),
        status: 'pending'
      };

      await connection.query(
        'INSERT INTO cod_cancel_applications SET ?',
        testData
      );
      console.log('   ✅ 数据插入成功');

      // 查询并删除
      await connection.query(
        'DELETE FROM cod_cancel_applications WHERE id = ?',
        [testId]
      );
      console.log('   ✅ 测试数据已清理');
    } catch (error) {
      console.log('   ❌ 数据插入失败:', error.message);
      console.log('   💡 可能是字段类型或约束问题');
    }

    // 7. 总结
    console.log('\n' + '='.repeat(60));
    console.log('诊断结果总结');
    console.log('='.repeat(60));
    console.log('');
    console.log(`数据库连接: ${results.database ? '✅' : '❌'}`);
    console.log(`数据库表: ${results.table ? '✅' : '❌'}`);
    console.log(`实体文件: ${results.entity ? '✅' : '❌'}`);
    console.log(`路由文件: ${results.route ? '✅' : '❌'}`);
    console.log(`后端服务: ${results.backend ? '✅' : '❌'}`);

    const allPassed = Object.values(results).every(v => v);
    console.log('');
    if (allPassed) {
      console.log('🎉 所有检查通过！');
      console.log('');
      console.log('如果仍然报500错误，请：');
      console.log('1. 重启后端服务（Ctrl+C 然后 npm run dev）');
      console.log('2. 刷新浏览器页面');
      console.log('3. 查看后端控制台的详细错误日志');
    } else {
      console.log('⚠️  发现问题，请根据上面的提示修复');
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ 诊断过程出错:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnose();
