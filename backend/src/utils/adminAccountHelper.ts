/**
 * 管理员账号创建辅助工具
 * 用于统一创建租户/私有客户的默认管理员账号
 */
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * 系统管理部常量
 */
export const SYSTEM_DEPARTMENT = {
  NAME: '系统管理部',
  CODE: 'SYS_ADMIN',
  DESCRIPTION: '系统管理和维护部门'
};

/**
 * 生成默认密码
 * 符合复杂度要求：大写字母 + 小写字母 + 数字
 */
export const generateDefaultPassword = (): string => {
  return 'Aa123456';
};

/**
 * 密码加密
 * 使用 bcrypt 进行加密（与系统现有用户一致）
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  return hash;
};

/**
 * 创建系统管理部
 * @param tenantId 租户ID（SaaS租户），私有部署为null
 * @returns 部门ID
 */
export const createSystemDepartment = async (tenantId: string | null): Promise<string> => {
  try {
    // 检查是否已存在系统管理部
    let existing;
    if (tenantId) {
      existing = await AppDataSource.query(
        'SELECT id FROM departments WHERE name = ? AND tenant_id = ?',
        [SYSTEM_DEPARTMENT.NAME, tenantId]
      );
    } else {
      existing = await AppDataSource.query(
        'SELECT id FROM departments WHERE name = ? AND tenant_id IS NULL',
        [SYSTEM_DEPARTMENT.NAME]
      );
    }

    if (existing.length > 0) {
      console.log(`[AdminAccountHelper] 系统管理部已存在 (租户ID: ${tenantId || '私有部署'})`);
      return existing[0].id;
    }

    // 创建系统管理部
    const departmentId = `dept_sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await AppDataSource.query(
      `INSERT INTO departments (
        id, tenant_id, name, code, description,
        parent_id, manager_id, level, sort_order, status, member_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 1, 0, 'active', 0, ?, ?)`,
      [
        departmentId, tenantId, SYSTEM_DEPARTMENT.NAME, SYSTEM_DEPARTMENT.CODE,
        SYSTEM_DEPARTMENT.DESCRIPTION, now, now
      ]
    );

    console.log(`[AdminAccountHelper] ✅ 已创建系统管理部: ${departmentId} (租户ID: ${tenantId || '私有部署'})`);
    return departmentId;
  } catch (error) {
    console.error('[AdminAccountHelper] 创建系统管理部失败:', error);
    throw error;
  }
};

/**
 * 创建默认管理员账号
 * @param params 参数
 * @returns 账号密码信息
 */
export const createDefaultAdmin = async (params: {
  tenantId: string | null;  // SaaS租户ID，私有部署为null
  phone: string;            // 手机号（作为用户名）
  realName: string;         // 真实姓名
  email?: string;           // 邮箱（可选）
}): Promise<{ username: string; password: string; departmentId: string }> => {
  const { tenantId, phone, realName, email } = params;

  // 🔥 第一步：创建系统管理部
  const departmentId = await createSystemDepartment(tenantId);

  // 检查用户名是否已存在（同租户内唯一）
  let existing;
  if (tenantId) {
    existing = await AppDataSource.query(
      'SELECT id FROM users WHERE username = ? AND tenant_id = ?',
      [phone, tenantId]
    );
  } else {
    existing = await AppDataSource.query(
      'SELECT id FROM users WHERE username = ? AND tenant_id IS NULL',
      [phone]
    );
  }

  if (existing.length > 0) {
    console.warn(`[AdminAccountHelper] 用户名 ${phone} 已存在，跳过创建`);
    return { username: phone, password: generateDefaultPassword(), departmentId };
  }

  const userId = uuidv4();
  const password = generateDefaultPassword();
  const hash = await hashPassword(password);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // 🔥 第二步：创建管理员账号，归属到系统管理部
  await AppDataSource.query(
    `INSERT INTO users (
      id, tenant_id, username, password, name, real_name, phone, email,
      role, role_id, department_id, department_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'admin', ?, ?, 'active', ?, ?)`,
    [userId, tenantId, phone, hash, realName, realName, phone, email || null,
     departmentId, SYSTEM_DEPARTMENT.NAME, now, now]
  );

  console.log(`[AdminAccountHelper] ✅ 已创建管理员账号: ${phone} (租户ID: ${tenantId || '私有部署'}, 部门: ${SYSTEM_DEPARTMENT.NAME})`);
  return { username: phone, password, departmentId };
};

/**
 * 验证手机号格式
 */
export const validatePhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

