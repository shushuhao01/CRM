require('dotenv').config({ path: '.env.local' });
const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './data/crm.db',
  synchronize: false,
  logging: false
});

async function checkOrdersFields() {
  try {
    await AppDataSource.initialize();

    console.log('orders 表完整字段列表：');
    console.log('='.repeat(80));

    const fields = await AppDataSource.query(`PRAGMA table_info(orders)`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.name} (${field.type}) ${field.notnull ? 'NOT NULL' : ''} ${field.dflt_value ? `DEFAULT ${field.dflt_value}` : ''}`);
    });

    console.log();
    console.log(`总共 ${fields.length} 个字段`);

    await AppDataSource.destroy();

  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkOrdersFields();
