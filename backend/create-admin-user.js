/**
 * 创建Admin测试账号
 *
 * 用于测试Admin后台功能
 */

require('dotenv').config({ path: '.env.local' });
const { AppDataSource } = require('./dist/config/database');
const { User } = require('./dist/entities/User');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createAdminUser() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const userRepo = AppDataSource.getRepository(User);

    // 检查是否已存在admin账号（仅查找无租户的admin用户）
    const existingAdmin = await userRepo.findOne({
      where: { username: 'admin', tenantId: null }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin账号已存在');
      console.log(`   用户名: ${existingAdmin.username}`);
      console.log(`   角色: ${existingAdmin.role}`);
      console.log(`   ID: ${existingAdmin.id}`);

      // 更新为admin角色（如果不是）
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await userRepo.save(existingAdmin);
        console.log('✅ 已更新为admin角色');
      }

      await AppDataSource.destroy();
      return;
    }

    // 创建新的admin账号
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = userRepo.create({
      id: uuidv4(),
      username: 'admin',
      password: hashedPassword,
      realName: '系统管理员',
      role: 'admin',
      status: 'active',
      tenantId: null // Admin账号不属于任何租户
    });

    await userRepo.save(adminUser);

    console.log('✅ Admin账号创建成功！');
    console.log('\n账号信息：');
    console.log(`   用户名: admin`);
    console.log(`   密码: admin123`);
    console.log(`   角色: admin`);
    console.log(`   ID: ${adminUser.id}`);
    console.log('\n⚠️  请妥善保管Admin账号信息！');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ 创建Admin账号失败:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

createAdminUser();
