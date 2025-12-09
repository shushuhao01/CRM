"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_1 = require("../config/database");
const newRolesAndPermissions_1 = require("./newRolesAndPermissions");
const logger_1 = require("../config/logger");
async function main() {
    try {
        logger_1.logger.info('🚀 开始执行新的权限配置...');
        // 初始化数据库连接
        if (!database_1.AppDataSource?.isInitialized) {
            await database_1.AppDataSource?.initialize();
            logger_1.logger.info('✅ 数据库连接已建立');
        }
        // 执行新的权限配置
        await (0, newRolesAndPermissions_1.initNewRolesAndPermissions)();
        logger_1.logger.info('🎉 新的权限配置执行完成！');
    }
    catch (error) {
        logger_1.logger.error('❌ 执行失败:', error);
        process.exit(1);
    }
    finally {
        if (database_1.AppDataSource?.isInitialized) {
            await database_1.AppDataSource?.destroy();
            logger_1.logger.info('📦 数据库连接已关闭');
        }
    }
}
main();
//# sourceMappingURL=runNewPermissions.js.map