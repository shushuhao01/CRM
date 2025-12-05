/**
 * 阿里云OSS SDK类型声明
 */
declare module 'ali-oss' {
  interface OSSOptions {
    region: string
    accessKeyId: string
    accessKeySecret: string
    bucket: string
    endpoint?: string
    secure?: boolean
    cname?: boolean
    timeout?: number
  }

  interface PutResult {
    name: string
    url: string
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  interface ListResult {
    objects?: Array<{
      name: string
      size: number
      lastModified: string
      etag: string
    }>
    isTruncated: boolean
    nextMarker?: string
  }

  interface GetResult {
    content: Buffer
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  class OSS {
    constructor(options: OSSOptions)
    put(name: string, file: File | Buffer | string, options?: Record<string, unknown>): Promise<PutResult>
    get(name: string, options?: Record<string, unknown>): Promise<GetResult>
    delete(name: string): Promise<{ res: { status: number } }>
    list(query?: { prefix?: string; 'max-keys'?: number; marker?: string }): Promise<ListResult>
  }

  export default OSS
}
