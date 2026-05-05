const util = require('../../utils/util')

Page({
  data: {
    redirecting: false
  },

  onLoad(options) {
    console.log('[首页] onLoad, options:', JSON.stringify(options))
    const params = util.parseQuery(options)

    // 有完整参数 → 直接跳转到表单页
    if (params.tenantId && params.memberId && params.ts && params.sign) {
      this.setData({ redirecting: true })
      const query = 'tenantId=' + encodeURIComponent(params.tenantId) +
        '&memberId=' + encodeURIComponent(params.memberId) +
        '&ts=' + encodeURIComponent(params.ts) +
        '&sign=' + encodeURIComponent(params.sign)
      wx.redirectTo({
        url: '/pages/form/form?' + query,
        fail: function (err) {
          console.error('[首页] 跳转表单页失败:', err)
        }
      })
      return
    }

    // 无参数 → 展示欢迎页面（微信审核 / 用户直接扫码打开）
    console.log('[首页] 无有效参数，展示欢迎页面')
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
