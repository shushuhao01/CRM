/**
 * WecomTokenService 单元测试
 * Phase 11: Token管理、缓存、双模式分支、错误提示
 */

// Mock dependencies before importing
jest.mock('axios')
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    query: jest.fn()
  }
}))
jest.mock('../../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

import axios from 'axios'
import { AppDataSource } from '../../config/database'
import { WecomTokenService } from '../../services/wecom/WecomTokenService'

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedAppDataSource = AppDataSource as jest.Mocked<typeof AppDataSource>

// 构造模拟 WecomConfig
function mockConfig(overrides: any = {}) {
  return {
    id: 1,
    corpId: 'ww_test_corp',
    corpSecret: 'test_corp_secret',
    authType: 'self_built',
    isEnabled: true,
    contactSecret: '',
    externalContactSecret: '',
    chatArchiveSecret: '',
    permanentCode: '',
    suiteId: '',
    ...overrides
  } as any
}

describe('WecomTokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 清除缓存
    WecomTokenService.clearCache()
  })

  // ==================== getAccessToken 自建应用模式 ====================

  describe('getAccessToken (self_built)', () => {
    test('自建应用模式 — 成功获取Token', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          errcode: 0,
          errmsg: 'ok',
          access_token: 'mock_access_token_123',
          expires_in: 7200
        }
      })

      const config = mockConfig()
      const token = await WecomTokenService.getAccessToken(config)

      expect(token).toBe('mock_access_token_123')
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/gettoken'),
        expect.objectContaining({
          params: { corpid: 'ww_test_corp', corpsecret: 'test_corp_secret' }
        })
      )
    })

    test('自建应用 — 缓存命中不再请求API', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 0, access_token: 'cached_token', expires_in: 7200 }
      })

      const config = mockConfig()
      const token1 = await WecomTokenService.getAccessToken(config)
      const token2 = await WecomTokenService.getAccessToken(config)

      expect(token1).toBe('cached_token')
      expect(token2).toBe('cached_token')
      // 只应调用一次HTTP请求
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    })

    test('自建应用 — API返回错误码 → 抛出带提示的错误', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 40001, errmsg: 'invalid credential' }
      })

      const config = mockConfig()
      await expect(WecomTokenService.getAccessToken(config)).rejects.toThrow(
        /invalid credential.*secret无效/
      )
    })

    test('自建应用 — corpSecret为空 → 抛出错误', async () => {
      const config = mockConfig({ corpSecret: '' })
      await expect(WecomTokenService.getAccessToken(config)).rejects.toThrow(
        /缺少.*Secret/
      )
    })
  })

  // ==================== getAccessToken contact/external/chat secret ====================

  describe('getAccessToken (secret types)', () => {
    test('contact类型 — 优先使用contactSecret', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 0, access_token: 'contact_token', expires_in: 7200 }
      })

      const config = mockConfig({ contactSecret: 'my_contact_secret' })
      await WecomTokenService.getAccessToken(config, 'contact')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({ corpsecret: 'my_contact_secret' })
        })
      )
    })

    test('contact类型 — 无contactSecret时回退到corpSecret', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 0, access_token: 'fallback_token', expires_in: 7200 }
      })

      const config = mockConfig({ contactSecret: '' })
      await WecomTokenService.getAccessToken(config, 'contact')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({ corpsecret: 'test_corp_secret' })
        })
      )
    })

    test('chat类型 — 优先使用chatArchiveSecret', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 0, access_token: 'chat_token', expires_in: 7200 }
      })

      const config = mockConfig({ chatArchiveSecret: 'my_chat_secret' })
      await WecomTokenService.getAccessToken(config, 'chat')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({ corpsecret: 'my_chat_secret' })
        })
      )
    })

    test('external类型 — 3级回退: externalContactSecret → contactSecret → corpSecret', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 0, access_token: 'ext_token', expires_in: 7200 }
      })

      // 都为空 → 回退到corpSecret
      const config = mockConfig({ externalContactSecret: '', contactSecret: '' })
      await WecomTokenService.getAccessToken(config, 'external')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({ corpsecret: 'test_corp_secret' })
        })
      )
    })
  })

  // ==================== getAccessToken 第三方应用模式 ====================

  describe('getAccessToken (third_party)', () => {
    test('第三方应用 — 缺少permanentCode → 抛错', async () => {
      const config = mockConfig({ authType: 'third_party', permanentCode: '' })
      await expect(WecomTokenService.getAccessToken(config)).rejects.toThrow(
        /永久授权码/
      )
    })
  })

  // ==================== clearCache ====================

  describe('clearCache', () => {
    test('清除全部缓存', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 0, access_token: 'token_1', expires_in: 7200 }
      })

      const config = mockConfig()
      await WecomTokenService.getAccessToken(config)
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)

      // 清除缓存
      WecomTokenService.clearCache()

      // 再次获取应再调用API
      await WecomTokenService.getAccessToken(config)
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })

    test('按corpId清除缓存', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode: 0, access_token: 'token_2', expires_in: 7200 }
      })

      const config = mockConfig()
      await WecomTokenService.getAccessToken(config)
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)

      // 清除指定corpId缓存
      WecomTokenService.clearCache('ww_test_corp')

      await WecomTokenService.getAccessToken(config)
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })
  })

  // ==================== handleCancelAuth ====================

  describe('handleCancelAuth', () => {
    test('取消授权 — 更新配置状态', async () => {
      const mockSave = jest.fn()
      const mockFindOne = jest.fn().mockResolvedValue({
        id: 1,
        corpId: 'ww_cancel_test',
        isEnabled: true,
        connectionStatus: 'connected',
        permanentCode: 'some_code'
      })

      ;(mockedAppDataSource.getRepository as jest.Mock).mockReturnValue({
        findOne: mockFindOne,
        save: mockSave
      })

      await WecomTokenService.handleCancelAuth('ww_cancel_test')

      expect(mockFindOne).toHaveBeenCalled()
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          isEnabled: false,
          connectionStatus: 'cancelled',
          permanentCode: ''
        })
      )
    })

    test('取消授权 — 配置不存在则静默', async () => {
      const mockFindOne = jest.fn().mockResolvedValue(null)
      const mockSave = jest.fn()

      ;(mockedAppDataSource.getRepository as jest.Mock).mockReturnValue({
        findOne: mockFindOne,
        save: mockSave
      })

      // 不应抛错
      await WecomTokenService.handleCancelAuth('ww_nonexistent')
      expect(mockSave).not.toHaveBeenCalled()
    })
  })

  // ==================== 错误码提示 ====================

  describe('错误码提示', () => {
    test.each([
      [40001, 'secret无效'],
      [40013, 'corpid无效'],
      [60020, 'IP不在白名单'],
    ])('错误码 %i → 包含提示 "%s"', async (errcode, hint) => {
      mockedAxios.get.mockResolvedValue({
        data: { errcode, errmsg: 'error' }
      })

      const config = mockConfig()
      await expect(WecomTokenService.getAccessToken(config)).rejects.toThrow(
        new RegExp(hint)
      )
    })
  })
})

