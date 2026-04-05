/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 自定义指令类型声明
declare module 'vue' {
  interface ComponentCustomProperties {
    vPermission: typeof import('./directives/permission').default
  }
}

