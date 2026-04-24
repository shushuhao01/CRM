/**
 * 添加企业微信管理模块到modules表
 * 运行: cd backend && node add-wecom-module.js
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME || process.env.DB_USER || 'abc789',
      password: process.env.DB_PASSWORD || 'YtZWJPF2bpsCscHX',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm_local'
    });

    console.log('✅ 数据库连接成功');

    // 检查 wecom_management 模块是否已存在
    const [existing] = await connection.query(
      "SELECT id, code, name, status FROM modules WHERE code = 'wecom_management'"
    );

    if (existing.length > 0) {
      console.log('⚠️  wecom_management 模块已存在:', existing[0]);
      console.log('   状态:', existing[0].status);
      // 确保它是启用状态 + 名称为"企微管理"
      const needUpdate = existing[0].status !== 'enabled' || existing[0].name !== '企微管理';
      if (needUpdate) {
        await connection.query(
          "UPDATE modules SET status = 'enabled', name = '企微管理' WHERE code = 'wecom_management'"
        );
        console.log('✅ 已将 wecom_management 模块状态更新为 enabled，名称更新为"企微管理"');
      }
    } else {
      // 获取当前最大排序号
      const [maxSort] = await connection.query(
        'SELECT MAX(sort_order) as max_sort FROM modules'
      );
      const nextSort = (maxSort[0].max_sort || 0) + 1;

      const moduleId = uuidv4();
      await connection.query(
        `INSERT INTO modules (id, name, code, description, icon, version, status, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          moduleId,
          '企微管理',
          'wecom_management',
          '企业微信集成管理，包括企微应用配置、客户同步、会话存档等功能',
          'ChatLineSquare',
          '1.0.0',
          'enabled',
          false,
          nextSort
        ]
      );
      console.log('✅ 成功添加 wecom_management 模块');
      console.log('   ID:', moduleId);
      console.log('   排序:', nextSort);
    }

    // 列出所有模块
    const [allModules] = await connection.query(
      'SELECT code, name, status, sort_order FROM modules ORDER BY sort_order ASC'
    );
    console.log('\n📋 当前所有模块:');
    allModules.forEach((m, i) => {
      console.log(`   ${i + 1}. [${m.status === 'enabled' ? '✅' : '❌'}] ${m.name} (${m.code}) - 排序:${m.sort_order}`);
    });

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main();

