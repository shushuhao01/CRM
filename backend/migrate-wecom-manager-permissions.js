/**
 * 迁移脚本：为 department_manager 角色添加企微获客助手和活码管理权限
 * 同时为活码表添加 created_by 和 created_by_name 字段
 *
 * 执行方式: cd backend && node migrate-wecom-manager-permissions.js
 */
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const WECOM_MANAGER_PERMISSIONS = [
  'wecom', 'wecom.acquisition', 'wecom.acquisition.view', 'wecom.acquisition.create',
  'wecom.acquisition.edit', 'wecom.acquisition.delete',
  'wecom.contact_way', 'wecom.contact_way.view', 'wecom.contact_way.create',
  'wecom.contact_way.edit', 'wecom.contact_way.delete'
];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  console.log('=== 1. 为活码表添加 created_by 和 created_by_name 字段 ===');
  try {
    await conn.query(`ALTER TABLE wecom_contact_ways ADD COLUMN created_by VARCHAR(50) NULL COMMENT '创建人ID' AFTER is_enabled`);
    console.log('  ✅ 添加 created_by 字段成功');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('  ⏭️ created_by 字段已存在');
    else throw e;
  }
  try {
    await conn.query(`ALTER TABLE wecom_contact_ways ADD COLUMN created_by_name VARCHAR(100) NULL COMMENT '创建人姓名' AFTER created_by`);
    console.log('  ✅ 添加 created_by_name 字段成功');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('  ⏭️ created_by_name 字段已存在');
    else throw e;
  }
  try {
    await conn.query(`ALTER TABLE wecom_contact_ways ADD INDEX idx_created_by (created_by)`);
    console.log('  ✅ 添加 created_by 索引成功');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') console.log('  ⏭️ created_by 索引已存在');
    else throw e;
  }

  console.log('\n=== 2. 为 department_manager 角色添加企微权限 ===');
  const [rows] = await conn.query("SELECT permissions FROM roles WHERE code = 'department_manager'");
  if (rows.length === 0) {
    console.log('  ⚠️ department_manager 角色不存在，跳过');
  } else {
    let perms = rows[0].permissions;
    if (typeof perms === 'string') perms = JSON.parse(perms);
    if (!Array.isArray(perms)) perms = [];

    let added = 0;
    for (const p of WECOM_MANAGER_PERMISSIONS) {
      if (!perms.includes(p)) { perms.push(p); added++; }
    }

    if (added > 0) {
      await conn.query("UPDATE roles SET permissions = ? WHERE code = 'department_manager'", [JSON.stringify(perms)]);
      console.log(`  ✅ 已为 department_manager 添加 ${added} 个企微权限`);
    } else {
      console.log('  ⏭️ department_manager 已拥有所有企微权限');
    }
  }

  await conn.end();
  console.log('\n✅ 迁移完成！');
})().catch(e => { console.error('❌ 迁移失败:', e.message); process.exit(1); });

