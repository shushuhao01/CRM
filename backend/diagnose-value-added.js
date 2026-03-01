const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function diagnose() {
  console.log('🔍 增值管理系统诊断工具\n');
  console.log('=' .repeat(60));

  let conn;
  try {
    // 1. 检查数据库连接
    console.log('\n📊 步骤1: 检查数据库连接...');
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'abc789',
      password: 'YtZWJPF2bpsCscHX',
      database: 'crm_local'
    });
    console.log('   ✅ 数据库连接成功');

    // 2. 检查表是否存在
    console.log('\n📊 步骤2: 检查表是否存在...');
    const [tables] = await conn.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'crm_local'
        AND TABLE_NAME IN (
          'outsource_companies',
          'value_added_price_config',
          'value_added_orders',
          'value_added_status_configs'
        )
    `);

    const tableNames = tables.map(t => t.TABLE_NAME);
    const requiredTables = [
      'outsource_companies',
      'value_added_price_config',
      'value_added_orders',
      'value_added_status_configs'
    ];

    requiredTables.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - 表不存在！`);
      }
    });

    // 3. 检查表结构
    console.log('\n📊 步骤3: 检查value_added_orders表结构...');
    const [columns] = await conn.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'crm_local'
        AND TABLE_NAME = 'value_added_orders'
      ORDER BY ORDINAL_POSITION
    `);

    const requiredColumns = [
      'id', 'order_id', 'order_number', 'customer_id', 'customer_name',
      'customer_phone', 'tracking_number', 'order_status', 'order_date',
      'company_id', 'company_name', 'unit_price', 'status', 'settlement_status',
      'settlement_amount'
    ];

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - 字段不存在！`);
      }
    });

    // 4. 检查数据
    console.log('\n📊 步骤4: 检查数据...');
    const [configCount] = await conn.query('SELECT COUNT(*) as count FROM value_added_price_config');
    const [statusCount] = await conn.query('SELECT COUNT(*) as count FROM value_added_status_configs');
    const [orderCount] = await conn.query('SELECT COUNT(*) as count FROM value_added_orders');
    const [companyCount] = await conn.query('SELECT COUNT(*) as count FROM outsource_companies');

    console.log(`   费用配置: ${configCount[0].count} 条 ${configCount[0].count >= 1 ? '✅' : '❌'}`);
    console.log(`   状态配置: ${statusCount[0].count} 条 ${statusCount[0].count >= 6 ? '✅' : '❌'}`);
    console.log(`   增值订单: ${orderCount[0].count} 条`);
    console.log(`   外包公司: ${companyCount[0].count} 条`);

    // 5. 检查订单表
    console.log('\n📊 步骤5: 检查订单表...');
    const [ordersTable] = await conn.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'crm_local'
        AND TABLE_NAME = 'orders'
    `);

    if (ordersTable[0].count > 0) {
      console.log('   ✅ orders表存在');

      // 检查已签收和已完成的订单
      const [deliveredOrders] = await conn.query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE status IN ('delivered', 'completed')
      `);
      console.log(`   📦 已签收/已完成订单: ${deliveredOrders[0].count} 条`);

      if (deliveredOrders[0].count > 0) {
        // 显示前5条订单
        const [sampleOrders] = await conn.query(`
          SELECT id, order_number, customer_name, status, created_at
          FROM orders
          WHERE status IN ('delivered', 'completed')
          LIMIT 5
        `);
        console.log('   📋 示例订单:');
        sampleOrders.forEach(order => {
          console.log(`      - ${order.order_number} | ${order.customer_name} | ${order.status}`);
        });
      }
    } else {
      console.log('   ❌ orders表不存在！');
    }

    // 6. 检查实体类文件
    console.log('\n📊 步骤6: 检查实体类文件...');
    const entityFiles = [
      'src/entities/ValueAddedOrder.ts',
      'src/entities/ValueAddedPriceConfig.ts',
      'src/entities/OutsourceCompany.ts',
      'src/entities/ValueAddedStatusConfig.ts'
    ];

    entityFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} - 文件不存在！`);
      }
    });

    // 7. 检查路由文件
    console.log('\n📊 步骤7: 检查路由文件...');
    const routeFile = path.join(__dirname, 'src/routes/valueAdded.ts');
    if (fs.existsSync(routeFile)) {
      console.log('   ✅ src/routes/valueAdded.ts');

      // 检查路由是否在app.ts中注册
      const appFile = path.join(__dirname, 'src/app.ts');
      const appContent = fs.readFileSync(appFile, 'utf8');
      if (appContent.includes('valueAddedRoutes') && appContent.includes('/value-added')) {
        console.log('   ✅ 路由已在app.ts中注册');
      } else {
        console.log('   ❌ 路由未在app.ts中注册！');
      }
    } else {
      console.log('   ❌ src/routes/valueAdded.ts - 文件不存在！');
    }

    // 8. 测试同步函数
    console.log('\n📊 步骤8: 测试订单同步逻辑...');
    if (ordersTable[0].count > 0) {
      const [testOrders] = await conn.query(`
        SELECT id, order_number, customer_id, customer_name, customer_phone,
               tracking_number, status, created_at
        FROM orders
        WHERE status IN ('delivered', 'completed')
        LIMIT 1
      `);

      if (testOrders.length > 0) {
        const order = testOrders[0];
        console.log('   📦 测试订单:', order.order_number);

        // 检查是否已同步
        const [existing] = await conn.query(
          'SELECT * FROM value_added_orders WHERE order_id = ?',
          [order.id]
        );

        if (existing.length > 0) {
          console.log('   ✅ 订单已同步到增值管理');
        } else {
          console.log('   ⚠️  订单未同步到增值管理（这是正常的，需要访问API触发同步）');
        }
      }
    }

    // 9. 总结
    console.log('\n' + '='.repeat(60));
    console.log('📋 诊断总结:\n');

    const issues = [];
    if (tableNames.length < 4) issues.push('- 缺少必要的数据库表');
    if (configCount[0].count < 1) issues.push('- 缺少默认费用配置');
    if (statusCount[0].count < 6) issues.push('- 缺少状态配置');

    if (issues.length === 0) {
      console.log('✅ 所有检查通过！系统应该可以正常工作。');
      console.log('\n💡 如果前端仍然报错，请：');
      console.log('   1. 检查浏览器控制台的具体错误信息');
      console.log('   2. 检查Network标签中的API请求详情');
      console.log('   3. 查看后端日志: pm2 logs crm-backend');
    } else {
      console.log('❌ 发现以下问题:');
      issues.forEach(issue => console.log(issue));
      console.log('\n💡 建议：重新执行数据库迁移脚本');
    }

  } catch (error) {
    console.error('\n❌ 诊断过程中出错:', error.message);
    console.error(error);
  } finally {
    if (conn) await conn.end();
  }
}

diagnose();
