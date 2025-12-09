#!/usr/bin/env node
"use strict";
/**
 * CRM系统数据库连接测试脚本
 * 用于验证数据库配置和连接状态
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabase = main;
const typeorm_1 = require("typeorm");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });
// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    title: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`)
};
/**
 * 获取数据库配置
 */
function getDatabaseConfig() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'crm_system',
        charset: process.env.DB_CHARSET || 'utf8mb4',
        timezone: process.env.DB_TIMEZONE || '+08:00'
    };
    return config;
}
/**
 * 创建数据源
 */
function createDataSource(config) {
    return new typeorm_1.DataSource({
        type: 'mysql',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        charset: config.charset,
        timezone: config.timezone,
        synchronize: false,
        logging: false,
        connectTimeout: 10000,
        acquireTimeout: 10000
    });
}
/**
 * 测试数据库连接
 */
async function testConnection(dataSource) {
    try {
        await dataSource.initialize();
        log.success('数据库连接成功');
        // 测试查询
        const result = await dataSource.query('SELECT 1 as test');
        if (result && result[0] && result[0].test === 1) {
            log.success('数据库查询测试通过');
            return true;
        }
        else {
            log.error('数据库查询测试失败');
            return false;
        }
    }
    catch (error) {
        log.error(`数据库连接失败: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}
/**
 * 检查数据库版本
 */
async function checkDatabaseVersion(dataSource) {
    try {
        const result = await dataSource.query('SELECT VERSION() as version');
        const version = result[0]?.version;
        if (version) {
            log.info(`MySQL版本: ${version}`);
            // 检查版本兼容性
            const majorVersion = parseInt(version.split('.')[0]);
            if (majorVersion >= 8) {
                log.success('MySQL版本兼容 (8.0+)');
            }
            else if (majorVersion >= 5) {
                log.warning('MySQL版本较旧，建议升级到8.0+');
            }
            else {
                log.error('MySQL版本过旧，可能存在兼容性问题');
            }
        }
    }
    catch (error) {
        log.error(`获取数据库版本失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 检查数据库表
 */
async function checkTables(dataSource) {
    try {
        const tables = await dataSource.query('SHOW TABLES');
        log.info(`数据库表数量: ${tables.length}`);
        if (tables.length === 0) {
            log.warning('数据库中没有表，请运行数据库初始化脚本');
            return;
        }
        // 检查关键表
        const tableNames = tables.map((table) => Object.values(table)[0]);
        const requiredTables = ['users', 'departments', 'customers', 'products', 'orders'];
        log.info('检查关键表:');
        for (const tableName of requiredTables) {
            if (tableNames.includes(tableName)) {
                log.success(`✓ ${tableName}`);
            }
            else {
                log.error(`✗ ${tableName} (缺失)`);
            }
        }
        // 检查用户表数据
        try {
            const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
            const count = userCount[0]?.count || 0;
            log.info(`用户表记录数: ${count}`);
            if (count === 0) {
                log.warning('用户表为空，请确保已导入初始数据');
            }
        }
        catch (error) {
            log.error('无法查询用户表');
        }
    }
    catch (error) {
        log.error(`检查数据库表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * 主函数
 */
async function main() {
    log.title('==========================================');
    log.title('    CRM系统数据库连接测试');
    log.title('==========================================');
    console.log();
    // 检查环境变量
    log.info('检查环境配置...');
    const config = getDatabaseConfig();
    log.info('数据库配置:');
    console.log(`  主机: ${config.host}`);
    console.log(`  端口: ${config.port}`);
    console.log(`  用户: ${config.username}`);
    console.log(`  数据库: ${config.database}`);
    console.log(`  字符集: ${config.charset}`);
    console.log(`  时区: ${config.timezone}`);
    console.log();
    // 创建数据源
    const dataSource = createDataSource(config);
    try {
        // 测试连接
        log.info('测试数据库连接...');
        const connected = await testConnection(dataSource);
        if (!connected) {
            log.error('数据库连接失败，请检查配置');
            process.exit(1);
        }
        // 重新初始化用于后续测试
        await dataSource.initialize();
        // 检查数据库版本
        log.info('检查数据库版本...');
        await checkDatabaseVersion(dataSource);
        console.log();
        // 检查数据库表
        log.info('检查数据库表结构...');
        await checkTables(dataSource);
        console.log();
        log.title('==========================================');
        log.success('数据库测试完成！');
        log.title('==========================================');
    }
    catch (error) {
        log.error(`测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}
// 运行测试
if (require.main === module) {
    main().catch((error) => {
        console.error('测试脚本执行失败:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=testDatabase.js.map