import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Department } from '../entities/Department';
import { Customer } from '../entities/Customer';
import { Product } from '../entities/Product';
import { ProductCategory } from '../entities/ProductCategory';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatusHistory } from '../entities/OrderStatusHistory';
import { OperationLog } from '../entities/OperationLog';
import { SystemConfig } from '../entities/SystemConfig';
import { MessageSubscription, DepartmentSubscriptionConfig } from '../entities/MessageSubscription';
import { LogisticsTracking } from '../entities/LogisticsTracking';
import { LogisticsTrace } from '../entities/LogisticsTrace';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { UserPermission } from '../entities/UserPermission';

export let AppDataSource: DataSource | null = null;

export const createDataSource = () => {
  if (!AppDataSource) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // 开发环境使用SQLite，生产环境使用MySQL
    const config = isDevelopment ? {
      type: 'sqlite' as const,
      database: 'database/crm_dev.sqlite',
      synchronize: true,
      logging: true,
    } : {
      type: 'mysql' as const,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm_system',
      synchronize: false,
      logging: false,
    };

    const baseConfig = {
      ...config,
      entities: [
        User,
        Department,
        Customer,
        Product,
        ProductCategory,
        Order,
        OrderItem,
        OrderStatusHistory,
        OperationLog,
        SystemConfig,
        MessageSubscription,
        DepartmentSubscriptionConfig,
        LogisticsTracking,
        LogisticsTrace,
        Role,
        Permission,
        UserPermission
      ],
      migrations: ['src/migrations/*.ts'],
      subscribers: ['src/subscribers/*.ts'],
    };

    // 只在MySQL环境下添加extra配置
    if (!isDevelopment) {
      (baseConfig as any).extra = {
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        // 字符集配置
        charset: 'utf8mb4_unicode_ci'
      };
    }

    AppDataSource = new DataSource(baseConfig);
  }
  return AppDataSource;
};

// 获取数据源实例
export const getDataSource = (): DataSource | null => {
  return AppDataSource;
};

// 初始化数据库连接
export const initializeDatabase = async (): Promise<void> => {
  try {
    const dataSource = createDataSource();
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');
    
    // 开发环境下同步数据库结构
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 开发环境：同步数据库结构...');
    }

    // 初始化角色和权限数据
    try {
      const { initRolesAndPermissions } = await import('../scripts/initRolesAndPermissions');
      await initRolesAndPermissions();
    } catch (initError) {
      console.warn('⚠️ 角色权限初始化失败:', initError);
      // 不抛出错误，允许应用继续启动
    }
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
};

// 关闭数据库连接
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
      AppDataSource = null;
      console.log('✅ 数据库连接已关闭');
    }
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
    throw error;
  }
};