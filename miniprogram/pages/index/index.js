const util = require('../../utils/util')
const api = require('../../utils/api')

Page({
  data: {
    redirecting: false
  },

  onLoad(options) {
    console.log('[首页] onLoad, options:', JSON.stringify(options))
    var params = util.parseQuery(options)

    // 短令牌模式：通过后端解析令牌获取完整参数
    if (params.t) {
      console.log('[首页] 检测到短令牌:', params.t)
      this.setData({ redirecting: true })
      this._resolveToken(params.t)
      return
    }

    // 完整参数模式：直接跳转到表单页
    if (params.tenantId && params.memberId && params.ts && params.sign) {
      this.setData({ redirecting: true })
      this._redirectToForm(params)
      return
    }

    // 无参数 → 展示欢迎页面（微信审核 / 用户直接扫码打开）
    console.log('[首页] 无有效参数，展示欢迎页面')
  },

  _resolveToken(token) {
    var self = this
    api.resolveCardToken(token).then(function (res) {
      var data = res.data || res
      console.log('[首页] 令牌解析成功:', JSON.stringify(data))
      if (data.tenantId && data.memberId && data.ts && data.sign) {
        self._redirectToForm(data)
      } else {
        self.setData({ redirecting: false })
        util.showToast('参数异常，请重新获取卡片')
      }
    }).catch(function (err) {
      console.error('[首页] 令牌解析失败:', err)
      self.setData({ redirecting: false })
      if (err.code === 'TOKEN_EXPIRED') {
        wx.redirectTo({ url: '/pages/expired/expired' })
      } else {
        util.showToast('链接已过期，请联系顾问重新发送')
      }
    })
  },

  _redirectToForm(params) {
    var query = 'tenantId=' + encodeURIComponent(params.tenantId) +
      '&memberId=' + encodeURIComponent(params.memberId) +
      '&ts=' + encodeURIComponent(params.ts) +
      '&sign=' + encodeURIComponent(params.sign)
    if (params.externalUserId) {
      query += '&externalUserId=' + encodeURIComponent(params.externalUserId)
    }
    wx.redirectTo({
      url: '/pages/form/form?' + query,
      fail: function (err) {
        console.error('[首页] 跳转表单页失败:', err)
      }
    })
  },

  // 体验模式：让审核员 / 普通用户可以预览表单功能
  onEnterDemo() {
    wx.showLoading({ title: '加载中', mask: true })
    setTimeout(function () {
      wx.hideLoading()
      wx.navigateTo({ url: '/pages/form/form?demo=1' })
    }, 300)
  }
})
