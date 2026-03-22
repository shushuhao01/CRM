/**
 * 创建管理后台通知服务所需的数据库表
 */
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('已连接到数据库 crm_local');

  // 检查表是否存在
  const [tables] = await conn.query("SHOW TABLES LIKE 'admin_notification%'");
  console.log('已有通知相关表:', tables.length, '个');
  for (const t of tables) {
    console.log('  -', Object.values(t)[0]);
  }

  // 1. 创建 admin_notifications 表（通知历史记录）
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      event_type VARCHAR(50) NOT NULL,
      level ENUM('info','success','warning','error') DEFAULT 'info',
      is_read TINYINT(1) DEFAULT 0,
      related_id VARCHAR(36) DEFAULT NULL,
      related_type VARCHAR(50) DEFAULT NULL,
      extra_data JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_event_type (event_type),
      INDEX idx_is_read (is_read),
      INDEX idx_created_at (created_at),
      INDEX idx_level (level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知记录表'
  `);
  console.log('✅ admin_notifications 表已创建/已存在');

  // 2. 创建 admin_notification_channels 表（通知渠道配置）
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_notification_channels (
      id VARCHAR(36) PRIMARY KEY,
      channel_type VARCHAR(30) NOT NULL UNIQUE COMMENT '渠道类型: system/dingtalk/wecom/wechat_mp/email',
      name VARCHAR(50) NOT NULL COMMENT '渠道名称',
      is_enabled TINYINT(1) DEFAULT 0 COMMENT '是否启用',
      config_data JSON DEFAULT NULL COMMENT '渠道配置数据(JSON)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_channel_type (channel_type),
      INDEX idx_is_enabled (is_enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知渠道配置表'
  `);
  console.log('✅ admin_notification_channels 表已创建/已存在');

  // 3. 创建 admin_notification_rules 表（通知规则）
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_notification_rules (
      id VARCHAR(36) PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL COMMENT '事件类型',
      channel_type VARCHAR(30) NOT NULL COMMENT '渠道类型',
      is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_event_channel (event_type, channel_type),
      INDEX idx_event_type (event_type),
      INDEX idx_channel_type (channel_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知规则表'
  `);
  console.log('✅ admin_notification_rules 表已创建/已存在');

  // 4. 初始化默认渠道数据
  const [existingChannels] = await conn.query('SELECT COUNT(*) as cnt FROM admin_notification_channels');
  if (existingChannels[0].cnt === 0) {
    const { v4: uuidv4 } = require('uuid');
    const defaultChannels = [
      { type: 'system', name: '系统消息', enabled: 1, config: {} },
      { type: 'dingtalk', name: '钉钉机器人', enabled: 0, config: { webhook: '', secret: '' } },
      { type: 'wecom', name: '企业微信', enabled: 0, config: { webhook: '' } },
      { type: 'wechat_mp', name: '微信公众号', enabled: 0, config: { app_id: '', app_secret: '', template_id: '', openids: [] } },
      { type: 'email', name: '邮件通知', enabled: 0, config: { smtp_host: '', smtp_port: 465, username: '', password: '', from_name: 'CRM管理后台', to_emails: [] } }
    ];

    for (const ch of defaultChannels) {
      await conn.query(
        'INSERT INTO admin_notification_channels (id, channel_type, name, is_enabled, config_data) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), ch.type, ch.name, ch.enabled, JSON.stringify(ch.config)]
      );
    }
    console.log('✅ 已插入默认渠道配置数据（5条）');
  } else {
    console.log('ℹ️ 渠道配置已有数据，跳过初始化');
  }

  // 5. 初始化默认规则（所有事件默认开启系统消息渠道）
  const [existingRules] = await conn.query('SELECT COUNT(*) as cnt FROM admin_notification_rules');
  if (existingRules[0].cnt === 0) {
    const { v4: uuidv4 } = require('uuid');
    const eventTypes = [
      'tenant_registered', 'payment_created', 'payment_success',
      'payment_pending', 'payment_cancelled', 'license_expiring',
      'license_expired', 'tenant_login', 'system_error'
    ];
    const channelTypes = ['system', 'dingtalk', 'wecom', 'wechat_mp', 'email'];

    for (const et of eventTypes) {
      for (const ct of channelTypes) {
        const isEnabled = ct === 'system' ? 1 : 0; // 默认只开启系统消息
        await conn.query(
          'INSERT INTO admin_notification_rules (id, event_type, channel_type, is_enabled) VALUES (?, ?, ?, ?)',
          [uuidv4(), et, ct, isEnabled]
        );
      }
    }
    console.log('✅ 已插入默认通知规则（' + eventTypes.length * channelTypes.length + '条）');
  } else {
    console.log('ℹ️ 通知规则已有数据，跳过初始化');
  }

  // 验证
  const [finalTables] = await conn.query("SHOW TABLES LIKE 'admin_notification%'");
  console.log('\n最终通知相关表:');
  for (const t of finalTables) {
    const name = Object.values(t)[0];
    const [count] = await conn.query('SELECT COUNT(*) as cnt FROM ' + name);
    console.log('  ' + name + ': ' + count[0].cnt + ' 条记录');
  }

  await conn.end();
  console.log('\n✅ 数据库表创建完成！');
}

run().catch(e => {
  console.error('❌ 错误:', e.message);
  process.exit(1);
});

