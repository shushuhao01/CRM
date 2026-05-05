/**
 * roleUtils.ts 角色工具函数单元测试
 */
import { describe, test, expect } from 'vitest'
import {
  ROLE_NAME_MAP,
  ROLE_CODE_MAP,
  getRoleDisplayName,
  getRoleCode,
  getRoleTagType,
  getRoleOptions,
  isAdminRole,
  isSalesRole,
  isServiceRole,
  getRoleLevel,
} from '@/utils/roleUtils'

describe('getRoleDisplayName', () => {
  test('已知角色 → 中文名', () => {
    expect(getRoleDisplayName('super_admin')).toBe('超级管理员')
    expect(getRoleDisplayName('admin')).toBe('管理员')
    expect(getRoleDisplayName('department_manager')).toBe('部门经理')
    expect(getRoleDisplayName('sales_staff')).toBe('销售员')
    expect(getRoleDisplayName('customer_service')).toBe('客服')
  })
  test('未知角色 → 原值', () => {
    expect(getRoleDisplayName('unknown')).toBe('unknown')
  })
})

describe('getRoleCode', () => {
  test('中文 → 英文', () => {
    expect(getRoleCode('超级管理员')).toBe('super_admin')
    expect(getRoleCode('部门经理')).toBe('department_manager')
  })
  test('别名兼容', () => {
    expect(getRoleCode('系统管理员')).toBe('admin')
    expect(getRoleCode('经理')).toBe('department_manager')
    expect(getRoleCode('销售')).toBe('sales_staff')
    expect(getRoleCode('客服人员')).toBe('customer_service')
  })
  test('未知 → 原值', () => {
    expect(getRoleCode('xyz')).toBe('xyz')
  })
})

describe('getRoleTagType', () => {
  test('super_admin → danger', () => {
    expect(getRoleTagType('super_admin')).toBe('danger')
  })
  test('admin → warning', () => {
    expect(getRoleTagType('admin')).toBe('warning')
  })
  test('未知 → info', () => {
    expect(getRoleTagType('unknown')).toBe('info')
  })
})

describe('getRoleOptions', () => {
  test('返回所有角色选项', () => {
    const opts = getRoleOptions()
    expect(opts.length).toBe(Object.keys(ROLE_NAME_MAP).length)
    expect(opts[0]).toHaveProperty('value')
    expect(opts[0]).toHaveProperty('label')
  })
})

describe('isAdminRole', () => {
  test('super_admin → true', () => expect(isAdminRole('super_admin')).toBe(true))
  test('admin → true', () => expect(isAdminRole('admin')).toBe(true))
  test('sales_staff → false', () => expect(isAdminRole('sales_staff')).toBe(false))
})

describe('isSalesRole', () => {
  test('department_manager → true', () => expect(isSalesRole('department_manager')).toBe(true))
  test('sales_staff → true', () => expect(isSalesRole('sales_staff')).toBe(true))
  test('admin → false', () => expect(isSalesRole('admin')).toBe(false))
})

describe('isServiceRole', () => {
  test('customer_service → true', () => expect(isServiceRole('customer_service')).toBe(true))
  test('admin → false', () => expect(isServiceRole('admin')).toBe(false))
})

describe('getRoleLevel', () => {
  test('super_admin 最高(1)', () => expect(getRoleLevel('super_admin')).toBe(1))
  test('admin 次之(2)', () => expect(getRoleLevel('admin')).toBe(2))
  test('department_manager(3)', () => expect(getRoleLevel('department_manager')).toBe(3))
  test('sales_staff(4)', () => expect(getRoleLevel('sales_staff')).toBe(4))
  test('customer_service(4)', () => expect(getRoleLevel('customer_service')).toBe(4))
  test('未知 → 999', () => expect(getRoleLevel('xxx')).toBe(999))
})
