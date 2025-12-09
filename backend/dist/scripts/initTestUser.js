"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// 加载环境变量 - 优先加载开发环境配置
dotenv_1.default.config({ path: '.env.development' });
dotenv_1.default.config(); // 加载默认配置作为备用
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const Department_1 = require("../entities/Department");
async function initTestUser() {
    try {
        console.log('正在初始化数据库连接...');
        const dataSource = (0, database_1.getDataSource)();
        if (!dataSource) {
            throw new Error('无法获取数据源');
        }
        await dataSource.initialize();
        const userRepository = dataSource.getRepository(User_1.User);
        const departmentRepository = dataSource.getRepository(Department_1.Department);
        // 创建默认部门（如果不存在）
        let adminDepartment = await departmentRepository.findOne({
            where: { name: '管理部' }
        });
        if (!adminDepartment) {
            adminDepartment = departmentRepository.create({
                name: '管理部',
                code: 'ADMIN',
                description: '系统管理部门'
            });
            await departmentRepository.save(adminDepartment);
            console.log('已创建管理部门');
        }
        // 检查是否已存在admin用户
        const existingAdmin = await userRepository.findOne({
            where: { username: 'admin' }
        });
        if (!existingAdmin) {
            // 创建管理员用户
            const hashedPassword = '$2a$12$TVl3t.lovkbJzvstu5OF1uqKmj0sdcwVTDfNXHulgL/Q2PJxTp4pO'; // admin123
            const adminUser = userRepository.create({
                username: 'admin',
                password: hashedPassword,
                realName: '系统管理员',
                email: 'admin@company.com',
                role: 'admin',
                status: 'active',
                departmentId: adminDepartment.id
            });
            await userRepository.save(adminUser);
            console.log('已创建管理员用户: admin / admin123');
        }
        else {
            console.log('管理员用户已存在');
        }
        // 创建其他部门
        let salesDepartment = await departmentRepository.findOne({
            where: { name: '销售部' }
        });
        if (!salesDepartment) {
            salesDepartment = departmentRepository.create({
                name: '销售部',
                code: 'SALES',
                description: '销售部门'
            });
            await departmentRepository.save(salesDepartment);
            console.log('已创建销售部门');
        }
        let serviceDepartment = await departmentRepository.findOne({
            where: { name: '客服部' }
        });
        if (!serviceDepartment) {
            serviceDepartment = departmentRepository.create({
                name: '客服部',
                code: 'SERVICE',
                description: '客服部门'
            });
            await departmentRepository.save(serviceDepartment);
            console.log('已创建客服部门');
        }
        const hashedPassword = '$2a$12$TVl3t.lovkbJzvstu5OF1uqKmj0sdcwVTDfNXHulgL/Q2PJxTp4pO'; // admin123
        // 创建测试用户列表
        const testUsers = [
            {
                username: 'manager',
                password: hashedPassword,
                realName: '部门经理',
                email: 'manager@company.com',
                role: 'manager',
                status: 'active',
                departmentId: salesDepartment.id
            },
            {
                username: 'sales001',
                password: hashedPassword,
                realName: '销售员001',
                email: 'sales001@company.com',
                role: 'sales',
                status: 'active',
                departmentId: salesDepartment.id
            },
            {
                username: 'service001',
                password: hashedPassword,
                realName: '客服员001',
                email: 'service001@company.com',
                role: 'service',
                status: 'active',
                departmentId: serviceDepartment.id
            }
        ];
        // 创建测试用户
        for (const userData of testUsers) {
            const existingUser = await userRepository.findOne({
                where: { username: userData.username }
            });
            if (!existingUser) {
                const user = userRepository.create(userData);
                await userRepository.save(user);
                console.log(`已创建测试用户: ${userData.username} / admin123`);
            }
            else {
                console.log(`用户 ${userData.username} 已存在`);
            }
        }
        console.log('测试用户初始化完成！');
    }
    catch (error) {
        console.error('初始化测试用户失败:', error);
    }
    finally {
        process.exit(0);
    }
}
initTestUser();
//# sourceMappingURL=initTestUser.js.map