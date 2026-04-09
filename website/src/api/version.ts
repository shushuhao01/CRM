/**
 * 版本检查 API - 用于获取最新发布版本和下载信息
 */
const API_BASE = '/api/v1/public'

export interface VersionInfo {
  id: string
  version: string
  versionCode: number
  releaseType: string
  changelog: string
  releaseNotesHtml?: string
  downloadUrl?: string
  sourceType?: string  // 'url' | 'upload' | 'git'
  gitRepoUrl?: string
  gitBranch?: string
  gitTag?: string
  fileSize?: string
  isForceUpdate: number
  publishedAt?: string
  changelogs?: any[]
}

export interface LatestVersionResponse {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: VersionInfo | null
}

/**
 * 获取最新已发布版本（公开接口）
 */
export async function getLatestVersion(): Promise<LatestVersionResponse> {
  try {
    const res = await fetch(`${API_BASE}/version-check/latest`)
    const json = await res.json()
    if (json.success) {
      return json.data
    }
    return { hasUpdate: false, currentVersion: '0.0.0', latestVersion: null }
  } catch {
    return { hasUpdate: false, currentVersion: '0.0.0', latestVersion: null }
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number | string | undefined): string {
  if (!bytes) return ''
  const size = typeof bytes === 'string' ? parseInt(bytes) : bytes
  if (isNaN(size) || size <= 0) return ''
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB'
  return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

