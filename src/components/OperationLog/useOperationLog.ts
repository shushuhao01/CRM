import { ref, reactive } from 'vue'
import { operationLogApi } from '@/api/operationLog'

export function useOperationLog(module: string) {
  const latestLogs = ref<Record<string, any>>({})

  const dialog = reactive({
    visible: false,
    resourceId: '',
    resourceName: '',
  })

  const loadLatestLogs = async (resourceIds: string[]) => {
    if (!resourceIds.length) return
    try {
      const res = await operationLogApi.getLatestLogs(module, resourceIds)
      const data = res?.data?.data || res?.data || res || {}
      latestLogs.value = (typeof data === 'object' && data !== null && !Array.isArray(data)) ? data : {}
    } catch (e) {
      console.error(`[${module}] 加载操作日志失败:`, e)
    }
  }

  const showDialog = (resourceId: string, resourceName?: string) => {
    dialog.resourceId = resourceId
    dialog.resourceName = resourceName || ''
    dialog.visible = true
  }

  return { latestLogs, dialog, loadLatestLogs, showDialog }
}
