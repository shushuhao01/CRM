/**
 * MemberService 会员服务单元测试
 * 覆盖 loginByPassword、loginByCode、setPassword、changePassword、
 *      updateProfile、getBills、maskPhone、selectToken 机制
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../middleware/memberAuth', () => ({
  generateMemberToken: jest.fn().mockReturnValue('mock-member-token')
}))
jest.mock('../../services/VerificationCodeService', () => ({
  verificationCodeService: {
    verifyCode: jest.fn(),
    canSendCode: jest.fn(),
    saveCode: jest.fn(),
  }
}))

import bcrypt from 'bcryptjs'
import { AppDataSource } from '../../config/database'
import { verificationCodeService } from '../../services/VerificationCodeService'

const mockQuery = AppDataSource.query as jest.Mock
const mockVerifyCode = verificationCodeService.verifyCode as jest.Mock

let memberService: any

beforeAll(async () => {
  const mod = await import('../../services/MemberService')
  memberService = mod.memberService
})

beforeEach(() => {
  jest.clearAllMocks()
  // logLogin 会调用 query，默认成功
  mockQuery.mockResolvedValue([])
})

describe('MemberService', () => {

  // ==================== loginByPassword ====================

  describe('loginByPassword', () => {
    it('手机号未注册 → 失败', async () => {
      mockQuery.mockResolvedValueOnce([]) // 查 tenants
      const result = await memberService.loginByPassword('13800000000', 'pass')
      expect(result.success).toBe(false)
      expect(result.message).toContain('未注册')
    })

    it('账号被禁用 → 失败', async () => {
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '测试', phone: '13800000000',
        password_hash: await bcrypt.hash('pass', 10), status: 'disabled'
      }])
      const result = await memberService.loginByPassword('13800000000', 'pass')
      expect(result.success).toBe(false)
      expect(result.message).toContain('禁用')
    })

    it('未设置密码 → 提示用验证码', async () => {
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '测试', phone: '13800000000',
        password_hash: null, status: 'active'
      }])
      const result = await memberService.loginByPassword('13800000000', 'pass')
      expect(result.success).toBe(false)
      expect(result.message).toContain('验证码')
    })

    it('密码错误 → 失败', async () => {
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '测试', phone: '13800000000',
        password_hash: await bcrypt.hash('correct', 10), status: 'active'
      }])
      const result = await memberService.loginByPassword('13800000000', 'wrong')
      expect(result.success).toBe(false)
      expect(result.message).toContain('密码错误')
    })

    it('密码正确 → 登录成功', async () => {
      const hash = await bcrypt.hash('pass123', 10)
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '测试公司', phone: '13800000000',
        password_hash: hash, status: 'active'
      }])
      // completeLogin: update last_login, logLogin
      mockQuery.mockResolvedValue([])

      const result = await memberService.loginByPassword('13800000000', 'pass123')
      expect(result.success).toBe(true)
      expect(result.data.token).toBe('mock-member-token')
      expect(result.data.tenantId).toBe('t1')
    })

    it('多租户 + 密码匹配一个 → 直接登录', async () => {
      const hash = await bcrypt.hash('pass123', 10)
      mockQuery.mockResolvedValueOnce([
        { id: 't1', code: 'T001', name: '公司A', phone: '13800000000', password_hash: hash, status: 'active' },
        { id: 't2', code: 'T002', name: '公司B', phone: '13800000000', password_hash: await bcrypt.hash('other', 10), status: 'active' },
      ])
      mockQuery.mockResolvedValue([])

      const result = await memberService.loginByPassword('13800000000', 'pass123')
      expect(result.success).toBe(true)
      expect(result.data.tenantId).toBe('t1')
    })

    it('多租户 + 密码全不匹配 → 密码错误', async () => {
      mockQuery.mockResolvedValueOnce([
        { id: 't1', code: 'T001', name: '公司A', phone: '13800000000', password_hash: await bcrypt.hash('a', 10), status: 'active' },
        { id: 't2', code: 'T002', name: '公司B', phone: '13800000000', password_hash: await bcrypt.hash('b', 10), status: 'active' },
      ])
      mockQuery.mockResolvedValue([])

      const result = await memberService.loginByPassword('13800000000', 'wrong')
      expect(result.success).toBe(false)
      expect(result.message).toContain('密码错误')
    })

    it('指定 tenantId → 精确查询', async () => {
      const hash = await bcrypt.hash('pass', 10)
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '公司', phone: '13800000000',
        password_hash: hash, status: 'active'
      }])
      mockQuery.mockResolvedValue([])

      const result = await memberService.loginByPassword('13800000000', 'pass', undefined, undefined, 't1')
      expect(result.success).toBe(true)
    })

    it('DB 异常 → 捕获返回失败', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB down'))
      const result = await memberService.loginByPassword('13800000000', 'pass')
      expect(result.success).toBe(false)
      expect(result.message).toContain('稍后重试')
    })
  })

  // ==================== loginByCode ====================

  describe('loginByCode', () => {
    it('验证码错误 → 失败', async () => {
      mockVerifyCode.mockResolvedValue({ valid: false, message: '验证码错误' })
      const result = await memberService.loginByCode('13800000000', '0000')
      expect(result.success).toBe(false)
    })

    it('验证码正确 + 单租户 → 登录成功', async () => {
      mockVerifyCode.mockResolvedValue({ valid: true })
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '公司', phone: '13800000000', status: 'active'
      }])
      mockQuery.mockResolvedValue([])

      const result = await memberService.loginByCode('13800000000', '1234')
      expect(result.success).toBe(true)
      expect(result.data.token).toBe('mock-member-token')
    })

    it('验证码正确 + 手机号未注册 → 失败', async () => {
      mockVerifyCode.mockResolvedValue({ valid: true })
      mockQuery.mockResolvedValueOnce([])

      const result = await memberService.loginByCode('13800000000', '1234')
      expect(result.success).toBe(false)
      expect(result.message).toContain('未注册')
    })

    it('账号禁用 → 失败', async () => {
      mockVerifyCode.mockResolvedValue({ valid: true })
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '公司', phone: '13800000000', status: 'disabled'
      }])

      const result = await memberService.loginByCode('13800000000', '1234')
      expect(result.success).toBe(false)
      expect(result.message).toContain('禁用')
    })
  })

  // ==================== setPassword ====================

  describe('setPassword', () => {
    it('验证码错误 → 失败', async () => {
      mockVerifyCode.mockResolvedValue({ valid: false, message: '已过期' })
      const result = await memberService.setPassword('13800000000', '0000', 'newpass')
      expect(result.success).toBe(false)
    })

    it('手机号未注册 → 失败', async () => {
      mockVerifyCode.mockResolvedValue({ valid: true })
      mockQuery.mockResolvedValueOnce([])
      const result = await memberService.setPassword('13800000000', '1234', 'newpass')
      expect(result.success).toBe(false)
      expect(result.message).toContain('未注册')
    })

    it('密码太短 → 失败', async () => {
      mockVerifyCode.mockResolvedValue({ valid: true })
      mockQuery.mockResolvedValueOnce([{ id: 't1' }])
      const result = await memberService.setPassword('13800000000', '1234', '12345')
      expect(result.success).toBe(false)
      expect(result.message).toContain('6位')
    })

    it('正常设置密码 → 成功', async () => {
      mockVerifyCode.mockResolvedValue({ valid: true })
      mockQuery.mockResolvedValueOnce([{ id: 't1' }])
      mockQuery.mockResolvedValueOnce([]) // UPDATE

      const result = await memberService.setPassword('13800000000', '1234', 'newpass123')
      expect(result.success).toBe(true)
    })
  })

  // ==================== changePassword ====================

  describe('changePassword', () => {
    it('账号不存在 → 失败', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await memberService.changePassword('t1', 'old', 'new123')
      expect(result.success).toBe(false)
      expect(result.message).toContain('不存在')
    })

    it('原密码错误 → 失败', async () => {
      mockQuery.mockResolvedValueOnce([{ password_hash: await bcrypt.hash('correct', 10) }])
      const result = await memberService.changePassword('t1', 'wrong', 'new123')
      expect(result.success).toBe(false)
      expect(result.message).toContain('原密码错误')
    })

    it('新密码太短 → 失败', async () => {
      mockQuery.mockResolvedValueOnce([{ password_hash: await bcrypt.hash('old', 10) }])
      const result = await memberService.changePassword('t1', 'old', '12345')
      expect(result.success).toBe(false)
      expect(result.message).toContain('6位')
    })

    it('修改成功', async () => {
      mockQuery.mockResolvedValueOnce([{ password_hash: await bcrypt.hash('old', 10) }])
      mockQuery.mockResolvedValueOnce([])

      const result = await memberService.changePassword('t1', 'old', 'newpass')
      expect(result.success).toBe(true)
    })
  })

  // ==================== updateProfile ====================

  describe('updateProfile', () => {
    it('无修改内容 → 失败', async () => {
      const result = await memberService.updateProfile('t1', {})
      expect(result.success).toBe(false)
      expect(result.message).toContain('没有')
    })

    it('修改 name → 成功', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await memberService.updateProfile('t1', { name: '新名称' })
      expect(result.success).toBe(true)
    })

    it('修改 email → 成功', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await memberService.updateProfile('t1', { email: 'a@b.com' })
      expect(result.success).toBe(true)
    })

    it('DB 异常 → 失败', async () => {
      mockQuery.mockRejectedValueOnce(new Error('fail'))
      const result = await memberService.updateProfile('t1', { name: 'x' })
      expect(result.success).toBe(false)
    })
  })

  // ==================== maskPhone ====================

  describe('maskPhone', () => {
    // maskPhone 是 private，通过 completeLogin 间接测试
    it('登录成功时返回脱敏手机号', async () => {
      const hash = await bcrypt.hash('pass', 10)
      mockQuery.mockResolvedValueOnce([{
        id: 't1', code: 'T001', name: '公司', phone: '13812345678',
        password_hash: hash, status: 'active'
      }])
      mockQuery.mockResolvedValue([])

      const result = await memberService.loginByPassword('13812345678', 'pass')
      expect(result.success).toBe(true)
      expect(result.data.phone).toBe('138****5678')
    })
  })

  // ==================== getBills ====================

  describe('getBills', () => {
    it('正常返回账单列表', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 'b1', order_no: 'ORD001', amount: 100, status: 'paid', created_at: new Date() }])
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ total_spent: 100 }])
        .mockResolvedValueOnce([]) // deduct logs

      const result = await memberService.getBills('t1', 1, 10)
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalSpent).toBe(100)
    })

    it('DB 异常 → 返回空', async () => {
      mockQuery.mockRejectedValue(new Error('fail'))
      const result = await memberService.getBills('t1')
      expect(result.list).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})
