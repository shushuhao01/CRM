import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { User } from '../entities/User';

// 根据NODE_ENV环境变量加载对应配置文件
// 生产环境(production): 加载 .env
// 开发环境(development): 优先加载 .env.local，如果不存在则加载 .env
const isProduction = process.env.NODE_ENV === 'production';
let envFile = '.env';
if (!isProduction) {
  const localEnvPath = path.join(__dirname, '../../', '.env.local');
  if (fs.existsSync(localEnvPath)) {
    envFile = '.env.local';
  }
}
const envPath = path.join(__dirname, '../../', envFile);
dotenv.config({ path: envPath });

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
import { MessageReadStatus } from '../entities/MessageReadStatus';
import { PerformanceReportConfig, PerformanceReportLog } from '../entities/PerformanceReportConfig';
import { LogisticsApiConfig } from '../entities/LogisticsApiConfig';
import { CustomerServicePermission } from '../entities/CustomerServicePermission';
import { SensitiveInfoPermission } from '../entities/SensitiveInfoPermission';
import { PerformanceConfig } from '../entities/PerformanceConfig';
import { CommissionSetting } from '../entities/CommissionSetting';
import { CommissionLadder } from '../entities/CommissionLadder';
import { AdminUser } from '../entities/AdminUser';
import { License } from '../entities/License';
import { Version } from '../entities/Version';
import { LicenseLog } from '../entities/LicenseLog';
import { WecomConfig } from '../entities/WecomConfig';
import { WecomUserBinding } from '../entities/WecomUserBinding';
import { WecomCustomer } from '../entities/WecomCustomer';
import { WecomAcquisitionLink } from '../entities/WecomAcquisitionLink';
import { WecomServiceAccount } from '../entities/WecomServiceAccount';
import { WecomChatRecord } from '../entities/WecomChatRecord';
import { WecomPaymentRecord } from '../entities/WecomPaymentRecord';
import { CodCancelApplication } from '../entities/CodCancelApplication';
import { ValueAddedOrder } from '../entities/ValueAddedOrder';
import { ValueAddedPriceConfig } from '../entities/ValueAddedPriceConfig';
import { OutsourceCompany } from '../entities/OutsourceCompany';
import { ValueAddedStatusConfig } from '../entities/ValueAddedStatusConfig';

// 🔥 统一使用 MySQL 数据库（开发环境和生产环境）
// 数据库类型：默认使用 MySQL，除非明确指定其他类型
const dbType = process.env.DB_TYPE || 'mysql';

// 实体列表（统一管理）
const entities = [
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
  MessageReadStatus,
  PerformanceReportConfig,
  PerformanceReportLog,
  LogisticsApiConfig,
  CustomerServicePermission,
  SensitiveInfoPermission,
  PerformanceConfig,
  CommissionSetting,
  CommissionLadder,
  AdminUser,
  License,
  Version,
  LicenseLog,
  WecomConfig,
  WecomUserBinding,
  WecomCustomer,
  WecomAcquisitionLink,
  WecomServiceAccount,
  WecomChatRecord,
  WecomPaymentRecord,
  CodCancelApplication,
  ValueAddedOrder,
  ValueAddedPriceConfig,
  OutsourceCompany,
  ValueAddedStatusConfig
];

// MySQL 数据库配置（开发环境和生产环境统一使用）
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm',
  // 🔥 开发环境不自动同步，避免数据丢失
  synchronize: false,
  // 🔥 开发环境启用日志，生产环境关闭
  logging: process.env.NODE_ENV === 'development',
  // 🔥 统一使用北京时间
  timezone: '+08:00',
  // 🔥 字符集配置
  charset: process.env.DB_CHARSET || 'utf8mb4',
  // 连接池配置
  extra: {
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    // 连接超时时间（毫秒）
    connectTimeout: 60000,
    // 查询超时时间（毫秒）
    acquireTimeout: 60000,
    // 空闲连接超时时间（毫秒）
    timeout: 60000
  },
  entities,
  migrations: [],
  subscribers: []
});

// 导出 AppDataSource
export { AppDataSource };

// 获取数据源实例
export const getDataSource = (): DataSource | null => {
  return AppDataSource;
};

// 初始化数据库连接
export const initializeDatabase = async (): Promise<void> => {
  try {
    const dbInfo = {
      database: process.env.DB_DATABASE || 'crm',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '3306',
      user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      env: process.env.NODE_ENV || 'development'
    };

    console.log('� 正在连接 MySQL 数据库...');
    console.log(`   环境: ${dbInfo.env}`);
    console.log(`   数据库: ${dbInfo.database}`);
    console.log(`   地址: ${dbInfo.host}:${dbInfo.port}`);
    console.log(`   用户: ${dbInfo.user}`);

    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 提示：数据库结构变更需要手动执行迁移脚本
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️  开发环境：数据库结构变更请执行 database-migrations 目录下的迁移脚本');
    }

    // 角色权限初始化已禁用 - 数据库中已有预设数据，无需自动初始化
    console.log('ℹ️  角色权限使用数据库预设数据（不自动初始化）');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    console.error('   请检查以下配置:');
    console.error(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`   - DB_PORT: ${process.env.DB_PORT || '3306'}`);
    console.error(`   - DB_DATABASE: ${process.env.DB_DATABASE || 'crm'}`);
    console.error(`   - DB_USERNAME: ${process.env.DB_USERNAME || process.env.DB_USER || 'root'}`);
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
