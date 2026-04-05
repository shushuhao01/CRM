/**
 * 用户Store — Pinia Store 主入口
 * 🔧 任务3.5 拆分：从 1374 行单体文件拆分为 4 个职责清晰的模块
 *
 * 模块结构：
 *   stores/user.ts              — 本文件，瘦协调器（~60行）
 *   stores/user/types.ts        — 类型定义（User, PhoneViewSettings, UserStoreDeps）
 *   stores/user/permissionHelpers.ts — 权限计算属性（角色判断、敏感信息、数据访问等）
 *   stores/user/authActions.ts  — 认证动作（登录/登出/会话恢复/权限监听）
 *   stores/user/userActions.ts  — 用户管理（列表加载、权限检查、手机号设置等）
 *
 * 对外接口 100% 不变 — 80+ 消费文件零修改
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createPermissionHelpers } from './user/permissionHelpers'
import { createAuthActions } from './user/authActions'
import { createUserActions } from './user/userActions'
import type { User, PhoneViewSettings, UserStoreDeps } from './user/types'

// ── 类型重导出（保持 import { User } from '@/stores/user' 兼容） ──
export type { User, PhoneViewSettings } from './user/types'

export const useUserStore = defineStore('user', () => {
  // ── 状态定义 ──────────────────────────────────────────
  const currentUser = ref<User | null>(null)
  const token = ref<string>('')
  const permissions = ref<string[]>([])
  const isLoggedIn = ref<boolean>(false)
  const users = ref<User[]>([])
  const phoneViewSettings = ref<PhoneViewSettings>({
    enabled: true,
    whitelist: []
  })

  // ── 组合子模块 ────────────────────────────────────────
  const deps: UserStoreDeps = { currentUser, token, permissions, isLoggedIn, users }

  const permHelpers = createPermissionHelpers(currentUser, permissions)
  const authActions = createAuthActions(deps)
  const userActions = createUserActions({
    ...deps,
    isAdmin: permHelpers.isAdmin,
    phoneViewSettings,
  })

  // ── 返回完整 API（与拆分前完全一致）─────────────────
  return {
    // 状态
    currentUser,
    token,
    permissions,
    isLoggedIn,
    users,
    phoneViewSettings,
    // 权限计算属性（来自 permissionHelpers）
    ...permHelpers,
    // 认证动作（来自 authActions）
    ...authActions,
    // 用户管理动作（来自 userActions）
    ...userActions,
  }
})

