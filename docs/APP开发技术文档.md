# CRM外呼助手 APP 开发技术文档

> 本文档包含APP开发所需的全部技术细节，请结合《APP产品设计文档.md》和《APP接口文档.md》一起使用。
> 
> **版本**：v1.1
> **更新日期**：2025-12-26
> 
> **更新说明**：
> - 新增服务器配置功能（多租户支持）
> - 新增通话跟进功能（数据同步）
> - 完善录音管理相关实现

---

## 一、项目概述

### 1.1 项目信息

| 项目 | 说明 |
|------|------|
| 项目名称 | CRM外呼助手 |
| 英文名称 | crm-dialer-app |
| 包名(Android) | com.crm.dialer |
| Bundle ID(iOS) | com.crm.dialer |
| 最低版本 | Android 7.0+ / iOS 12.0+ |
| 目标版本 | Android 14 / iOS 17 |

### 1.2 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| uni-app | 3.x | 跨平台开发框架 |
| Vue | 3.x | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Pinia | 2.x | 状态管理 |
| uni-ui | 最新 | UI组件库 |
| socket.io-client | 4.x | WebSocket通信 |

### 1.3 后端服务信息

| 环境 | API地址 | WebSocket地址 |
|------|---------|---------------|
| 开发环境 | http://localhost:3000/api/v1 | ws://localhost:3000 |
| 生产环境 | https://your-domain.com/api/v1 | wss://your-domain.com |

### 1.4 多租户服务器配置说明

本系统支持多公司/多团队独立部署，每个团队使用自己的服务器。APP需要支持动态配置服务器地址。

**服务器地址格式：**
```
用户输入: abc789.cn
API地址: https://abc789.cn/api/v1
WebSocket: wss://abc789.cn
```

**支持的配置方式：**
1. 手动输入域名
2. 扫描服务器配置二维码
3. 从历史记录选择

---

## 二、项目结构

```
crm-dialer-app/
├── src/
│   ├── api/                    # API接口
│   │   ├── auth.ts            # 登录认证
│   │   ├── device.ts          # 设备绑定
│   │   ├── call.ts            # 通话相关
│   │   └── stats.ts           # 统计数据
│   ├── components/            # 公共组件
│   │   ├── Dialpad.vue        # 拨号盘
│   │   ├── CallCard.vue       # 通话记录卡片
│   │   ├── StatusBar.vue      # 连接状态栏
│   │   └── AudioPlayer.vue    # 录音播放器
│   ├── pages/                 # 页面
│   │   ├── index/             # 首页
│   │   ├── calls/             # 通话记录
│   │   ├── stats/             # 统计
│   │   ├── settings/          # 设置
│   │   ├── login/             # 登录
│   │   ├── scan/              # 扫码绑定
│   │   ├── calling/           # 通话中
│   │   └── call-detail/       # 通话详情
│   ├── services/              # 服务
│   │   ├── websocket.ts       # WebSocket服务
│   │   ├── phone.ts           # 电话服务(原生)
│   │   ├── recorder.ts        # 录音服务(原生)
│   │   └── notification.ts    # 通知服务
│   ├── stores/                # 状态管理
│   │   ├── user.ts            # 用户状态
│   │   ├── device.ts          # 设备状态
│   │   ├── call.ts            # 通话状态
│   │   └── settings.ts        # 设置状态
│   ├── utils/                 # 工具函数
│   │   ├── request.ts         # 请求封装
│   │   ├── storage.ts         # 本地存储
│   │   ├── format.ts          # 格式化
│   │   └── permission.ts      # 权限检查
│   ├── static/                # 静态资源
│   │   ├── images/            # 图片
│   │   └── icons/             # 图标
│   ├── App.vue                # 根组件
│   ├── main.ts                # 入口文件
│   ├── pages.json             # 页面配置
│   ├── manifest.json          # 应用配置
│   └── uni.scss               # 全局样式变量
├── nativeplugins/             # 原生插件
│   ├── PhoneCall/             # 拨号插件
│   └── CallRecorder/          # 录音插件
├── package.json
└── tsconfig.json
```

---

## 三、API接口对接

### 3.1 接口基础配置

```typescript
// src/utils/request.ts
import { useUserStore } from '@/stores/user'

const BASE_URL = 'https://your-domain.com/api/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

export const request = <T = any>(options: RequestOptions): Promise<T> => {
  const userStore = useUserStore()
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': userStore.token ? `Bearer ${userStore.token}` : '',
        ...options.header
      },
      success: (res: any) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          resolve(res.data.data)
        } else if (res.statusCode === 401) {
          // Token过期，跳转登录
          userStore.logout()
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
        } else {
          reject(new Error(res.data.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}
```

### 3.2 接口列表

#### 3.2.1 登录认证

```typescript
// src/api/auth.ts

// APP登录
export const login = (data: {
  username: string
  password: string
  deviceInfo?: {
    deviceId: string
    deviceName: string
    osType: 'android' | 'ios'
    osVersion: string
    appVersion: string
  }
}) => {
  return request({
    url: '/mobile/login',
    method: 'POST',
    data
  })
}

// 响应示例
{
  "code": 200,
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": "user_001",
      "username": "zhangsan",
      "realName": "张三",
      "department": "销售部",
      "role": "sales_staff"
    }
  }
}
```

#### 3.2.2 设备绑定

```typescript
// src/api/device.ts

// 扫码绑定设备
export const bindDevice = (data: {
  bindToken: string      // 从二维码获取
  phoneNumber?: string   // 手机号
  deviceInfo: {
    deviceId: string
    deviceName: string
    deviceModel: string
    osType: 'android' | 'ios'
    osVersion: string
    appVersion: string
  }
}) => {
  return request({
    url: '/mobile/bind',
    method: 'POST',
    data
  })
}

// 响应示例
{
  "code": 200,
  "success": true,
  "data": {
    "deviceId": "device_xxx",
    "userId": "user_001",
    "wsToken": "eyJhbGciOiJIUzI1NiIs...",
    "wsUrl": "wss://your-domain.com/ws/mobile"
  }
}

// 解绑设备
export const unbindDevice = () => {
  return request({
    url: '/mobile/unbind',
    method: 'DELETE'
  })
}

// 获取设备状态
export const getDeviceStatus = () => {
  return request({
    url: '/mobile/device/status',
    method: 'GET'
  })
}
```

#### 3.2.3 通话相关

```typescript
// src/api/call.ts

// 上报通话状态
export const reportCallStatus = (data: {
  callId: string
  status: 'dialing' | 'ringing' | 'connected' | 'ended' | 'missed' | 'rejected'
  timestamp: string
}) => {
  return request({
    url: '/mobile/call/status',
    method: 'POST',
    data
  })
}

// 上报通话结束
export const reportCallEnd = (data: {
  callId: string
  status: 'connected' | 'missed' | 'rejected' | 'busy'
  startTime?: string
  endTime: string
  duration: number      // 秒
  hasRecording: boolean
}) => {
  return request({
    url: '/mobile/call/end',
    method: 'POST',
    data
  })
}

// 上传录音文件
export const uploadRecording = (callId: string, filePath: string) => {
  const userStore = useUserStore()
  
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/mobile/recording/upload',
      filePath: filePath,
      name: 'file',
      formData: {
        callId: callId
      },
      header: {
        'Authorization': `Bearer ${userStore.token}`
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.code === 200) {
          resolve(data.data)
        } else {
          reject(new Error(data.message))
        }
      },
      fail: reject
    })
  })
}
```

---

## 四、WebSocket通信

### 4.1 WebSocket服务封装

```typescript
// src/services/websocket.ts
import { io, Socket } from 'socket.io-client'
import { useUserStore } from '@/stores/user'
import { useCallStore } from '@/stores/call'

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 3000
  
  // 连接状态
  public isConnected = false
  
  // 连接WebSocket
  connect(wsUrl: string, token: string) {
    if (this.socket?.connected) return
    
    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,  // 手动控制重连
      timeout: 10000
    })
    
    this.setupListeners()
  }
  
  // 设置监听器
  private setupListeners() {
    if (!this.socket) return
    
    // 连接成功
    this.socket.on('connect', () => {
      console.log('[WebSocket] 连接成功')
      this.isConnected = true
      this.reconnectAttempts = 0
      
      // 通知UI更新
      uni.$emit('ws:connected')
    })
    
    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] 断开连接:', reason)
      this.isConnected = false
      uni.$emit('ws:disconnected', reason)
      
      // 自动重连
      this.scheduleReconnect()
    })
    
    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] 连接错误:', error.message)
      this.isConnected = false
      uni.$emit('ws:error', error.message)
    })
    
    // ========== 业务事件 ==========
    
    // 收到拨号指令
    this.socket.on('DIAL_REQUEST', (data) => {
      console.log('[WebSocket] 收到拨号指令:', data)
      const callStore = useCallStore()
      callStore.handleDialRequest(data)
    })
    
    // 取消拨号
    this.socket.on('DIAL_CANCEL', (data) => {
      console.log('[WebSocket] 取消拨号:', data)
      const callStore = useCallStore()
      callStore.handleDialCancel(data)
    })
    
    // 心跳响应
    this.socket.on('pong', () => {
      // 心跳正常
    })
  }
  
  // 发送消息
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }
  
  // 上报通话状态
  reportCallStatus(callId: string, status: string, extra?: any) {
    this.emit('CALL_STATUS', {
      callId,
      status,
      timestamp: new Date().toISOString(),
      ...extra
    })
  }
  
  // 重连调度
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] 达到最大重连次数')
      uni.$emit('ws:max_reconnect')
      return
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    
    console.log(`[WebSocket] ${delay}ms后重连，第${this.reconnectAttempts}次`)
    
    setTimeout(() => {
      const userStore = useUserStore()
      if (userStore.wsToken && userStore.wsUrl) {
        this.connect(userStore.wsUrl, userStore.wsToken)
      }
    }, delay)
  }
  
  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
  }
}

export const wsService = new WebSocketService()
```

### 4.2 WebSocket消息类型

| 事件名 | 方向 | 说明 |
|--------|------|------|
| DIAL_REQUEST | 服务器→APP | PC端发起拨号请求 |
| DIAL_CANCEL | 服务器→APP | PC端取消拨号 |
| CALL_STATUS | APP→服务器 | 上报通话状态变化 |
| CALL_ENDED | APP→服务器 | 上报通话结束 |
| DEVICE_ONLINE | APP→服务器 | 设备上线 |
| DEVICE_OFFLINE | APP→服务器 | 设备离线 |
| HEARTBEAT | 双向 | 心跳保活 |

### 4.3 拨号指令数据结构

```typescript
// PC端发来的拨号指令
interface DialRequest {
  callId: string           // 通话ID
  phoneNumber: string      // 要拨打的号码
  customerName?: string    // 客户姓名
  customerId?: string      // 客户ID
  source: 'pc'             // 来源
  operatorId: string       // 操作人ID
  operatorName: string     // 操作人姓名
  timestamp: string        // 时间戳
}
```

---

## 五、原生功能集成

### 5.1 电话拨号服务

```typescript
// src/services/phone.ts

class PhoneService {
  // 拨打电话
  async dial(phoneNumber: string): Promise<boolean> {
    return new Promise((resolve) => {
      // #ifdef APP-PLUS
      plus.device.dial(phoneNumber, false)
      resolve(true)
      // #endif
      
      // #ifndef APP-PLUS
      uni.makePhoneCall({
        phoneNumber,
        success: () => resolve(true),
        fail: () => resolve(false)
      })
      // #endif
    })
  }
  
  // 监听通话状态变化 (需要原生插件)
  onCallStateChange(callback: (state: CallState) => void) {
    // #ifdef APP-PLUS
    const PhoneCallPlugin = uni.requireNativePlugin('PhoneCall')
    PhoneCallPlugin?.setCallStateListener(callback)
    // #endif
  }
}

export const phoneService = new PhoneService()
```

### 5.2 录音服务

```typescript
// src/services/recorder.ts

interface RecordingResult {
  filePath: string
  duration: number
  fileSize: number
}

class RecorderService {
  private isRecording = false
  private currentCallId: string | null = null
  
  // 开始录音
  async startRecording(callId: string): Promise<boolean> {
    if (this.isRecording) return false
    
    // #ifdef APP-PLUS
    const CallRecorder = uni.requireNativePlugin('CallRecorder')
    const result = await CallRecorder?.startRecording({ callId })
    if (result?.success) {
      this.isRecording = true
      this.currentCallId = callId
      return true
    }
    // #endif
    
    return false
  }
  
  // 停止录音
  async stopRecording(): Promise<RecordingResult | null> {
    if (!this.isRecording) return null
    
    // #ifdef APP-PLUS
    const CallRecorder = uni.requireNativePlugin('CallRecorder')
    const result = await CallRecorder?.stopRecording()
    this.isRecording = false
    this.currentCallId = null
    
    if (result?.success) {
      return {
        filePath: result.filePath,
        duration: result.duration,
        fileSize: result.fileSize
      }
    }
    // #endif
    
    return null
  }
}

export const recorderService = new RecorderService()
```

---

## 六、状态管理

### 6.1 用户状态

```typescript
// src/stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    wsToken: '',
    wsUrl: '',
    userInfo: null as UserInfo | null,
    isLoggedIn: false
  }),
  
  actions: {
    setLoginInfo(data: LoginResponse) {
      this.token = data.token
      this.userInfo = data.user
      this.isLoggedIn = true
      
      // 持久化存储
      uni.setStorageSync('token', data.token)
      uni.setStorageSync('userInfo', JSON.stringify(data.user))
    },
    
    setWsInfo(wsToken: string, wsUrl: string) {
      this.wsToken = wsToken
      this.wsUrl = wsUrl
      uni.setStorageSync('wsToken', wsToken)
      uni.setStorageSync('wsUrl', wsUrl)
    },
    
    logout() {
      this.token = ''
      this.wsToken = ''
      this.wsUrl = ''
      this.userInfo = null
      this.isLoggedIn = false
      
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync('wsToken')
      uni.removeStorageSync('wsUrl')
    },
    
    // 从本地存储恢复
    restore() {
      const token = uni.getStorageSync('token')
      const userInfo = uni.getStorageSync('userInfo')
      const wsToken = uni.getStorageSync('wsToken')
      const wsUrl = uni.getStorageSync('wsUrl')
      
      if (token) {
        this.token = token
        this.isLoggedIn = true
      }
      if (userInfo) {
        this.userInfo = JSON.parse(userInfo)
      }
      if (wsToken) this.wsToken = wsToken
      if (wsUrl) this.wsUrl = wsUrl
    }
  }
})
```

### 6.2 通话状态

```typescript
// src/stores/call.ts
import { defineStore } from 'pinia'
import { phoneService } from '@/services/phone'
import { recorderService } from '@/services/recorder'
import { wsService } from '@/services/websocket'
import { reportCallEnd, uploadRecording } from '@/api/call'

export const useCallStore = defineStore('call', {
  state: () => ({
    currentCall: null as CurrentCall | null,
    callHistory: [] as CallRecord[],
    isDialing: false
  }),
  
  actions: {
    // 处理PC端拨号请求
    async handleDialRequest(data: DialRequest) {
      if (this.isDialing || this.currentCall) {
        // 正在通话中，拒绝新请求
        wsService.reportCallStatus(data.callId, 'rejected', {
          reason: 'busy'
        })
        return
      }
      
      this.isDialing = true
      this.currentCall = {
        callId: data.callId,
        phoneNumber: data.phoneNumber,
        customerName: data.customerName,
        status: 'dialing',
        startTime: new Date().toISOString()
      }
      
      // 上报状态
      wsService.reportCallStatus(data.callId, 'dialing')
      
      // 发起拨号
      const success = await phoneService.dial(data.phoneNumber)
      if (!success) {
        this.currentCall = null
        this.isDialing = false
        wsService.reportCallStatus(data.callId, 'failed', {
          reason: 'dial_failed'
        })
      }
    },
    
    // 通话结束处理
    async handleCallEnded(duration: number, status: string) {
      if (!this.currentCall) return
      
      const call = this.currentCall
      const endTime = new Date().toISOString()
      
      // 停止录音
      const recording = await recorderService.stopRecording()
      
      // 上报通话结束
      await reportCallEnd({
        callId: call.callId,
        status: status as any,
        startTime: call.startTime,
        endTime,
        duration,
        hasRecording: !!recording
      })
      
      // 上传录音
      if (recording) {
        try {
          await uploadRecording(call.callId, recording.filePath)
        } catch (e) {
          console.error('录音上传失败:', e)
        }
      }
      
      // 清理状态
      this.currentCall = null
      this.isDialing = false
    }
  }
})
```

---

## 七、页面配置

### 7.1 pages.json

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "CRM外呼助手",
        "enablePullDownRefresh": false
      }
    },
    {
      "path": "pages/login/index",
      "style": {
        "navigationBarTitleText": "登录",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/scan/index",
      "style": {
        "navigationBarTitleText": "扫码绑定"
      }
    },
    {
      "path": "pages/calling/index",
      "style": {
        "navigationBarTitleText": "通话中",
        "navigationStyle": "custom",
        "disableScroll": true
      }
    },
    {
      "path": "pages/calls/index",
      "style": {
        "navigationBarTitleText": "通话记录"
      }
    },
    {
      "path": "pages/call-detail/index",
      "style": {
        "navigationBarTitleText": "通话详情"
      }
    },
    {
      "path": "pages/stats/index",
      "style": {
        "navigationBarTitleText": "统计"
      }
    },
    {
      "path": "pages/settings/index",
      "style": {
        "navigationBarTitleText": "设置"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "CRM外呼助手",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#F5F5F5"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#409EFF",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "iconPath": "static/icons/home.png",
        "selectedIconPath": "static/icons/home-active.png",
        "text": "首页"
      },
      {
        "pagePath": "pages/calls/index",
        "iconPath": "static/icons/calls.png",
        "selectedIconPath": "static/icons/calls-active.png",
        "text": "通话"
      },
      {
        "pagePath": "pages/stats/index",
        "iconPath": "static/icons/stats.png",
        "selectedIconPath": "static/icons/stats-active.png",
        "text": "统计"
      },
      {
        "pagePath": "pages/settings/index",
        "iconPath": "static/icons/settings.png",
        "selectedIconPath": "static/icons/settings-active.png",
        "text": "设置"
      }
    ]
  }
}
```

### 7.2 manifest.json 关键配置

```json
{
  "name": "CRM外呼助手",
  "appid": "__UNI__XXXXXXX",
  "versionName": "1.0.0",
  "versionCode": "100",
  "app-plus": {
    "distribute": {
      "android": {
        "permissions": [
          "<uses-permission android:name=\"android.permission.CALL_PHONE\"/>",
          "<uses-permission android:name=\"android.permission.READ_PHONE_STATE\"/>",
          "<uses-permission android:name=\"android.permission.RECORD_AUDIO\"/>",
          "<uses-permission android:name=\"android.permission.WRITE_EXTERNAL_STORAGE\"/>",
          "<uses-permission android:name=\"android.permission.READ_EXTERNAL_STORAGE\"/>",
          "<uses-permission android:name=\"android.permission.CAMERA\"/>",
          "<uses-permission android:name=\"android.permission.INTERNET\"/>",
          "<uses-permission android:name=\"android.permission.ACCESS_NETWORK_STATE\"/>",
          "<uses-permission android:name=\"android.permission.VIBRATE\"/>",
          "<uses-permission android:name=\"android.permission.FOREGROUND_SERVICE\"/>"
        ],
        "minSdkVersion": 24,
        "targetSdkVersion": 34
      },
      "ios": {
        "privacyDescription": {
          "NSPhotoLibraryUsageDescription": "用于选择图片",
          "NSCameraUsageDescription": "用于扫描二维码",
          "NSMicrophoneUsageDescription": "用于通话录音"
        }
      }
    },
    "nativePlugins": [
      {
        "plugins": [
          { "id": "PhoneCall", "name": "电话拨号插件" },
          { "id": "CallRecorder", "name": "通话录音插件" }
        ]
      }
    ]
  }
}
```

---

## 八、UI组件示例

### 8.1 拨号盘组件

```vue
<!-- src/components/Dialpad.vue -->
<template>
  <view class="dialpad">
    <view class="display">
      <text class="number">{{ phoneNumber || '请输入号码' }}</text>
    </view>
    <view class="keys">
      <view 
        v-for="key in keys" 
        :key="key.value"
        class="key"
        @tap="handleKeyPress(key.value)"
      >
        <text class="key-main">{{ key.value }}</text>
        <text v-if="key.sub" class="key-sub">{{ key.sub }}</text>
      </view>
    </view>
    <view class="actions">
      <view class="action-btn delete" @tap="handleDelete">
        <uni-icons type="backspace" size="24" color="#666" />
      </view>
      <view class="action-btn call" @tap="handleCall">
        <uni-icons type="phone-filled" size="32" color="#fff" />
      </view>
      <view class="action-btn" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['call'])
const phoneNumber = ref('')

const keys = [
  { value: '1', sub: '' },
  { value: '2', sub: 'ABC' },
  { value: '3', sub: 'DEF' },
  { value: '4', sub: 'GHI' },
  { value: '5', sub: 'JKL' },
  { value: '6', sub: 'MNO' },
  { value: '7', sub: 'PQRS' },
  { value: '8', sub: 'TUV' },
  { value: '9', sub: 'WXYZ' },
  { value: '*', sub: '' },
  { value: '0', sub: '+' },
  { value: '#', sub: '' }
]

const handleKeyPress = (value: string) => {
  if (phoneNumber.value.length < 15) {
    phoneNumber.value += value
    uni.vibrateShort({ type: 'light' })
  }
}

const handleDelete = () => {
  phoneNumber.value = phoneNumber.value.slice(0, -1)
}

const handleCall = () => {
  if (phoneNumber.value) {
    emit('call', phoneNumber.value)
  }
}
</script>

<style lang="scss" scoped>
.dialpad {
  padding: 20rpx;
  
  .display {
    text-align: center;
    padding: 40rpx 0;
    .number {
      font-size: 48rpx;
      font-weight: 500;
      letter-spacing: 4rpx;
    }
  }
  
  .keys {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;
    
    .key {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 120rpx;
      background: #f5f5f5;
      border-radius: 60rpx;
      
      &:active {
        background: #e0e0e0;
      }
      
      .key-main {
        font-size: 44rpx;
        font-weight: 500;
      }
      .key-sub {
        font-size: 20rpx;
        color: #999;
      }
    }
  }
  
  .actions {
    display: flex;
    justify-content: space-around;
    margin-top: 40rpx;
    
    .action-btn {
      width: 120rpx;
      height: 120rpx;
      border-radius: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.call {
        background: #67C23A;
      }
      &.delete:active {
        background: #f0f0f0;
      }
    }
  }
}
</style>
```

### 8.2 连接状态栏组件

```vue
<!-- src/components/StatusBar.vue -->
<template>
  <view class="status-bar" :class="statusClass">
    <view class="status-dot" />
    <text class="status-text">{{ statusText }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'connected' | 'connecting' | 'disconnected'
}>()

const statusClass = computed(() => `status-${props.status}`)

const statusText = computed(() => {
  const texts = {
    connected: '已连接',
    connecting: '连接中...',
    disconnected: '未连接'
  }
  return texts[props.status]
})
</script>

<style lang="scss" scoped>
.status-bar {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  
  &.status-connected {
    background: rgba(103, 194, 58, 0.1);
    .status-dot { background: #67C23A; }
    .status-text { color: #67C23A; }
  }
  
  &.status-connecting {
    background: rgba(230, 162, 60, 0.1);
    .status-dot { background: #E6A23C; animation: blink 1s infinite; }
    .status-text { color: #E6A23C; }
  }
  
  &.status-disconnected {
    background: rgba(245, 108, 108, 0.1);
    .status-dot { background: #F56C6C; }
    .status-text { color: #F56C6C; }
  }
  
  .status-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 12rpx;
  }
  
  .status-text {
    font-size: 24rpx;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
```

---

## 九、权限处理

### 9.1 权限检查工具

```typescript
// src/utils/permission.ts

type PermissionType = 'camera' | 'record' | 'phone' | 'storage'

// 检查权限
export const checkPermission = async (type: PermissionType): Promise<boolean> => {
  // #ifdef APP-PLUS
  const permissionMap: Record<PermissionType, string> = {
    camera: 'android.permission.CAMERA',
    record: 'android.permission.RECORD_AUDIO',
    phone: 'android.permission.CALL_PHONE',
    storage: 'android.permission.WRITE_EXTERNAL_STORAGE'
  }
  
  const permission = permissionMap[type]
  const result = plus.android.checkPermission(permission)
  return result === 1
  // #endif
  
  return true
}

// 请求权限
export const requestPermission = async (type: PermissionType): Promise<boolean> => {
  // #ifdef APP-PLUS
  const permissionMap: Record<PermissionType, string> = {
    camera: 'android.permission.CAMERA',
    record: 'android.permission.RECORD_AUDIO',
    phone: 'android.permission.CALL_PHONE',
    storage: 'android.permission.WRITE_EXTERNAL_STORAGE'
  }
  
  return new Promise((resolve) => {
    plus.android.requestPermissions(
      [permissionMap[type]],
      (result) => {
        resolve(result.granted.length > 0)
      },
      () => resolve(false)
    )
  })
  // #endif
  
  return true
}

// 请求所有必要权限
export const requestAllPermissions = async (): Promise<boolean> => {
  const permissions: PermissionType[] = ['phone', 'record', 'storage', 'camera']
  
  for (const perm of permissions) {
    const hasPermission = await checkPermission(perm)
    if (!hasPermission) {
      const granted = await requestPermission(perm)
      if (!granted) {
        uni.showModal({
          title: '权限提示',
          content: '请授予必要权限以正常使用APP功能',
          showCancel: false
        })
        return false
      }
    }
  }
  
  return true
}
```

---

## 十、开发环境搭建

### 10.1 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | 18.x+ | JavaScript运行时 |
| HBuilderX | 3.8.x+ | uni-app官方IDE |
| Android Studio | 最新 | Android开发调试 |
| Xcode | 15.x+ | iOS开发调试(Mac) |

### 10.2 项目初始化

```bash
# 1. 使用HBuilderX创建项目
# 选择 uni-app -> Vue3 -> TypeScript

# 2. 安装依赖
npm install

# 3. 安装额外依赖
npm install pinia socket.io-client
npm install -D @types/node sass

# 4. 配置TypeScript
# 确保 tsconfig.json 正确配置
```

### 10.3 开发调试

```bash
# 运行到浏览器 (功能受限)
npm run dev:h5

# 运行到Android模拟器
# 在HBuilderX中: 运行 -> 运行到手机或模拟器 -> Android

# 运行到iOS模拟器 (Mac)
# 在HBuilderX中: 运行 -> 运行到手机或模拟器 -> iOS

# 真机调试
# 1. 手机开启USB调试
# 2. 连接电脑
# 3. HBuilderX中选择设备运行
```

### 10.4 打包发布

```bash
# Android打包
# HBuilderX: 发行 -> 原生App-云打包 -> Android

# iOS打包
# HBuilderX: 发行 -> 原生App-云打包 -> iOS

# 自定义基座 (调试原生插件)
# HBuilderX: 运行 -> 运行到手机或模拟器 -> 制作自定义调试基座
```

---

## 十一、原生插件开发指南

### 11.1 Android原生插件 - 通话录音

```java
// nativeplugins/CallRecorder/android/CallRecorderModule.java
package com.crm.dialer.plugins;

import android.media.MediaRecorder;
import io.dcloud.feature.uniapp.annotation.UniJSMethod;
import io.dcloud.feature.uniapp.bridge.UniJSCallback;
import io.dcloud.feature.uniapp.common.UniModule;

public class CallRecorderModule extends UniModule {
    private MediaRecorder recorder;
    private String currentFilePath;
    
    @UniJSMethod(uiThread = false)
    public void startRecording(JSONObject options, UniJSCallback callback) {
        try {
            String callId = options.getString("callId");
            String filePath = getRecordingPath(callId);
            
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setOutputFile(filePath);
            recorder.prepare();
            recorder.start();
            
            currentFilePath = filePath;
            
            JSONObject result = new JSONObject();
            result.put("success", true);
            result.put("filePath", filePath);
            callback.invoke(result);
        } catch (Exception e) {
            JSONObject result = new JSONObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            callback.invoke(result);
        }
    }
    
    @UniJSMethod(uiThread = false)
    public void stopRecording(UniJSCallback callback) {
        try {
            if (recorder != null) {
                recorder.stop();
                recorder.release();
                recorder = null;
            }
            
            File file = new File(currentFilePath);
            
            JSONObject result = new JSONObject();
            result.put("success", true);
            result.put("filePath", currentFilePath);
            result.put("fileSize", file.length());
            callback.invoke(result);
        } catch (Exception e) {
            JSONObject result = new JSONObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            callback.invoke(result);
        }
    }
}
```

### 11.2 iOS原生插件 - 通话录音

```swift
// nativeplugins/CallRecorder/ios/CallRecorderModule.swift
import Foundation
import AVFoundation

@objc(CallRecorderModule)
class CallRecorderModule: NSObject, UniModule {
    var audioRecorder: AVAudioRecorder?
    var currentFilePath: String?
    
    @objc func startRecording(_ options: [String: Any], callback: UniModuleCallback) {
        guard let callId = options["callId"] as? String else {
            callback(["success": false, "error": "Missing callId"])
            return
        }
        
        let filePath = getRecordingPath(callId: callId)
        let url = URL(fileURLWithPath: filePath)
        
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat)
            try session.setActive(true)
            
            audioRecorder = try AVAudioRecorder(url: url, settings: settings)
            audioRecorder?.record()
            currentFilePath = filePath
            
            callback(["success": true, "filePath": filePath])
        } catch {
            callback(["success": false, "error": error.localizedDescription])
        }
    }
    
    @objc func stopRecording(_ callback: UniModuleCallback) {
        audioRecorder?.stop()
        audioRecorder = nil
        
        guard let filePath = currentFilePath else {
            callback(["success": false, "error": "No recording"])
            return
        }
        
        let fileManager = FileManager.default
        if let attrs = try? fileManager.attributesOfItem(atPath: filePath) {
            let fileSize = attrs[.size] as? Int64 ?? 0
            callback([
                "success": true,
                "filePath": filePath,
                "fileSize": fileSize
            ])
        } else {
            callback(["success": false, "error": "File not found"])
        }
    }
}
```

---

## 十二、常见问题与解决方案

### 12.1 WebSocket连接问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 连接失败 | 网络不通/服务器未启动 | 检查网络和服务器状态 |
| 频繁断开 | 心跳超时 | 调整心跳间隔，检查网络稳定性 |
| 认证失败 | Token过期 | 重新登录获取新Token |

### 12.2 录音问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 无法录音 | 权限未授予 | 引导用户授权录音权限 |
| 录音无声 | 音源设置错误 | 使用VOICE_COMMUNICATION音源 |
| 文件过大 | 编码格式问题 | 使用AAC编码压缩 |

### 12.3 拨号问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 无法拨号 | 权限未授予 | 授予CALL_PHONE权限 |
| 拨号后无响应 | 状态监听失败 | 检查原生插件配置 |

---

## 十三、测试清单

### 13.1 功能测试

- [ ] 登录/登出功能
- [ ] 扫码绑定设备
- [ ] WebSocket连接与重连
- [ ] 接收PC端拨号指令
- [ ] 发起电话呼叫
- [ ] 通话状态上报
- [ ] 通话录音
- [ ] 录音上传
- [ ] 通话记录查看
- [ ] 统计数据展示

### 13.2 兼容性测试

- [ ] Android 7.0-14 各版本
- [ ] iOS 12-17 各版本
- [ ] 不同屏幕尺寸适配
- [ ] 横竖屏切换
- [ ] 深色模式

### 13.3 性能测试

- [ ] 启动时间 < 3秒
- [ ] 内存占用 < 100MB
- [ ] 电池消耗合理
- [ ] 网络请求响应 < 2秒

---

## 十四、版本发布计划

| 版本 | 功能 | 预计时间 |
|------|------|----------|
| v1.0.0 | 基础功能：登录、绑定、拨号、录音 | 第1-2周 |
| v1.1.0 | 增强功能：通话记录、统计、设置 | 第3周 |
| v1.2.0 | 优化：性能优化、Bug修复 | 第4周 |
| v2.0.0 | 新功能：客户管理、智能推荐 | 后续迭代 |

---

## 十五、联系与支持

- 后端API文档：`docs/APP接口文档.md`
- 产品设计文档：`docs/APP产品设计文档.md`
- 技术方案文档：`docs/电销外呼系统技术方案.md`

如有问题，请联系开发团队。


---

## 十六、服务器配置功能（多租户支持）

### 16.1 功能说明

由于系统可能交付给多个公司/团队使用，每个团队部署自己的服务器，APP需要支持动态配置服务器地址。

**使用场景示例：**
- A公司服务器: `abc789.cn`
- B公司服务器: `company-b.com`
- C公司服务器: `192.168.1.100:3000`（内网）

### 16.2 服务器配置页面原型

```
┌─────────────────────────────────┐
│  ←  服务器设置                  │
├─────────────────────────────────┤
│                                 │
│  当前服务器                     │
│  ┌─────────────────────────┐    │
│  │ 🌐 abc789.cn            │    │
│  │    状态: ✅ 已连接       │    │
│  └─────────────────────────┘    │
│                                 │
│  输入服务器地址                 │
│  ┌─────────────────────────┐    │
│  │ 请输入域名或IP地址       │    │
│  │ 例如: abc789.cn          │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │       测试连接           │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    📷 扫码配置服务器     │    │
│  └─────────────────────────┘    │
│                                 │
│  历史服务器                     │
│  ─────────────────────────────  │
│  ┌─────────────────────────┐    │
│  │ 🌐 abc789.cn        ✓   │    │
│  │    最近: 2025-12-25     │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 🌐 test.company.com     │    │
│  │    最近: 2025-12-20     │    │
│  └─────────────────────────┘    │
│                                 │
│  💡 提示：请向管理员获取服务器  │
│     地址，或扫描配置二维码      │
│                                 │
└─────────────────────────────────┘
```

### 16.3 服务器配置Store

```typescript
// src/stores/server.ts
import { defineStore } from 'pinia'

interface ServerInfo {
  host: string           // 域名或IP，如 abc789.cn
  protocol: 'http' | 'https'
  port?: number
  lastUsed: string       // 最后使用时间
  name?: string          // 服务器名称（可选）
}

interface ServerState {
  currentServer: ServerInfo | null
  serverHistory: ServerInfo[]
  isConnected: boolean
  isChecking: boolean
}

export const useServerStore = defineStore('server', {
  state: (): ServerState => ({
    currentServer: null,
    serverHistory: [],
    isConnected: false,
    isChecking: false
  }),
  
  getters: {
    // 获取API基础地址
    apiBaseUrl(): string {
      if (!this.currentServer) return ''
      const { protocol, host, port } = this.currentServer
      const portStr = port ? `:${port}` : ''
      return `${protocol}://${host}${portStr}/api/v1`
    },
    
    // 获取WebSocket地址
    wsUrl(): string {
      if (!this.currentServer) return ''
      const { protocol, host, port } = this.currentServer
      const wsProtocol = protocol === 'https' ? 'wss' : 'ws'
      const portStr = port ? `:${port}` : ''
      return `${wsProtocol}://${host}${portStr}`
    },
    
    // 显示用的服务器地址
    displayUrl(): string {
      if (!this.currentServer) return '未配置'
      const { host, port } = this.currentServer
      return port ? `${host}:${port}` : host
    }
  },
  
  actions: {
    // 解析用户输入的服务器地址
    parseServerInput(input: string): ServerInfo {
      let host = input.trim()
      let protocol: 'http' | 'https' = 'https'
      let port: number | undefined
      
      // 移除协议前缀
      if (host.startsWith('https://')) {
        host = host.replace('https://', '')
        protocol = 'https'
      } else if (host.startsWith('http://')) {
        host = host.replace('http://', '')
        protocol = 'http'
      }
      
      // 移除路径
      host = host.split('/')[0]
      
      // 解析端口
      if (host.includes(':')) {
        const parts = host.split(':')
        host = parts[0]
        port = parseInt(parts[1])
      }
      
      // 本地IP使用http
      if (host.startsWith('192.168.') || 
          host.startsWith('10.') || 
          host === 'localhost') {
        protocol = 'http'
      }
      
      return {
        host,
        protocol,
        port,
        lastUsed: new Date().toISOString()
      }
    },
    
    // 测试服务器连接
    async testConnection(serverInfo: ServerInfo): Promise<boolean> {
      this.isChecking = true
      
      const { protocol, host, port } = serverInfo
      const portStr = port ? `:${port}` : ''
      const url = `${protocol}://${host}${portStr}/api/v1/mobile/ping`
      
      try {
        const res: any = await new Promise((resolve, reject) => {
          uni.request({
            url,
            method: 'GET',
            timeout: 5000,
            success: resolve,
            fail: reject
          })
        })
        
        this.isChecking = false
        return res.statusCode === 200
      } catch (e) {
        this.isChecking = false
        return false
      }
    },
    
    // 设置当前服务器
    async setServer(input: string): Promise<{ success: boolean; message: string }> {
      const serverInfo = this.parseServerInput(input)
      
      // 测试连接
      const connected = await this.testConnection(serverInfo)
      if (!connected) {
        return { success: false, message: '无法连接到服务器，请检查地址是否正确' }
      }
      
      // 保存当前服务器
      this.currentServer = serverInfo
      this.isConnected = true
      
      // 更新历史记录
      this.addToHistory(serverInfo)
      
      // 持久化
      this.saveToStorage()
      
      return { success: true, message: '服务器配置成功' }
    },
    
    // 添加到历史记录
    addToHistory(serverInfo: ServerInfo) {
      // 移除已存在的相同服务器
      this.serverHistory = this.serverHistory.filter(
        s => s.host !== serverInfo.host || s.port !== serverInfo.port
      )
      
      // 添加到开头
      this.serverHistory.unshift(serverInfo)
      
      // 最多保留5条
      if (this.serverHistory.length > 5) {
        this.serverHistory = this.serverHistory.slice(0, 5)
      }
    },
    
    // 从历史记录选择
    async selectFromHistory(serverInfo: ServerInfo): Promise<boolean> {
      const connected = await this.testConnection(serverInfo)
      if (connected) {
        serverInfo.lastUsed = new Date().toISOString()
        this.currentServer = serverInfo
        this.isConnected = true
        this.addToHistory(serverInfo)
        this.saveToStorage()
        return true
      }
      return false
    },
    
    // 保存到本地存储
    saveToStorage() {
      if (this.currentServer) {
        uni.setStorageSync('currentServer', JSON.stringify(this.currentServer))
      }
      uni.setStorageSync('serverHistory', JSON.stringify(this.serverHistory))
    },
    
    // 从本地存储恢复
    restoreFromStorage() {
      try {
        const current = uni.getStorageSync('currentServer')
        const history = uni.getStorageSync('serverHistory')
        
        if (current) {
          this.currentServer = JSON.parse(current)
        }
        if (history) {
          this.serverHistory = JSON.parse(history)
        }
      } catch (e) {
        console.error('恢复服务器配置失败:', e)
      }
    },
    
    // 清除服务器配置
    clearServer() {
      this.currentServer = null
      this.isConnected = false
      uni.removeStorageSync('currentServer')
    }
  }
})
```

### 16.4 服务器配置页面组件

```vue
<!-- src/pages/server-config/index.vue -->
<template>
  <view class="server-config">
    <!-- 当前服务器状态 -->
    <view class="current-server" v-if="serverStore.currentServer">
      <view class="label">当前服务器</view>
      <view class="server-card active">
        <view class="server-icon">🌐</view>
        <view class="server-info">
          <text class="server-host">{{ serverStore.displayUrl }}</text>
          <text class="server-status" :class="{ connected: serverStore.isConnected }">
            {{ serverStore.isConnected ? '✅ 已连接' : '❌ 未连接' }}
          </text>
        </view>
      </view>
    </view>
    
    <!-- 输入服务器地址 -->
    <view class="input-section">
      <view class="label">输入服务器地址</view>
      <view class="input-wrapper">
        <input 
          v-model="serverInput"
          placeholder="请输入域名或IP地址，如: abc789.cn"
          :disabled="isLoading"
        />
      </view>
      <view class="hint">
        支持格式：abc789.cn、192.168.1.100:3000
      </view>
    </view>
    
    <!-- 操作按钮 -->
    <view class="actions">
      <button 
        class="btn-test" 
        @tap="handleTestConnection"
        :loading="isLoading"
        :disabled="!serverInput.trim()"
      >
        测试连接
      </button>
      
      <button 
        class="btn-scan" 
        @tap="handleScanConfig"
      >
        📷 扫码配置服务器
      </button>
    </view>
    
    <!-- 历史服务器 -->
    <view class="history-section" v-if="serverStore.serverHistory.length > 0">
      <view class="label">历史服务器</view>
      <view 
        class="server-card"
        v-for="(server, index) in serverStore.serverHistory"
        :key="index"
        :class="{ active: isCurrentServer(server) }"
        @tap="handleSelectHistory(server)"
      >
        <view class="server-icon">🌐</view>
        <view class="server-info">
          <text class="server-host">{{ formatServerHost(server) }}</text>
          <text class="server-time">最近: {{ formatDate(server.lastUsed) }}</text>
        </view>
        <view class="server-check" v-if="isCurrentServer(server)">✓</view>
      </view>
    </view>
    
    <!-- 提示信息 -->
    <view class="tips">
      <text>💡 提示：请向管理员获取服务器地址，或扫描配置二维码</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useServerStore } from '@/stores/server'

const serverStore = useServerStore()
const serverInput = ref('')
const isLoading = ref(false)

// 测试连接
const handleTestConnection = async () => {
  if (!serverInput.value.trim()) return
  
  isLoading.value = true
  const result = await serverStore.setServer(serverInput.value)
  isLoading.value = false
  
  if (result.success) {
    uni.showToast({ title: '连接成功', icon: 'success' })
    serverInput.value = ''
  } else {
    uni.showToast({ title: result.message, icon: 'none' })
  }
}

// 扫码配置
const handleScanConfig = () => {
  uni.scanCode({
    scanType: ['qrCode'],
    success: async (res) => {
      try {
        // 二维码内容格式: { "server": "abc789.cn", "name": "XX公司" }
        const config = JSON.parse(res.result)
        if (config.server) {
          serverInput.value = config.server
          await handleTestConnection()
        }
      } catch (e) {
        // 直接当作服务器地址
        serverInput.value = res.result
        await handleTestConnection()
      }
    }
  })
}

// 从历史选择
const handleSelectHistory = async (server: any) => {
  isLoading.value = true
  const success = await serverStore.selectFromHistory(server)
  isLoading.value = false
  
  if (success) {
    uni.showToast({ title: '切换成功', icon: 'success' })
  } else {
    uni.showToast({ title: '连接失败', icon: 'none' })
  }
}

// 判断是否当前服务器
const isCurrentServer = (server: any) => {
  const current = serverStore.currentServer
  if (!current) return false
  return current.host === server.host && current.port === server.port
}

// 格式化服务器地址
const formatServerHost = (server: any) => {
  return server.port ? `${server.host}:${server.port}` : server.host
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}-${date.getDate()}`
}
</script>

<style lang="scss" scoped>
.server-config {
  padding: 32rpx;
  
  .label {
    font-size: 28rpx;
    color: #666;
    margin-bottom: 16rpx;
  }
  
  .server-card {
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 16rpx;
    border: 2rpx solid #eee;
    
    &.active {
      border-color: #34D399;
      background: rgba(52, 211, 153, 0.05);
    }
    
    .server-icon {
      font-size: 40rpx;
      margin-right: 20rpx;
    }
    
    .server-info {
      flex: 1;
      
      .server-host {
        font-size: 32rpx;
        font-weight: 500;
        display: block;
      }
      
      .server-status, .server-time {
        font-size: 24rpx;
        color: #999;
        margin-top: 8rpx;
        display: block;
        
        &.connected {
          color: #34D399;
        }
      }
    }
    
    .server-check {
      color: #34D399;
      font-size: 36rpx;
      font-weight: bold;
    }
  }
  
  .input-section {
    margin: 32rpx 0;
    
    .input-wrapper {
      background: #fff;
      border-radius: 16rpx;
      padding: 24rpx;
      border: 2rpx solid #eee;
      
      input {
        font-size: 30rpx;
      }
    }
    
    .hint {
      font-size: 24rpx;
      color: #999;
      margin-top: 12rpx;
    }
  }
  
  .actions {
    margin: 32rpx 0;
    
    button {
      width: 100%;
      height: 88rpx;
      border-radius: 16rpx;
      font-size: 32rpx;
      margin-bottom: 20rpx;
      
      &.btn-test {
        background: linear-gradient(135deg, #34D399, #10B981);
        color: #fff;
      }
      
      &.btn-scan {
        background: #fff;
        color: #333;
        border: 2rpx solid #ddd;
      }
    }
  }
  
  .tips {
    text-align: center;
    font-size: 24rpx;
    color: #999;
    margin-top: 40rpx;
  }
}
</style>
```

### 16.5 启动页服务器检查逻辑

```typescript
// src/pages/splash/index.vue - 启动页逻辑
import { onMounted } from 'vue'
import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'

onMounted(async () => {
  const serverStore = useServerStore()
  const userStore = useUserStore()
  
  // 1. 恢复本地存储的配置
  serverStore.restoreFromStorage()
  userStore.restore()
  
  // 2. 检查是否已配置服务器
  if (!serverStore.currentServer) {
    // 未配置服务器，跳转到服务器配置页
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/server-config/index' })
    }, 1500)
    return
  }
  
  // 3. 测试服务器连接
  const serverInfo = serverStore.currentServer
  const connected = await serverStore.testConnection(serverInfo)
  
  if (!connected) {
    // 服务器无法连接，跳转到服务器配置页
    uni.showToast({ title: '服务器连接失败', icon: 'none' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/server-config/index' })
    }, 1500)
    return
  }
  
  serverStore.isConnected = true
  
  // 4. 检查登录状态
  if (userStore.isLoggedIn && userStore.token) {
    // 已登录，跳转到首页
    uni.reLaunch({ url: '/pages/index/index' })
  } else {
    // 未登录，跳转到登录页
    uni.reLaunch({ url: '/pages/login/index' })
  }
})
```

### 16.6 登录页服务器切换

```vue
<!-- src/pages/login/index.vue 底部服务器信息 -->
<template>
  <!-- ... 登录表单 ... -->
  
  <!-- 底部服务器信息 -->
  <view class="server-info">
    <text class="server-label">服务器: </text>
    <text class="server-url">{{ serverStore.displayUrl }}</text>
    <text class="server-switch" @tap="goToServerConfig">切换服务器</text>
  </view>
</template>

<script setup>
import { useServerStore } from '@/stores/server'

const serverStore = useServerStore()

const goToServerConfig = () => {
  uni.navigateTo({ url: '/pages/server-config/index' })
}
</script>

<style lang="scss" scoped>
.server-info {
  position: fixed;
  bottom: 60rpx;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 24rpx;
  color: #999;
  
  .server-url {
    color: #666;
  }
  
  .server-switch {
    color: #409EFF;
    margin-left: 16rpx;
    text-decoration: underline;
  }
}
</style>
```

### 16.7 后端Ping接口

需要在后端添加一个简单的ping接口，用于APP测试服务器连接：

```typescript
// backend/src/routes/mobile.ts - 添加ping接口

// 服务器连接测试 (无需认证)
router.get('/ping', (req, res) => {
  res.json({
    code: 200,
    success: true,
    message: 'pong',
    data: {
      serverTime: new Date().toISOString(),
      version: '1.0.0'
    }
  })
})
```

### 16.8 服务器配置二维码格式

管理员可以生成包含服务器信息的二维码，方便用户扫码配置：

```json
// 二维码内容格式（JSON字符串）
{
  "server": "abc789.cn",
  "name": "XX公司CRM系统",
  "protocol": "https"
}

// 或者简单格式（直接是域名）
"abc789.cn"
```

### 16.9 使用流程总结

**首次使用：**
```
启动APP → 检测无服务器配置 → 服务器配置页 → 输入域名/扫码 → 测试连接 → 登录页
```

**切换服务器：**
```
设置页 → 服务器设置 → 输入新域名/选择历史 → 测试连接 → 重新登录
```

**多公司场景示例：**
```
A公司员工: 输入 abc789.cn → 登录A公司账号
B公司员工: 输入 company-b.com → 登录B公司账号
C公司员工: 扫描C公司配置二维码 → 登录C公司账号
```


---

## 十七、通话跟进功能（数据同步）

### 17.1 功能说明

通话结束后，APP端可以提交以下信息：
- **通话备注** - 记录通话内容摘要
- **快捷标签** - 意向、无意向、再联系、成交等
- **客户意向** - high/medium/low/none
- **是否需要跟进** - 设置下次跟进时间

这些数据会同步到服务器的以下位置：
1. `call_records`表 - 更新通话备注和标签
2. `follow_up_records`表 - 创建跟进记录
3. `customers`表 - 更新客户标签和最后联系时间

### 17.2 通话跟进接口

```typescript
// src/api/call.ts

/**
 * 提交通话跟进记录
 * POST /api/v1/mobile/call/followup
 */
export const submitCallFollowup = (data: {
  callId: string           // 通话ID
  notes?: string           // 通话备注
  tags?: string[]          // 快捷标签：['意向', '无意向', '再联系', '成交']
  intention?: 'high' | 'medium' | 'low' | 'none'  // 客户意向
  followUpRequired?: boolean  // 是否需要跟进
  nextFollowUpDate?: string   // 下次跟进时间 ISO格式
  customerId?: string         // 客户ID（可选）
}) => {
  return request({
    url: '/mobile/call/followup',
    method: 'POST',
    data
  })
}

// 响应示例
{
  "code": 200,
  "success": true,
  "message": "跟进记录已保存",
  "data": {
    "callId": "call_xxx",
    "customerId": "cust_xxx",
    "synced": true
  }
}
```

### 17.3 通话结束页面实现

```vue
<!-- src/pages/call-ended/index.vue -->
<template>
  <view class="call-ended">
    <!-- 通话信息 -->
    <view class="call-info">
      <view class="status-icon">✅</view>
      <text class="title">通话已结束</text>
      <text class="customer-name">{{ callInfo.customerName }}</text>
      <text class="phone">{{ callInfo.phoneNumber }}</text>
      
      <view class="stats">
        <view class="stat-item">
          <text class="label">通话时长</text>
          <text class="value">{{ formatDuration(callInfo.duration) }}</text>
        </view>
        <view class="stat-item">
          <text class="label">通话状态</text>
          <text class="value">{{ callInfo.status === 'connected' ? '已接通' : '未接通' }}</text>
        </view>
        <view class="stat-item">
          <text class="label">录音状态</text>
          <text class="value">{{ callInfo.hasRecording ? '已保存' : '无录音' }}</text>
        </view>
      </view>
    </view>
    
    <!-- 通话备注 -->
    <view class="section">
      <text class="section-title">添加通话备注</text>
      <textarea 
        v-model="notes"
        placeholder="记录通话要点..."
        :maxlength="500"
      />
    </view>
    
    <!-- 快捷标签 -->
    <view class="section">
      <text class="section-title">快捷标签</text>
      <view class="tags">
        <view 
          v-for="tag in quickTags" 
          :key="tag"
          class="tag"
          :class="{ active: selectedTags.includes(tag) }"
          @tap="toggleTag(tag)"
        >
          {{ tag }}
        </view>
      </view>
    </view>
    
    <!-- 客户意向 -->
    <view class="section">
      <text class="section-title">客户意向</text>
      <view class="intentions">
        <view 
          v-for="item in intentions" 
          :key="item.value"
          class="intention"
          :class="{ active: intention === item.value }"
          @tap="intention = item.value"
        >
          {{ item.label }}
        </view>
      </view>
    </view>
    
    <!-- 下次跟进 -->
    <view class="section" v-if="followUpRequired">
      <text class="section-title">下次跟进时间</text>
      <picker mode="date" :value="nextFollowUpDate" @change="onDateChange">
        <view class="date-picker">
          {{ nextFollowUpDate || '选择日期' }}
        </view>
      </picker>
    </view>
    
    <view class="follow-switch">
      <text>需要后续跟进</text>
      <switch :checked="followUpRequired" @change="followUpRequired = $event.detail.value" />
    </view>
    
    <!-- 操作按钮 -->
    <view class="actions">
      <button class="btn-save" @tap="handleSave" :loading="saving">
        保存并返回
      </button>
      <button class="btn-skip" @tap="handleSkip">
        跳过
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { submitCallFollowup } from '@/api/call'

const props = defineProps<{
  callInfo: {
    callId: string
    customerName: string
    phoneNumber: string
    customerId?: string
    duration: number
    status: string
    hasRecording: boolean
  }
}>()

const notes = ref('')
const selectedTags = ref<string[]>([])
const intention = ref<string>('')
const followUpRequired = ref(false)
const nextFollowUpDate = ref('')
const saving = ref(false)

const quickTags = ['意向', '无意向', '再联系', '成交', '需报价', '已成交']
const intentions = [
  { label: '很有意向', value: 'high' },
  { label: '一般', value: 'medium' },
  { label: '较低', value: 'low' },
  { label: '暂无', value: 'none' }
]

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

const onDateChange = (e: any) => {
  nextFollowUpDate.value = e.detail.value
}

const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}分${sec}秒`
}

const handleSave = async () => {
  saving.value = true
  
  try {
    await submitCallFollowup({
      callId: props.callInfo.callId,
      notes: notes.value,
      tags: selectedTags.value,
      intention: intention.value as any,
      followUpRequired: followUpRequired.value,
      nextFollowUpDate: nextFollowUpDate.value ? `${nextFollowUpDate.value}T09:00:00` : undefined,
      customerId: props.callInfo.customerId
    })
    
    uni.showToast({ title: '保存成功', icon: 'success' })
    
    // 返回首页
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

const handleSkip = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>
```

### 17.4 数据同步流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   APP端      │     │   服务器     │     │   PC端       │
│  通话结束    │────>│  接收数据    │────>│  实时更新    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    ▼                    │
       │           ┌──────────────┐              │
       │           │ call_records │              │
       │           │ 更新备注/标签 │              │
       │           └──────────────┘              │
       │                    │                    │
       │                    ▼                    │
       │           ┌──────────────┐              │
       │           │follow_up_records│           │
       │           │ 创建跟进记录  │              │
       │           └──────────────┘              │
       │                    │                    │
       │                    ▼                    │
       │           ┌──────────────┐              │
       │           │  customers   │              │
       │           │ 更新客户信息  │              │
       │           └──────────────┘              │
       │                    │                    │
       │                    ▼                    │
       │           ┌──────────────┐              │
       │           │  WebSocket   │─────────────>│
       │           │ 推送PC端更新  │              │
       │           └──────────────┘              │
```

### 17.5 PC端同步显示

APP提交的跟进记录会在以下位置显示：

1. **通话管理页面** - 通话记录列表显示备注和标签
2. **客户详情页面** - 跟进记录Tab显示完整跟进历史
3. **客户列表** - 客户标签和跟进状态实时更新

### 17.6 WebSocket实时推送

当APP提交跟进记录后，服务器会通过WebSocket推送给PC端：

```typescript
// PC端接收的消息
{
  type: 'CALL_FOLLOWUP_UPDATED',
  data: {
    callId: 'call_xxx',
    customerId: 'cust_xxx',
    notes: '客户对产品感兴趣，需要发送报价单',
    tags: ['意向', '需报价'],
    intention: 'high',
    followUpRequired: true,
    nextFollowUpDate: '2025-12-28T09:00:00'
  }
}
```

PC端收到消息后可以：
- 刷新通话记录列表
- 更新客户详情页面
- 显示桌面通知
