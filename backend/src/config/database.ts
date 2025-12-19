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
import { LogisticsCompany } from '../entities/LogisticsCompany';
import { MessageSubscription } from '../entities/MessageSubscription';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatusHistory } from '../entities/OrderStatusHistory';
import { ProductCategory } from '../entities/ProductCategory';
import { SystemConfig } from '../entities/SystemConfig';
import { UserPermission } from '../entities/UserPermission';
import { CustomerShare } from '../entities/CustomerShare';
import { PaymentMethodOption } from '../entities/PaymentMethodOption';
import { DepartmentOrderLimit } from '../entities/DepartmentOrderLimit';
import { FollowUp } from '../entities/FollowUp';
import { AfterSalesService } from '../entities/AfterSalesService';
import { ServiceFollowUp } from '../entities/ServiceFollowUp';
import { ServiceOperationLog } from '../entities/ServiceOperationLog';
import { NotificationChannel, NotificationLog } from '../entities/NotificationChannel';
import { Announcement, AnnouncementRead } from '../entities/Announcement';
import { SystemMessage } from '../entities/SystemMessage';
import { PerformanceReportConfig, PerformanceReportLog } from '../entities/PerformanceReportConfig';
import { LogisticsApiConfig } from '../entities/LogisticsApiConfig';
import { CustomerServicePermission } from '../entities/CustomerServicePermission';
import { SensitiveInfoPermission } from '../entities/SensitiveInfoPermission';
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
        logging: process.env.NODE_ENV === 'development',
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
          LogisticsCompany,
          MessageSubscription,
          OrderItem,
          OrderStatusHistory,
          ProductCategory,
          SystemConfig,
          UserPermission,
          CustomerShare,
          PaymentMethodOption,
          DepartmentOrderLimit,
          FollowUp,
          AfterSalesService,
          ServiceFollowUp,
          ServiceOperationLog,
          NotificationChannel,
          NotificationLog,
          Announcement,
          AnnouncementRead,
          SystemMessage,
          PerformanceReportConfig,
          PerformanceReportLog,
          LogisticsApiConfig,
          CustomerServicePermission,
          SensitiveInfoPermission
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
          LogisticsCompany,
          MessageSubscription,
          OrderItem,
          OrderStatusHistory,
          ProductCategory,
          SystemConfig,
          UserPermission,
          CustomerShare,
          PaymentMethodOption,
          DepartmentOrderLimit,
          FollowUp,
          AfterSalesService,
          ServiceFollowUp,
          ServiceOperationLog,
          NotificationChannel,
          NotificationLog,
          Announcement,
          AnnouncementRead,
          SystemMessage,
          PerformanceReportConfig,
          PerformanceReportLog,
          LogisticsApiConfig,
          CustomerServicePermission,
          SensitiveInfoPermission
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

    // 角色权限初始化已禁用 - 数据库中已有预设数据，无需自动初始化
    // 如需初始化，请手动执行 database/schema.sql 中的 INSERT 语句
    console.log('ℹ️ 角色权限初始化已禁用（使用数据库预设数据）');
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
