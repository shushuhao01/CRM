/**
 * 工具函数单元测试
 * 测试 dateFormat 的日期格式化函数
 */
import { formatDateTime, formatDate } from '../utils/dateFormat';

describe('formatDateTime', () => {
  test('格式化 Date 对象为完整日期时间', () => {
    const date = new Date(2026, 3, 1, 14, 30, 45); // 2026-04-01 14:30:45
    const result = formatDateTime(date);
    expect(result).toBe('2026-04-01 14:30:45');
  });

  test('格式化日期字符串', () => {
    const result = formatDateTime('2026-04-01T14:30:45.000Z');
    expect(result).toBeTruthy();
    // 应包含日期部分
    expect(result).toContain('2026-04-0');
  });

  test('不显示秒数', () => {
    const date = new Date(2026, 3, 1, 14, 30, 45);
    const result = formatDateTime(date, false);
    expect(result).toBe('2026-04-01 14:30');
  });

  test('传入 null 返回空字符串', () => {
    expect(formatDateTime(null)).toBe('');
  });

  test('传入 undefined 返回空字符串', () => {
    expect(formatDateTime(undefined)).toBe('');
  });

  test('传入无效日期字符串返回空字符串', () => {
    expect(formatDateTime('invalid-date')).toBe('');
  });

  test('月和日个位数时补零', () => {
    const date = new Date(2026, 0, 5, 3, 7, 9); // 2026-01-05 03:07:09
    const result = formatDateTime(date);
    expect(result).toBe('2026-01-05 03:07:09');
  });
});

describe('formatDate', () => {
  test('格式化 Date 对象为日期', () => {
    const date = new Date(2026, 3, 1, 14, 30, 45);
    const result = formatDate(date);
    expect(result).toBe('2026-04-01');
  });

  test('格式化日期字符串', () => {
    const result = formatDate('2026-12-25');
    expect(result).toContain('2026-12-25');
  });

  test('传入 null 返回空字符串', () => {
    expect(formatDate(null)).toBe('');
  });

  test('传入 undefined 返回空字符串', () => {
    expect(formatDate(undefined)).toBe('');
  });

  test('传入无效日期返回空字符串', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

