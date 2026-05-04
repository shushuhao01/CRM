Page({
  data: {
    // 替换为你在微信流量主后台创建的广告位ID
    adUnitId: 'adunit-xxxxxxxxxxxxxxxxxx',
    tenantId: '',
    memberId: '',
    customerName: ''
  },

  onLoad(options) {
    this.setData({
      tenantId: options.tenantId || '',
      memberId: options.memberId || '',
      customerName: decodeURIComponent(options.name || '')
    })
  },

  /**
   * 分享给顾问 - 告知已填写
   */
  onShareAppMessage() {
    var name = this.data.customerName
    var title = name ? (name + ' 已填写好资料啦，请查收～') : '我已填写好资料啦，请查收～'
    return {
      title: title,
      path: '/pages/success/success?tenantId=' + this.data.tenantId + '&memberId=' + this.data.memberId,
      imageUrl: ''
    }
  },

  /**
   * 返回聊天（企微场景下返回上级页面）
   */
  handleBackToChat() {
    if (wx.navigateBackMiniProgram) {
      wx.navigateBackMiniProgram({
        success() {
          console.log('[成功页] 已返回聊天')
        },
        fail() {
          wx.showToast({ title: '请手动返回聊天', icon: 'none' })
        }
      })
    } else {
      wx.showToast({ title: '请手动返回聊天', icon: 'none' })
    }
  },

  /**
   * 广告加载成功
   */
  onAdLoad() {
    console.log('[成功页] 广告加载成功')
  },

  /**
   * 广告加载失败
   */
  onAdError(err) {
    console.log('[成功页] 广告加载失败:', err.detail)
  },

  /**
   * 广告关闭
   */
  onAdClose() {
    console.log('[成功页] 广告被关闭')
  }
})
