import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User';

// 确保环境变量被加载
dotenv.config();
import { Customer } from '../entities/Customer';
import { Order } from '../entities/Order';
import { Product } from '../entities/Product';
import { Department } from '../entities/Department';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { CustomerGroup } from '../entities/CustomerGroup';
import { CustomerTag } from '../entities/CustomerTag';
import { LogisticsStatus } from '../entities/LogisticsStatus';
import { RejectionReason } from '../entities/RejectionReason';
import { ImprovementGoal } from '../entities/ImprovementGoal';
import { Call } from '../entities/Call';
import { Message } from '../entities/Message';
import { PerformanceMetric } from '../entities/PerformanceMetric';
import { Notification } from '../entities/Notification';
import { ServiceRecord } from '../entities/ServiceRecord';
import { SmsTemplate } from '../entities/SmsTemplate';
import { SmsRecord } from '../entities/SmsRecord';
import { Log } from '../entities/Log';
import { OperationLog } from '../entities/OperationLog';
import { LogisticsTrace } from '../entities/LogisticsTrace';
import { LogisticsTracking } from '../entities/LogisticsTracking';
import { MessageSubscription } from '../entities/MessageSubscription';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatusHistory } from '../entities/OrderStatusHistory';
import { ProductCategory } from '../entities/ProductCategory';
import { SystemConfig } from '../entities/SystemConfig';
import { UserPermission } from '../entities/UserPermission';
import path from 'path';

// 根据环境变量选择数据库配置
const dbType = process.env.DB_TYPE || (process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite');
const isProduction = process.env.NODE_ENV === 'production';

const AppDataSource = new DataSource(
  dbType === 'mysql'
    ? {
        // MySQL配置
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USERNAME || process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm',
        synchronize: false, // 生产环境不自动同步
        logging: false,
        entities: [
          User,
          Customer,
          Order,
          Product,
          Department,
          Role,
          Permission,
          CustomerGroup,
          CustomerTag,
          LogisticsStatus,
          RejectionReason,
          ImprovementGoal,
          Call,
          Message,
          PerformanceMetric,
          Notification,
          ServiceRecord,
          SmsTemplate,
          SmsRecord,
          Log,
          OperationLog,
          LogisticsTrace,
          LogisticsTracking,
          MessageSubscription,
          OrderItem,
          OrderStatusHistory,
          ProductCategory,
          SystemConfig,
          UserPermission
        ],
        migrations: [],
        subscribers: [],
      }
    : {
        // 开发环境使用SQLite
        type: 'sqlite',
        database: path.join(process.cwd(), 'data', 'crm.db'),
        synchronize: true,
        logging: false,
        entities: [
          User,
          Customer,
          Order,
          Product,
          Department,
          Role,
          Permission,
          CustomerGroup,
          CustomerTag,
          LogisticsStatus,
          RejectionReason,
          ImprovementGoal,
          Call,
          Message,
          PerformanceMetric,
          Notification,
          ServiceRecord,
          SmsTemplate,
          SmsRecord,
          Log,
          OperationLog,
          LogisticsTrace,
          LogisticsTracking,
          MessageSubscription,
          OrderItem,
          OrderStatusHistory,
          ProductCategory,
          SystemConfig,
          UserPermission
        ],
        migrations: [],
        subscribers: [],
      }
);

// 导出 AppDataSource
export { AppDataSource };

// 获取数据源实例
export const getDataSource = (): DataSource | null => {
  return AppDataSource;
};

// 初始化数据库连接
export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
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
      console.log('✅ 数据库连接已关闭');
    }
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
    throw error;
  }
};
