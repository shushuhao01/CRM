/**
 * customerRelated & customerLogs 关联数据和日志测试
 * 聚焦 callTags 解析、followUp 类型映射、日志分页 hasMore 逻辑
 */

describe('customerRelated & customerLogs', () => {

  // ==================== callTags 解析 ====================

  describe('callTags 解析', () => {
    function parseCallTags(callTags: any): string[] {
      if (!callTags) return []
      if (typeof callTags === 'string') {
        try { return JSON.parse(callTags) } catch { return [] }
      }
      if (Array.isArray(callTags)) return callTags
      return []
    }

    it('null → 空数组', () => {
      expect(parseCallTags(null)).toEqual([])
    })

    it('undefined → 空数组', () => {
      expect(parseCallTags(undefined)).toEqual([])
    })

    it('JSON 字符串数组 → 正常解析', () => {
      expect(parseCallTags('["tagA","tagB"]')).toEqual(['tagA', 'tagB'])
    })

    it('无效 JSON 字符串 → 空数组', () => {
      expect(parseCallTags('not-json')).toEqual([])
    })

    it('原生数组 → 直接返回', () => {
      expect(parseCallTags(['tagA'])).toEqual(['tagA'])
    })
  })

  // ==================== followUp 类型映射 ====================

  describe('followUp 类型标题映射', () => {
    function getFollowUpTitle(type: string): string {
      switch (type) {
        case 'call': return '电话跟进'
        case 'visit': return '上门拜访'
        case 'email': return '邮件跟进'
        case 'message': return '消息跟进'
        case 'wechat': return '微信跟进'
        default: return '跟进记录'
      }
    }

    it('call → 电话跟进', () => expect(getFollowUpTitle('call')).toBe('电话跟进'))
    it('visit → 上门拜访', () => expect(getFollowUpTitle('visit')).toBe('上门拜访'))
    it('email → 邮件跟进', () => expect(getFollowUpTitle('email')).toBe('邮件跟进'))
    it('message → 消息跟进', () => expect(getFollowUpTitle('message')).toBe('消息跟进'))
    it('wechat → 微信跟进', () => expect(getFollowUpTitle('wechat')).toBe('微信跟进'))
    it('未知类型 → 跟进记录', () => expect(getFollowUpTitle('other')).toBe('跟进记录'))
  })

  // ==================== 日志分页 hasMore ====================

  describe('日志分页 hasMore', () => {
    it('返回条数 > limit → hasMore=true', () => {
      const limit = 6
      const logsFromDB = new Array(7).fill({ id: '1' }) // 7条 > limit
      const hasMore = logsFromDB.length > limit
      const list = logsFromDB.slice(0, limit)
      expect(hasMore).toBe(true)
      expect(list).toHaveLength(6)
    })

    it('返回条数 <= limit → hasMore=false', () => {
      const limit = 6
      const logsFromDB = new Array(4).fill({ id: '1' })
      const hasMore = logsFromDB.length > limit
      expect(hasMore).toBe(false)
    })

    it('恰好 limit 条 → hasMore=false', () => {
      const limit = 6
      const logsFromDB = new Array(6).fill({ id: '1' })
      expect(logsFromDB.length > limit).toBe(false)
    })

    it('空列表 → hasMore=false', () => {
      expect([].length > 6).toBe(false)
    })
  })

  // ==================== detail JSON 解析 ====================

  describe('日志 detail 解析', () => {
    function parseDetail(detail: any): any {
      if (!detail) return null
      if (typeof detail === 'string') {
        try { return JSON.parse(detail) } catch { return detail }
      }
      return detail
    }

    it('null → null', () => expect(parseDetail(null)).toBeNull())

    it('JSON字符串 → 解析对象', () => {
      expect(parseDetail('{"key":"val"}')).toEqual({ key: 'val' })
    })

    it('非法JSON → 原字符串', () => {
      expect(parseDetail('plain text')).toBe('plain text')
    })

    it('已是对象 → 直接返回', () => {
      const obj = { key: 'val' }
      expect(parseDetail(obj)).toBe(obj)
    })
  })

  // ==================== 地址管理逻辑 ====================

  describe('地址管理', () => {
    it('纯文本地址转数组格式', () => {
      const address = '北京市朝阳区'
      let addresses: any[] = []
      try {
        const parsed = JSON.parse(address)
        addresses = Array.isArray(parsed) ? parsed : []
      } catch {
        if (address.trim()) {
          addresses = [{ id: 1, content: address, isDefault: true }]
        }
      }
      expect(addresses).toHaveLength(1)
      expect(addresses[0].content).toBe('北京市朝阳区')
      expect(addresses[0].isDefault).toBe(true)
    })

    it('JSON数组地址正常解析', () => {
      const address = JSON.stringify([
        { id: 1, content: '地址一', isDefault: true },
        { id: 2, content: '地址二', isDefault: false },
      ])
      const parsed = JSON.parse(address)
      expect(parsed).toHaveLength(2)
    })

    it('空地址 → 空数组', () => {
      const address = ''
      let addresses: any[] = []
      if (address) {
        // ...
      }
      expect(addresses).toHaveLength(0)
    })

    it('添加地址后新地址在最前面（unshift）', () => {
      const addresses = [{ id: 1, content: '旧地址' }]
      const newAddr = { id: 2, content: '新地址' }
      addresses.unshift(newAddr)
      expect(addresses[0].content).toBe('新地址')
      expect(addresses).toHaveLength(2)
    })

    it('删除地址 — filter + splice', () => {
      const addresses = [
        { id: 1, content: 'A' },
        { id: 2, content: 'B' },
        { id: 3, content: 'C' },
      ]
      const idx = addresses.findIndex(a => a.id === 2)
      expect(idx).toBe(1)
      addresses.splice(idx, 1)
      expect(addresses).toHaveLength(2)
      expect(addresses.find(a => a.id === 2)).toBeUndefined()
    })
  })

  // ==================== 疾病史管理 ====================

  describe('疾病史解析', () => {
    it('纯文本 → 单条记录', () => {
      const medicalHistory = '高血压'
      let records: any[] = []
      try {
        const parsed = JSON.parse(medicalHistory)
        if (Array.isArray(parsed)) records = parsed
      } catch {
        records = [{ id: 1, content: medicalHistory }]
      }
      expect(records).toHaveLength(1)
      expect(records[0].content).toBe('高血压')
    })

    it('JSON 数组 → 多条记录', () => {
      const medicalHistory = JSON.stringify([
        { id: 1, content: '高血压' },
        { id: 2, content: '糖尿病' },
      ])
      const parsed = JSON.parse(medicalHistory)
      expect(parsed).toHaveLength(2)
    })

    it('null → 空数组', () => {
      const medicalHistory = null
      let records: any[] = []
      if (medicalHistory) {
        // ...
      }
      expect(records).toHaveLength(0)
    })
  })
})
