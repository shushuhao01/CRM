"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.initializeDatabase = exports.getDataSource = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../entities/User");
// 确保环境变量被加载
dotenv_1.default.config();
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
const PerformanceReportConfig_1 = require("../entities/PerformanceReportConfig");
const LogisticsApiConfig_1 = require("../entities/LogisticsApiConfig");
const CustomerServicePermission_1 = require("../entities/CustomerServicePermission");
const path_1 = __importDefault(require("path"));
// 根据环境变量选择数据库配置
const dbType = process.env.DB_TYPE || (process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite');
const isProduction = process.env.NODE_ENV === 'production';
const AppDataSource = new typeorm_1.DataSource(dbType === 'mysql'
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
            PerformanceReportConfig_1.PerformanceReportConfig,
            PerformanceReportConfig_1.PerformanceReportLog,
            LogisticsApiConfig_1.LogisticsApiConfig,
            CustomerServicePermission_1.CustomerServicePermission
        ],
        migrations: [],
        subscribers: [],
    }
    : {
        // 开发环境使用SQLite
        type: 'sqlite',
        database: path_1.default.join(process.cwd(), 'data', 'crm.db'),
        synchronize: true,
        logging: false,
        entities: [
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
            PerformanceReportConfig_1.PerformanceReportConfig,
            PerformanceReportConfig_1.PerformanceReportLog,
            LogisticsApiConfig_1.LogisticsApiConfig,
            CustomerServicePermission_1.CustomerServicePermission
        ],
        migrations: [],
        subscribers: [],
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
        await AppDataSource.initialize();
        console.log('✅ 数据库连接成功');
        // 开发环境下同步数据库结构
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 开发环境：同步数据库结构...');
        }
        // 角色权限初始化已禁用 - 数据库中已有预设数据，无需自动初始化
        // 如需初始化，请手动执行 database/schema.sql 中的 INSERT 语句
        console.log('ℹ️ 角色权限初始化已禁用（使用数据库预设数据）');
    }
    catch (error) {
        console.error('❌ 数据库连接失败:', error);
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