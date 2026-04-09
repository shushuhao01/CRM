/**
 * adminAccountHelper 单元测试
 * 测试密码生成、密码加密、手机号验证等纯函数
 * 注意：需要 mock 数据库相关依赖
 */

// Mock 所有外部依赖
jest.mock('../config/database', () => ({
  AppDataSource: { query: jest.fn(), getRepository: jest.fn() }
}))
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }))
jest.mock('../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

import { generateDefaultPassword, hashPassword, validatePhone, SYSTEM_DEPARTMENT } from '../utils/adminAccountHelper';
import bcrypt from 'bcryptjs';

describe('generateDefaultPassword', () => {
  test('返回默认密码字符串', () => {
    const password = generateDefaultPassword();
    expect(password).toBe('Aa123456');
  });

  test('密码包含大写字母', () => {
    const password = generateDefaultPassword();
    expect(/[A-Z]/.test(password)).toBe(true);
  });

  test('密码包含小写字母', () => {
    const password = generateDefaultPassword();
    expect(/[a-z]/.test(password)).toBe(true);
  });

  test('密码包含数字', () => {
    const password = generateDefaultPassword();
    expect(/[0-9]/.test(password)).toBe(true);
  });
});

describe('hashPassword', () => {
  test('返回加密后的密码', async () => {
    const hash = await hashPassword('TestPassword123');
    expect(hash).toBeTruthy();
    expect(hash).not.toBe('TestPassword123');
  });

  test('加密后的密码可以被 bcrypt 验证', async () => {
    const password = 'Aa123456';
    const hash = await hashPassword(password);
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  test('相同密码多次加密结果不同（因为盐值不同）', async () => {
    const hash1 = await hashPassword('Aa123456');
    const hash2 = await hashPassword('Aa123456');
    expect(hash1).not.toBe(hash2);
  });

  test('错误密码验证失败', async () => {
    const hash = await hashPassword('Aa123456');
    const isMatch = await bcrypt.compare('WrongPassword', hash);
    expect(isMatch).toBe(false);
  });
});

describe('validatePhone', () => {
  test('有效手机号返回 true', () => {
    expect(validatePhone('13800138000')).toBe(true);
    expect(validatePhone('15912345678')).toBe(true);
    expect(validatePhone('18600001111')).toBe(true);
    expect(validatePhone('17700009999')).toBe(true);
  });

  test('非1开头的号码返回 false', () => {
    expect(validatePhone('23800138000')).toBe(false);
    expect(validatePhone('03800138000')).toBe(false);
  });

  test('长度不足11位返回 false', () => {
    expect(validatePhone('1380013800')).toBe(false);
    expect(validatePhone('138001')).toBe(false);
  });

  test('长度超过11位返回 false', () => {
    expect(validatePhone('138001380001')).toBe(false);
  });

  test('包含字母返回 false', () => {
    expect(validatePhone('1380013800a')).toBe(false);
  });

  test('空字符串返回 false', () => {
    expect(validatePhone('')).toBe(false);
  });

  test('12开头的返回 false（非有效段）', () => {
    expect(validatePhone('12000000000')).toBe(false);
  });
});

describe('SYSTEM_DEPARTMENT 常量', () => {
  test('包含正确的部门名称', () => {
    expect(SYSTEM_DEPARTMENT.NAME).toBe('系统管理部');
  });

  test('包含正确的部门编码', () => {
    expect(SYSTEM_DEPARTMENT.CODE).toBe('SYS_ADMIN');
  });

  test('包含部门描述', () => {
    expect(SYSTEM_DEPARTMENT.DESCRIPTION).toBeTruthy();
  });
});
