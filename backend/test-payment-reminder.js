/**
 * 测试支付提醒服务
 *
 * 功能:
 * 1. 测试待支付订单检查
 * 2. 测试支付提醒发送
 * 3. 测试超时订单关闭
 */

const { AppDataSource } = require('./dist/config/database');
const { paymentReminderService } = require('./dist/services/PaymentReminderService');

async function testPaymentReminder() {
  try {
    console.log('========================================');
    console.log('支付提醒服务测试');
    console.log('========================================\n');

    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✓ 数据库连接成功\n');
    }

    // 1. 测试待支付订单检查
    console.log('1. 测试待支付订单检查...');
    const reminderResult = await paymentReminderService.checkAndSendReminders();
    console.log('结果:', reminderResult);
    console.log('');

    // 2. 测试超时订单关闭
    console.log('2. 测试超时订单关闭...');
    const expiredResult = await paymentReminderService.checkAndHandleExpiredOrders();
    console.log('结果:', expiredResult);
    console.log('');

    // 3. 测试完整流程
    console.log('3. 测试完整流程...');
    await paymentReminderService.runFullCheck();
    console.log('');

    console.log('========================================');
    console.log('测试完成');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

testPaymentReminder();
