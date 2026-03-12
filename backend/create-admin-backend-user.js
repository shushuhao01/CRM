/**
 * 创建Admin后台管理系统用户
 */

require('dotenv').config({ path: '.env.local' });
const { AppDataSource } = require('./dist/config/database');
const { AdminUser } = require('./dist/entities/AdminUser');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const adminRepo = AppDataSource.getRepository(AdminUser);

    // 检查是否已存在admin账号
    const existingAdmin = await adminRepo.findOne({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin后台账号已存在');
      console.log(`   用户名: ${existingAdmin.username}`);
      console.log(`   角色: ${existingAdmin.role}`);
      console.log(`   状态: ${existingAdmin.status}`);
      console.log(`   ID: ${existingAdmin.id}`);
      await AppDataSource.destroy();
      return;
    }

    // 创建新的admin账号
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = adminRepo.create({
      username: 'admin',
      password: hashedPassword,
      name: '超级管理员',
      email: 'admin@example.com',
      role: 'super_admin',
      status: 'active'
    });

    await adminRepo.save(adminUser);

    console.log('✅ Admin后台账号创建成功！');
    console.log('\n账号信息：');
    console.log(`   用户名: admin`);
    console.log(`   密码: admin123`);
    console.log(`   角色: super_admin`);
    console.log(`   ID: ${adminUser.id}`);
    console.log('\n⚠️  请妥善保管Admin账号信息！');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ 创建Admin后台账号失败:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

createAdminUser();
