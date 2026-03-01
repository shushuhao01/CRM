const mysql = require('mysql2/promise');

async function deleteTiers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('连接数据库成功');

    // 查看当前档位
    const [before] = await connection.query('SELECT id, tier_name, company_id FROM value_added_price_config');
    console.log('\n删除前的档位列表:');
    console.table(before);

    // 删除测试档位
    const [result] = await connection.query(`
      DELETE FROM value_added_price_config
      WHERE tier_name IN ('标准档位', '11', '第一档', '测试档位')
        OR tier_name LIKE '%测试%'
        OR tier_name LIKE '%test%'
    `);

    console.log('\n删除结果:', result.affectedRows, '条记录被删除');

    // 查看删除后的档位
    const [after] = await connection.query('SELECT id, tier_name, company_id FROM value_added_price_config');
    console.log('\n删除后的档位列表:');
    console.table(after);

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await connection.end();
  }
}

deleteTiers();
