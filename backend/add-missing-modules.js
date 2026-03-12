const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function addModules() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('添加缺失的模块...\n');

  // 检查现有模块
  const [existing] = await conn.execute('SELECT code FROM modules');
  const existingCodes = existing.map(m => m.code);
  console.log('现有模块:', existingCodes.join(', '));

  // 定义要添加的模块
  const newModules = [
    {
      id: uuidv4(),
      name: '资料管理',
      code: 'data_management',
      description: '客户资料、订单资料等数据管理',
      icon: 'el-icon-folder',
      version: '1.0.0',
      status: 'enabled',
      is_system: 0,
      sort_order: 7
    },
    {
      id: uuidv4(),
      name: '业绩统计',
      code: 'performance_management',
      description: '销售业绩、团队业绩统计分析',
      icon: 'el-icon-data-analysis',
      version: '1.0.0',
      status: 'enabled',
      is_system: 0,
      sort_order: 8
    },
    {
      id: uuidv4(),
      name: '商品管理',
      code: 'product_management',
      description: '商品信息、库存管理',
      icon: 'el-icon-goods',
      version: '1.0.0',
      status: 'enabled',
      is_system: 0,
      sort_order: 9
    }
  ];

  // 添加新模块
  let addedCount = 0;
  for (const module of newModules) {
    if (!existingCodes.includes(module.code)) {
      await conn.execute(
        `INSERT INTO modules (id, name, code, description, icon, version, status, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [module.id, module.name, module.code, module.description, module.icon, module.version, module.status, module.is_system, module.sort_order]
      );
      console.log(`✅ 已添加: ${module.name} (${module.code})`);
      addedCount++;
    } else {
      console.log(`⏭️  跳过: ${module.name} (${module.code}) - 已存在`);
    }
  }

  console.log(`\n共添加 ${addedCount} 个新模块\n`);

  // 显示所有模块
  const [allModules] = await conn.execute('SELECT name, code, is_system, sort_order FROM modules ORDER BY sort_order');
  console.log('完整模块列表:');
  allModules.forEach((m, index) => {
    const flag = m.is_system ? '🔒 系统模块' : '✅ 可禁用';
    console.log(`  ${index + 1}. ${m.name} (${m.code}): ${flag}`);
  });

  await conn.end();
  console.log('\n✅ 完成！');
}

addModules().catch(console.error);
