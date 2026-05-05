/**
 * permission.ts 权限验证工具单元测试
 */
import { describe, test, expect, beforeEach } from 'vitest'
import {
  setUserPermissions,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasButtonPermission,
} from '@/utils/permission'

beforeEach(() => {
  setUserPermissions([])
})

describe('setUserPermissions / getUserPermissions', () => {
  test('设置后可获取', () => {
    setUserPermissions(['a', 'b'])
    expect(getUserPermissions()).toEqual(['a', 'b'])
  })
  test('默认空数组', () => {
    expect(getUserPermissions()).toEqual([])
  })
})

describe('hasPermission', () => {
  test('空权限码 → true', () => {
    expect(hasPermission('')).toBe(true)
  })
  test('超级管理员 * → 全部通过', () => {
    setUserPermissions(['*'])
    expect(hasPermission('any_code')).toBe(true)
  })
  test('admin 角色 → 全部通过', () => {
    setUserPermissions(['admin'])
    expect(hasPermission('any_code')).toBe(true)
  })
  test('system 角色 → 全部通过', () => {
    setUserPermissions(['system'])
    expect(hasPermission('any_code')).toBe(true)
  })
  test('直接拥有权限 → true', () => {
    setUserPermissions(['customer:view', 'order:edit'])
    expect(hasPermission('customer:view')).toBe(true)
    expect(hasPermission('order:edit')).toBe(true)
  })
  test('未拥有权限 → false', () => {
    setUserPermissions(['customer:view'])
    expect(hasPermission('order:delete')).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  test('拥有其中一个 → true', () => {
    setUserPermissions(['a', 'b'])
    expect(hasAnyPermission(['a', 'c'])).toBe(true)
  })
  test('都不拥有 → false', () => {
    setUserPermissions(['x'])
    expect(hasAnyPermission(['a', 'b'])).toBe(false)
  })
  test('空数组 → false (every on empty)', () => {
    setUserPermissions(['a'])
    // some on empty array returns false
    expect(hasAnyPermission([])).toBe(false)
  })
})

describe('hasAllPermissions', () => {
  test('全部拥有 → true', () => {
    setUserPermissions(['a', 'b', 'c'])
    expect(hasAllPermissions(['a', 'b'])).toBe(true)
  })
  test('缺少一个 → false', () => {
    setUserPermissions(['a'])
    expect(hasAllPermissions(['a', 'b'])).toBe(false)
  })
  test('空数组 → true (every on empty)', () => {
    expect(hasAllPermissions([])).toBe(true)
  })
})

describe('hasButtonPermission', () => {
  test('带 menuCode → 拼接权限码', () => {
    setUserPermissions(['order:edit'])
    expect(hasButtonPermission('edit', 'order')).toBe(true)
    expect(hasButtonPermission('delete', 'order')).toBe(false)
  })
  test('不带 menuCode → 直接检查', () => {
    setUserPermissions(['edit'])
    expect(hasButtonPermission('edit')).toBe(true)
  })
})
