import { getDataSource } from '../config/database'
import { Role } from '../entities/Role'
import { Permission } from '../entities/Permission'

// 确保使用开发环境配置
process.env.NODE_ENV = 'development'

async function updateMenuPermissions() {
  const AppDataSource = getDataSource()
  
  if (!AppDataSource) {
    throw new Error('无法获取数据源')
  }
  
  try {
    await AppDataSource.initialize()
    console.log('数据库连接成功')

    // 新增的权限列表
    const newPermissions = [
      // 客户管理新增权限
      { code: 'customer:groups', name: '客户分组管理', description: '管理客户分组' },
      { code: 'customer:tags', name: '客户标签管理', description: '管理客户标签' },
      
      // 服务管理新增权限
      { code: 'service:sms', name: '短信管理', description: '管理短信发送和模板' },
      
      // 物流管理新增权限
      { code: 'logistics:shipping', name: '发货列表', description: '查看和管理发货列表' },
      { code: 'logistics:status', name: '物流状态更新', description: '更新物流状态' },
      { code: 'logistics:companies', name: '物流公司管理', description: '管理物流公司信息' },
      
      // 资料管理新增权限
      { code: 'data:list', name: '资料列表', description: '查看资料列表' },
      { code: 'data:recycle', name: '回收站', description: '管理回收站中的资料' },
      
      // 商品管理新增权限
      { code: 'product:analytics', name: '商品分析', description: '查看商品分析数据' },
      
      // 系统管理新增权限
      { code: 'system:settings', name: '系统设置', description: '管理系统设置' }
    ]

    const permissionRepository = AppDataSource.getRepository(Permission)
    const roleRepository = AppDataSource.getRepository(Role)

    // 1. 创建或更新权限
    console.log('正在创建/更新权限...')
    for (const permData of newPermissions) {
      let permission = await permissionRepository.findOne({
        where: { code: permData.code }
      })

      if (!permission) {
        permission = permissionRepository.create({
          code: permData.code,
          name: permData.name,
          description: permData.description,
          module: permData.code.split(':')[0], // 从code中提取模块名
          status: 'active'
        })
        await permissionRepository.save(permission)
        console.log(`✅ 创建权限: ${permData.name} (${permData.code})`)
      } else {
        console.log(`ℹ️  权限已存在: ${permData.name} (${permData.code})`)
      }
    }

    // 2. 获取超级管理员角色
    const superAdminRole = await roleRepository.findOne({
      where: { code: 'super_admin' },
      relations: ['permissions']
    })

    if (!superAdminRole) {
      console.error('❌ 未找到超级管理员角色')
      return
    }

    console.log(`找到超级管理员角色: ${superAdminRole.name}`)

    // 3. 获取所有权限
    const allPermissions = await permissionRepository.find()
    console.log(`数据库中共有 ${allPermissions.length} 个权限`)

    // 4. 为超级管理员分配所有权限
    superAdminRole.permissions = allPermissions
    await roleRepository.save(superAdminRole)

    console.log('✅ 超级管理员角色权限更新完成')
    console.log(`超级管理员现在拥有 ${allPermissions.length} 个权限`)

    // 5. 验证超级管理员权限
    const updatedSuperAdmin = await roleRepository.findOne({
      where: { code: 'super_admin' },
      relations: ['permissions']
    })

    console.log('\n=== 超级管理员权限验证 ===')
    console.log(`角色名称: ${updatedSuperAdmin?.name}`)
    console.log(`权限数量: ${updatedSuperAdmin?.permissions?.length}`)
    
    // 检查新增权限是否都已分配
    const newPermissionCodes = newPermissions.map(p => p.code)
    const assignedPermissionCodes = updatedSuperAdmin?.permissions?.map(p => p.code) || []
    
    console.log('\n=== 新增权限检查 ===')
    for (const code of newPermissionCodes) {
      const isAssigned = assignedPermissionCodes.includes(code)
      console.log(`${isAssigned ? '✅' : '❌'} ${code}: ${isAssigned ? '已分配' : '未分配'}`)
    }

    console.log('\n✅ 菜单权限更新完成！')

  } catch (error) {
    console.error('❌ 更新菜单权限时出错:', error)
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy()
    }
  }
}

// 运行脚本
updateMenuPermissions()