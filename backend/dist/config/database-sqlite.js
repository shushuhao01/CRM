"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.initializeDatabase = initializeDatabase;
exports.backupDatabase = backupDatabase;
exports.restoreDatabase = restoreDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 获取数据库路径
function getDatabasePath() {
    // 在开发环境中使用项目目录
    if (process.env.NODE_ENV === 'development') {
        const dbDir = path_1.default.join(__dirname, '../../data');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        return path_1.default.join(dbDir, 'crm.db');
    }
    // 在生产环境中使用用户数据目录
    const { app } = require('electron');
    const userDataPath = app.getPath('userData');
    const dbDir = path_1.default.join(userDataPath, 'data');
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    return path_1.default.join(dbDir, 'crm.db');
}
// 数据库配置
exports.dbConfig = {
    filename: getDatabasePath(),
    driver: sqlite3_1.default.Database
};
// 数据库连接实例
let db = null;
// 获取数据库连接
async function getDatabase() {
    if (!db) {
        db = await (0, sqlite_1.open)(exports.dbConfig);
        // 启用外键约束
        await db.exec('PRAGMA foreign_keys = ON');
        // 设置性能优化
        await db.exec('PRAGMA journal_mode = WAL');
        await db.exec('PRAGMA synchronous = NORMAL');
        await db.exec('PRAGMA cache_size = 1000');
        await db.exec('PRAGMA temp_store = MEMORY');
        console.log('SQLite数据库连接成功:', exports.dbConfig.filename);
    }
    return db;
}
// 关闭数据库连接
async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
        console.log('数据库连接已关闭');
    }
}
// 初始化数据库表结构
async function initializeDatabase() {
    const database = await getDatabase();
    // 用户表
    await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'user',
      status VARCHAR(20) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // 客户表
    await database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(100),
      company VARCHAR(100),
      address TEXT,
      source VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      assigned_to INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);
    // 产品表
    await database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10,2),
      cost DECIMAL(10,2),
      category VARCHAR(50),
      sku VARCHAR(50) UNIQUE,
      stock_quantity INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // 订单表
    await database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      payment_status VARCHAR(20) DEFAULT 'unpaid',
      payment_method VARCHAR(50),
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
    // 订单项表
    await database.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
    // 系统日志表
    await database.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id INTEGER,
      details TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
    // 创建索引
    await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
  `);
    // 插入默认管理员用户（如果不存在）
    const adminExists = await database.get('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await database.run(`
      INSERT INTO users (username, password, email, role, status)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', hashedPassword, 'admin@crm.com', 'admin', 'active']);
        console.log('默认管理员账户已创建: admin/admin123');
    }
    console.log('数据库表结构初始化完成');
}
// 数据库备份
async function backupDatabase(backupPath) {
    // 创建备份目录
    const backupDir = path_1.default.dirname(backupPath);
    if (!fs_1.default.existsSync(backupDir)) {
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    }
    // 执行备份 - 使用文件复制
    const sourcePath = getDatabasePath();
    fs_1.default.copyFileSync(sourcePath, backupPath);
    console.log('数据库备份完成:', backupPath);
}
// 数据库恢复
async function restoreDatabase(backupPath) {
    if (!fs_1.default.existsSync(backupPath)) {
        throw new Error('备份文件不存在');
    }
    // 关闭当前连接
    await closeDatabase();
    // 复制备份文件到当前数据库位置
    fs_1.default.copyFileSync(backupPath, exports.dbConfig.filename);
    // 重新连接数据库
    await getDatabase();
    console.log('数据库恢复完成');
}
//# sourceMappingURL=database-sqlite.js.map