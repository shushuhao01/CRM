/**
 * 企微配置选择持久化 composable
 * 所有企微管理二级菜单共享同一个 configId 选择状态
 * 切换后会保存到 localStorage，下次进入时自动读取
 */

const STORAGE_KEY = 'wecom_selected_config_id'

/** 获取上次选择的 configId */
export function getLastSelectedConfigId(): number | undefined {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    if (val) {
      const id = parseInt(val, 10)
      return isNaN(id) ? undefined : id
    }
  } catch { /* ignore */ }
  return undefined
}

/** 保存选择的 configId */
export function saveSelectedConfigId(configId: number | null | undefined) {
  try {
    if (configId) {
      localStorage.setItem(STORAGE_KEY, String(configId))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore */ }
}
