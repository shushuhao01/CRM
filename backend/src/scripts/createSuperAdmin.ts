import dotenv from 'dotenv';
// 加载环境变量 - 优先加载开发环境配置
dotenv.config({ path: '.env.development' });
dotenv.config(); // 加载默认配置作为备用

import { getDataSource } from '../config/database';
import { User } from '../entities/User';
import { Department } from '../entities/Department';
import { Role } from '../entities/Role';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
  try {
    console.log('正在初始化数据库连接...');
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new Error('无法获取数据源');
    }
    await dataSource.initialize();
    
    const userRepository = dataSource.getRepository(User);
    const departmentRepository = dataSource.getRepository(Department);
    const roleRepository = dataSource.getRepository(Role);

    // 确保管理部门存在
    let adminDepartment = await departmentRepository.findOne({
      where: { name: '管理部' }
    });

    if (!adminDepartment) {
      adminDepartment = departmentRepository.create({
        name: '管理部',
        code: 'ADMIN',
        description: '系统管理部门'
      });
      await departmentRepository.save(adminDepartment);
      console.log('已创建管理部门');
    }

    // 确保超级管理员角色存在
    let superAdminRole = await roleRepository.findOne({
      where: { code: 'super_admin' }
    });

    if (!superAdminRole) {
      console.log('警告: 超级管理员角色不存在，请先运行角色权限初始化脚本');
      console.log('运行命令: npm run init:roles');
      process.exit(1);
    }

    // 检查是否已存在超级管理员用户
    const existingSuperAdmin = await userRepository.findOne({
      where: { username: 'superadmin' }
    });

    if (existingSuperAdmin) {
      console.log('超级管理员账号已存在: superadmin');
      console.log('如需重置密码，请手动删除该用户后重新运行此脚本');
      process.exit(0);
    }

    // 创建超级管理员用户
    const hashedPassword = await bcrypt.hash('super123456', 12);
    
    const superAdminUser = userRepository.create({
      username: 'superadmin',
      password: hashedPassword,
      realName: '超级管理员',
      email: 'superadmin@company.com',
      role: 'admin', // 注意：这里使用 admin，但会通过角色关联设置为超级管理员
      status: 'active' as const,
      departmentId: adminDepartment.id
    });

    // 先保存用户
    const savedUser = await userRepository.save(superAdminUser);
    
    // 然后关联角色
    savedUser.roles = [superAdminRole];
    await userRepository.save(savedUser);
    console.log('✅ 超级管理员账号创建成功！');
    console.log('账号信息:');
    console.log('  用户名: superadmin');
    console.log('  密码: super123456');
    console.log('  角色: 超级管理员');
    console.log('  邮箱: superadmin@company.com');
    console.log('');
    console.log('⚠️  请在首次登录后立即修改密码！');
    
  } catch (error) {
    console.error('❌ 创建超级管理员失败:', error);
  } finally {
    process.exit(0);
  }
}

// 添加确认提示
console.log('即将创建超级管理员账号...');
console.log('账号信息:');
console.log('  用户名: superadmin');
console.log('  密码: super123456');
console.log('  角色: 超级管理员');
console.log('');

createSuperAdmin();