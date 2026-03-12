/**
 * 为销售员和部门经理角色添加通话管理权限
 * 只添加通话管理,不添加短信管理
 */

const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function addCallPermissions() {
  let connection

  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm_local'
    })

    console.log('✓ 数据库连接成功')

    // 通话管理权限列表
    const callPermissions = [
      'communication.call',
      'communication.call.view',
      'communication.call.make',
      'communication.call.record'
    ]

    // 要更新的角色 (销售员和部门经理)
    const roleCodes = ['sales_staff', 'department_manager']

    for (const roleCode of roleCodes) {
      console.log(`\n处理角色: ${roleCode}`)

      // 查询当前角色的权限
      const [roles] = await connection.execute(
        'SELECT id, code, name, permissions FROM roles WHERE code = ?',
        [roleCode]
      )

      if (roles.length === 0) {
        console.log(`  ⚠ 未找到角色: ${roleCode}`)
        continue
      }

      const role = roles[0]
      let permissions = []

      // 解析现有权限
      try {
        if (role.permissions) {
          permissions = typeof role.permissions === 'string'
            ? JSON.parse(role.permissions)
            : role.permissions
        }
      } catch (e) {
        console.log(`  ⚠ 权限解析失败,使用空数组`)
        permissions = []
      }

      console.log(`  当前权限数量: ${permissions.length}`)

      // 检查是否已有通话管理权限
      const hasCallPermission = permissions.some(p => p === 'communication.call')

      if (hasCallPermission) {
        console.log(`  ✓ 已有通话管理权限,跳过`)
        continue
      }

      // 添加通话管理权限
      const newPermissions = [...permissions, ...callPermissions]

      // 更新数据库
      await connection.execute(
        'UPDATE roles SET permissions = ? WHERE id = ?',
        [JSON.stringify(newPermissions), role.id]
      )

      console.log(`  ✓ 成功添加通话管理权限`)
      console.log(`  新权限数量: ${newPermissions.length}`)
    }

    // 验证结果
    console.log('\n=== 验证结果 ===')
    const [results] = await connection.execute(`
      SELECT
        code AS roleCode,
        name AS roleName,
        JSON_LENGTH(permissions) AS permissionCount,
        CASE
          WHEN JSON_SEARCH(permissions, 'one', 'communication.call') IS NOT NULL THEN '✓ 已添加'
          ELSE '✗ 未添加'
        END AS callPermissionStatus
      FROM roles
      WHERE code IN ('sales_staff', 'department_manager')
    `)

    console.table(results)

    console.log('\n✓ 权限添加完成!')
    console.log('\n📝 注意: 用户需要重新登录才能看到新权限')

  } catch (error) {
    console.error('✗ 执行失败:', error.message)
    throw error
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n✓ 数据库连接已关闭')
    }
  }
}

// 执行脚本
addCallPermissions().catch(error => {
  console.error('脚本执行失败:', error)
  process.exit(1)
})
