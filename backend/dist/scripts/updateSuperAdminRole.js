"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// 加载环境变量
dotenv_1.default.config();
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const Role_1 = require("../entities/Role");
async function updateSuperAdminRole() {
    try {
        console.log('正在初始化数据库连接...');
        const dataSource = (0, database_1.getDataSource)();
        if (!dataSource) {
            throw new Error('无法获取数据源');
        }
        await dataSource.initialize();
        const userRepository = dataSource.getRepository(User_1.User);
        const roleRepository = dataSource.getRepository(Role_1.Role);
        // 查找超级管理员用户
        const superAdminUser = await userRepository.findOne({
            where: { username: 'superadmin' },
            relations: ['roles']
        });
        if (!superAdminUser) {
            console.log('❌ 未找到超级管理员账号: superadmin');
            process.exit(1);
        }
        // 查找超级管理员角色
        const superAdminRole = await roleRepository.findOne({
            where: { code: 'super_admin' }
        });
        if (!superAdminRole) {
            console.log('❌ 未找到超级管理员角色: super_admin');
            console.log('请先运行角色权限初始化脚本: npm run init:roles');
            process.exit(1);
        }
        // 检查是否已经关联了超级管理员角色
        const hasRole = superAdminUser.roles?.some(role => role.code === 'super_admin');
        if (hasRole) {
            console.log('✅ 超级管理员账号已经正确关联了超级管理员角色');
        }
        else {
            // 关联超级管理员角色
            if (!superAdminUser.roles) {
                superAdminUser.roles = [];
            }
            superAdminUser.roles.push(superAdminRole);
            await userRepository.save(superAdminUser);
            console.log('✅ 已为超级管理员账号关联超级管理员角色');
        }
        console.log('');
        console.log('超级管理员账号信息:');
        console.log('  用户名: superadmin');
        console.log('  密码: super123456');
        console.log('  角色: 超级管理员');
        console.log('  关联角色数量:', superAdminUser.roles.length);
    }
    catch (error) {
        console.error('❌ 更新超级管理员角色失败:', error);
    }
    finally {
        process.exit(0);
    }
}
updateSuperAdminRole();
//# sourceMappingURL=updateSuperAdminRole.js.map