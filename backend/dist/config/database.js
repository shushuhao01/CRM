"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.initializeDatabase = exports.getDataSource = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const User_1 = require("../entities/User");
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
dotenv_1.default.config({ path: envPath });
const Customer_1 = require("../entities/Customer");
const Order_1 = require("../entities/Order");
const Product_1 = require("../entities/Product");
const Department_1 = require("../entities/Department");
const Role_1 = require("../entities/Role");
const Permission_1 = require("../entities/Permission");
const CustomerGroup_1 = require("../entities/CustomerGroup");
const CustomerTag_1 = require("../entities/CustomerTag");
const LogisticsStatus_1 = require("../entities/LogisticsStatus");
const RejectionReason_1 = require("../entities/RejectionReason");
const ImprovementGoal_1 = require("../entities/ImprovementGoal");
const Call_1 = require("../entities/Call");
const Message_1 = require("../entities/Message");
const PerformanceMetric_1 = require("../entities/PerformanceMetric");
const Notification_1 = require("../entities/Notification");
const ServiceRecord_1 = require("../entities/ServiceRecord");
const SmsTemplate_1 = require("../entities/SmsTemplate");
const SmsRecord_1 = require("../entities/SmsRecord");
const Log_1 = require("../entities/Log");
const OperationLog_1 = require("../entities/OperationLog");
const LogisticsTrace_1 = require("../entities/LogisticsTrace");
const LogisticsTracking_1 = require("../entities/LogisticsTracking");
const LogisticsCompany_1 = require("../entities/LogisticsCompany");
const MessageSubscription_1 = require("../entities/MessageSubscription");
const OrderItem_1 = require("../entities/OrderItem");
const OrderStatusHistory_1 = require("../entities/OrderStatusHistory");
const ProductCategory_1 = require("../entities/ProductCategory");
const SystemConfig_1 = require("../entities/SystemConfig");
const UserPermission_1 = require("../entities/UserPermission");
const CustomerShare_1 = require("../entities/CustomerShare");
const PaymentMethodOption_1 = require("../entities/PaymentMethodOption");
const DepartmentOrderLimit_1 = require("../entities/DepartmentOrderLimit");
const FollowUp_1 = require("../entities/FollowUp");
const AfterSalesService_1 = require("../entities/AfterSalesService");
const ServiceFollowUp_1 = require("../entities/ServiceFollowUp");
const ServiceOperationLog_1 = require("../entities/ServiceOperationLog");
const NotificationChannel_1 = require("../entities/NotificationChannel");
const Announcement_1 = require("../entities/Announcement");
const SystemMessage_1 = require("../entities/SystemMessage");
const MessageReadStatus_1 = require("../entities/MessageReadStatus");
const PerformanceReportConfig_1 = require("../entities/PerformanceReportConfig");
const LogisticsApiConfig_1 = require("../entities/LogisticsApiConfig");
const CustomerServicePermission_1 = require("../entities/CustomerServicePermission");
const SensitiveInfoPermission_1 = require("../entities/SensitiveInfoPermission");
const PerformanceConfig_1 = require("../entities/PerformanceConfig");
const CommissionSetting_1 = require("../entities/CommissionSetting");
const CommissionLadder_1 = require("../entities/CommissionLadder");
const AdminUser_1 = require("../entities/AdminUser");
const License_1 = require("../entities/License");
const Version_1 = require("../entities/Version");
const LicenseLog_1 = require("../entities/LicenseLog");
const WecomConfig_1 = require("../entities/WecomConfig");
const WecomUserBinding_1 = require("../entities/WecomUserBinding");
const WecomCustomer_1 = require("../entities/WecomCustomer");
const WecomAcquisitionLink_1 = require("../entities/WecomAcquisitionLink");
const WecomServiceAccount_1 = require("../entities/WecomServiceAccount");
const WecomChatRecord_1 = require("../entities/WecomChatRecord");
const WecomPaymentRecord_1 = require("../entities/WecomPaymentRecord");
const CodCancelApplication_1 = require("../entities/CodCancelApplication");
// 🔥 统一使用 MySQL 数据库（开发环境和生产环境）
// 数据库类型：默认使用 MySQL，除非明确指定其他类型
const dbType = process.env.DB_TYPE || 'mysql';
// 实体列表（统一管理）
const entities = [
    User_1.User,
    Customer_1.Customer,
    Order_1.Order,
    Product_1.Product,
    Department_1.Department,
    Role_1.Role,
    Permission_1.Permission,
    CustomerGroup_1.CustomerGroup,
    CustomerTag_1.CustomerTag,
    LogisticsStatus_1.LogisticsStatus,
    RejectionReason_1.RejectionReason,
    ImprovementGoal_1.ImprovementGoal,
    Call_1.Call,
    Message_1.Message,
    PerformanceMetric_1.PerformanceMetric,
    Notification_1.Notification,
    ServiceRecord_1.ServiceRecord,
    SmsTemplate_1.SmsTemplate,
    SmsRecord_1.SmsRecord,
    Log_1.Log,
    OperationLog_1.OperationLog,
    LogisticsTrace_1.LogisticsTrace,
    LogisticsTracking_1.LogisticsTracking,
    LogisticsCompany_1.LogisticsCompany,
    MessageSubscription_1.MessageSubscription,
    OrderItem_1.OrderItem,
    OrderStatusHistory_1.OrderStatusHistory,
    ProductCategory_1.ProductCategory,
    SystemConfig_1.SystemConfig,
    UserPermission_1.UserPermission,
    CustomerShare_1.CustomerShare,
    PaymentMethodOption_1.PaymentMethodOption,
    DepartmentOrderLimit_1.DepartmentOrderLimit,
    FollowUp_1.FollowUp,
    AfterSalesService_1.AfterSalesService,
    ServiceFollowUp_1.ServiceFollowUp,
    ServiceOperationLog_1.ServiceOperationLog,
    NotificationChannel_1.NotificationChannel,
    NotificationChannel_1.NotificationLog,
    Announcement_1.Announcement,
    Announcement_1.AnnouncementRead,
    SystemMessage_1.SystemMessage,
    MessageReadStatus_1.MessageReadStatus,
    PerformanceReportConfig_1.PerformanceReportConfig,
    PerformanceReportConfig_1.PerformanceReportLog,
    LogisticsApiConfig_1.LogisticsApiConfig,
    CustomerServicePermission_1.CustomerServicePermission,
    SensitiveInfoPermission_1.SensitiveInfoPermission,
    PerformanceConfig_1.PerformanceConfig,
    CommissionSetting_1.CommissionSetting,
    CommissionLadder_1.CommissionLadder,
    AdminUser_1.AdminUser,
    License_1.License,
    Version_1.Version,
    LicenseLog_1.LicenseLog,
    WecomConfig_1.WecomConfig,
    WecomUserBinding_1.WecomUserBinding,
    WecomCustomer_1.WecomCustomer,
    WecomAcquisitionLink_1.WecomAcquisitionLink,
    WecomServiceAccount_1.WecomServiceAccount,
    WecomChatRecord_1.WecomChatRecord,
    WecomPaymentRecord_1.WecomPaymentRecord,
    CodCancelApplication_1.CodCancelApplication
];
// MySQL 数据库配置（开发环境和生产环境统一使用）
const AppDataSource = new typeorm_1.DataSource({
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
exports.AppDataSource = AppDataSource;
// 获取数据源实例
const getDataSource = () => {
    return AppDataSource;
};
exports.getDataSource = getDataSource;
// 初始化数据库连接
const initializeDatabase = async () => {
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
    }
    catch (error) {
        console.error('❌ 数据库连接失败:', error);
        console.error('   请检查以下配置:');
        console.error(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
        console.error(`   - DB_PORT: ${process.env.DB_PORT || '3306'}`);
        console.error(`   - DB_DATABASE: ${process.env.DB_DATABASE || 'crm'}`);
        console.error(`   - DB_USERNAME: ${process.env.DB_USERNAME || process.env.DB_USER || 'root'}`);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
// 关闭数据库连接
const closeDatabase = async () => {
    try {
        if (AppDataSource?.isInitialized) {
            await AppDataSource.destroy();
            console.log('✅ 数据库连接已关闭');
        }
    }
    catch (error) {
        console.error('❌ 关闭数据库连接失败:', error);
        throw error;
    }
};
exports.closeDatabase = closeDatabase;
//# sourceMappingURL=database.js.map