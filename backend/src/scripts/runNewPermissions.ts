import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { initNewRolesAndPermissions } from './newRolesAndPermissions';
import { logger } from '../config/logger';

async function main() {
  try {
    logger.info('🚀 开始执行新的权限配置...');
    
    // 初始化数据库连接
    if (!AppDataSource?.isInitialized) {
      await AppDataSource?.initialize();
      logger.info('✅ 数据库连接已建立');
    }

    // 执行新的权限配置
    await initNewRolesAndPermissions();
    
    logger.info('🎉 新的权限配置执行完成！');
  } catch (error) {
    logger.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    if (AppDataSource?.isInitialized) {
      await AppDataSource?.destroy();
      logger.info('📦 数据库连接已关闭');
    }
  }
}

main();