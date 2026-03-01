/**
 * 检查并创建outsource_companies表（MySQL版本）
 */
const mysql = require('mysql2/promise');

async function checkAndCreateTable() {
  let connection;

  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'abc789',
      password: 'YtZWJPF2bpsCscHX',
      database: 'crm_local'
    });

    console.log('✅ 数据库连接成功\n');

    // 检查表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'outsource_companies'"
    );

    if (tables.length > 0) {
      console.log('✅ outsource_companies表已存在');

      // 查看表结构
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM outsource_companies"
      );
      console.log('\n表结构:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });

      // 查看数据
      const [rows] = await connection.query(
        "SELECT COUNT(*) as count FROM outsource_companies"
      );
      console.log(`\n数据条数: ${rows[0].count}`);

    } else {
      console.log('❌ outsource_companies表不存在，开始创建...\n');

      // 创建表
      const createTableSQL = `
        CREATE TABLE outsource_companies (
          id VARCHAR(50) NOT NULL COMMENT '公司ID',
          company_name VARCHAR(200) NOT NULL COMMENT '公司名称',
          contact_person VARCHAR(50) NULL COMMENT '联系人',
          contact_phone VARCHAR(20) NULL COMMENT '联系电话',
          contact_email VARCHAR(100) NULL COMMENT '联系邮箱',
          address VARCHAR(500) NULL COMMENT '公司地址',
          status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用',
          default_unit_price DECIMAL(10,2) DEFAULT 0 COMMENT '默认单价',
          is_default TINYINT DEFAULT 0 COMMENT '是否默认公司: 0-否, 1-是',
          sort_order INT DEFAULT 999 COMMENT '排序顺序',
          total_orders INT DEFAULT 0 COMMENT '总订单数',
          valid_orders INT DEFAULT 0 COMMENT '有效订单数',
          invalid_orders INT DEFAULT 0 COMMENT '无效订单数',
          total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
          settled_amount DECIMAL(12,2) DEFAULT 0 COMMENT '已结算金额',
          remark TEXT NULL COMMENT '备注',
          created_by VARCHAR(50) NULL COMMENT '创建人ID',
          created_by_name VARCHAR(50) NULL COMMENT '创建人姓名',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          PRIMARY KEY (id),
          KEY idx_company_name (company_name),
          KEY idx_status (status),
          KEY idx_created_at (created_at),
          KEY idx_sort_order (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司表'
      `;

      await connection.query(createTableSQL);
      console.log('✅ outsource_companies表创建成功');

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

      await connection.query(insertSQL);
      console.log('✅ 默认外包公司创建成功');

      console.log('\n✅ 表创建完成！');
    }

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n请检查数据库连接信息（用户名、密码）');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n数据库 crm_local 不存在');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndCreateTable();
