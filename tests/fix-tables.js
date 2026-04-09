const mysql = require(require('path').join(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));
async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'abc789', password: 'YtZWJPF2bpsCscHX', database: 'crm_local'
  });
  await conn.execute("CREATE TABLE IF NOT EXISTS service_follow_up_records (id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(36) NULL, service_id VARCHAR(50) NOT NULL, service_number VARCHAR(50) NULL, follow_up_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, content TEXT NOT NULL, created_by VARCHAR(100) NULL, created_by_id VARCHAR(50) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
  console.log('Created service_follow_up_records');
  await conn.execute("CREATE TABLE IF NOT EXISTS service_operation_logs (id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(36) NULL, service_id VARCHAR(50) NOT NULL, service_number VARCHAR(50) NULL, operation_type VARCHAR(50) NOT NULL, operation_content TEXT NULL, old_value VARCHAR(255) NULL, new_value VARCHAR(255) NULL, operator_id VARCHAR(50) NULL, operator_name VARCHAR(100) NULL, remark TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  console.log('Created service_operation_logs');
  await conn.execute("CREATE TABLE IF NOT EXISTS call_recordings (id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(36) NULL, call_id VARCHAR(50) NULL, customer_id VARCHAR(50) NULL, file_path VARCHAR(500) NULL, file_name VARCHAR(255) NULL, file_size BIGINT DEFAULT 0, duration INT DEFAULT 0, is_deleted TINYINT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
  console.log('Created call_recordings');
  await conn.execute("CREATE TABLE IF NOT EXISTS message_subscriptions (id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(36) NULL, event_type VARCHAR(100) NOT NULL, channel VARCHAR(50) NOT NULL DEFAULT 'system', is_enabled TINYINT DEFAULT 1, description TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
  console.log('Created message_subscriptions');
  await conn.end();
  console.log('Done');
}
run().catch(function(e) { console.error(e); });
