App({
  globalData: {
    apiBaseUrl: 'https://crm.yunkes.com/api/v1/mp'
  },
  onLaunch() {
    console.log('[小程序] App onLaunch')
    // 仅DevTools开发环境切换到本地后端，体验版使用正式域名
    try {
      var accountInfo = wx.getAccountInfoSync()
      var envVersion = accountInfo.miniProgram.envVersion
      if (envVersion === 'develop') {
        this.globalData.apiBaseUrl = 'http://localhost:3000/api/v1/mp'
        console.log('[小程序] 开发环境(develop)，API指向本地:', this.globalData.apiBaseUrl)
      } else if (envVersion === 'trial') {
        // 体验版使用正式域名（真机无法访问localhost）
        console.log('[小程序] 体验版(trial)，API使用正式域名:', this.globalData.apiBaseUrl)
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
