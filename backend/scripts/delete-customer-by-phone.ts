/**
 * 通过手机号删除客户信息
 * 使用方法：
 * 1. 开发环境：npm run ts-node backend/scripts/delete-customer-by-phone.ts <手机号>
 * 2. 生产环境：cd backend && npx ts-node scripts/delete-customer-by-phone.ts <手机号>
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { Customer } from '../src/entities/Customer';
import { Order } from '../src/entities/Order';

async function deleteCustomerByPhone(phone: string) {
  try {
    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ 数据库连接成功');
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const orderRepository = AppDataSource.getRepository(Order);

    // 查找客户
    const customer = await customerRepository.findOne({
      where: { phone }
    });

    if (!customer) {
      console.log(`❌ 未找到手机号为 ${phone} 的客户`);
      process.exit(1);
    }

    console.log('\n找到客户信息：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`客户ID: ${customer.id}`);
    console.log(`客户姓名: ${customer.name}`);
    console.log(`手机号: ${customer.phone}`);
    console.log(`租户ID: ${customer.tenantId || '无'}`);
    console.log(`创建时间: ${customer.createdAt}`);
    console.log(`订单数量: ${customer.orderCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 检查是否有关联订单
    const orderCount = await orderRepository.count({
      where: { customerId: customer.id }
    });

    if (orderCount > 0) {
      console.log(`⚠️  警告：该客户有 ${orderCount} 个关联订单`);
      console.log('删除客户将会导致订单数据出现问题！');
      console.log('\n建议操作：');
      console.log('1. 先删除或转移该客户的所有订单');
      console.log('2. 或者将客户状态设置为"已删除"而不是物理删除');
      console.log('\n如果确定要删除，请修改脚本中的 FORCE_DELETE 变量为 true');

      const FORCE_DELETE = false; // 改为 true 强制删除

      if (!FORCE_DELETE) {
        process.exit(1);
      }
    }

    // 确认删除
    console.log('⚠️  即将删除该客户，此操作不可恢复！');
    console.log('按 Ctrl+C 取消，或等待 5 秒后自动执行...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 执行删除
    await customerRepository.remove(customer);

    console.log('✅ 客户删除成功！');
    console.log(`已删除客户：${customer.name} (${phone})`);

  } catch (error) {
    console.error('❌ 删除失败:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// 获取命令行参数
const phone = process.argv[2];

if (!phone) {
  console.log('使用方法：');
  console.log('npm run ts-node backend/scripts/delete-customer-by-phone.ts <手机号>');
  console.log('\n示例：');
  console.log('npm run ts-node backend/scripts/delete-customer-by-phone.ts 13800138000');
  process.exit(1);
}

// 执行删除
deleteCustomerByPhone(phone);
