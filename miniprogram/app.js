App({
  globalData: {
    apiBaseUrl: 'https://crm.yunkes.com/api/v1/mp'
  },
  onLaunch() {
    console.log('[小程序] App onLaunch')
    // 开发环境自动切换到本地后端
    try {
      var accountInfo = wx.getAccountInfoSync()
      var envVersion = accountInfo.miniProgram.envVersion
      if (envVersion === 'develop' || envVersion === 'trial') {
        this.globalData.apiBaseUrl = 'http://localhost:3000/api/v1/mp'
        console.log('[小程序] 开发环境，API指向本地:', this.globalData.apiBaseUrl)
      }
    } catch (e) {
      // DevTools 兼容：__wxConfig.envVersion
      if (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'develop') {
        this.globalData.apiBaseUrl = 'http://localhost:3000/api/v1/mp'
        console.log('[小程序] DevTools环境，API指向本地:', this.globalData.apiBaseUrl)
      }
    }
  }
})
