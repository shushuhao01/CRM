/**
 * 编码与 JSON 安全处理工具
 *
 * @description 提供 JSON 安全解析、CSV BOM 头、中文文件名编码等工具函数
 * @see .coding-standards.md 第八章
 */

/**
 * 安全 JSON 解析 —— 失败时返回默认值，不会抛异常
 *
 * @example
 * const config = safeJsonParse<AppConfig>(rawStr, { theme: 'light' });
 * const list   = safeJsonParse<string[]>(rawStr, []);
 */
export function safeJsonParse<T = unknown>(
  str: string | null | undefined,
  defaultValue: T
): T {
  if (!str || str === 'undefined' || str === 'null') {
    return defaultValue;
  }
  try {
    return JSON.parse(str);
  } catch {
    console.warn(`[safeJsonParse] 解析失败: ${str.substring(0, 200)}`);
    return defaultValue;
  }
}

/**
 * 安全 JSON 序列化 —— 处理循环引用等异常情况
 */
export function safeJsonStringify(
  obj: unknown,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(obj);
  } catch {
    console.warn('[safeJsonStringify] 序列化失败，返回 fallback');
    return fallback;
  }
}

/**
 * CSV 添加 UTF-8 BOM 头（防止 Excel 打开中文乱码）
 *
 * @example
 * res.setHeader('Content-Type', 'text/csv; charset=utf-8');
 * res.send(addCsvBom(csvContent));
 */
export function addCsvBom(content: string): string {
  return '\uFEFF' + content;
}

/**
 * 生成安全的 Content-Disposition 头（支持中文文件名）
 *
 * @example
 * res.setHeader('Content-Disposition', encodeContentDisposition('客户数据.xlsx'));
 */
export function encodeContentDisposition(
  fileName: string,
  type: 'attachment' | 'inline' = 'attachment'
): string {
  const encoded = encodeURIComponent(fileName);
  return `${type}; filename="${encoded}"; filename*=UTF-8''${encoded}`;
}

/**
 * 解码 multer 上传的中文文件名
 * multer 默认用 latin1 解码 multipart 中的 filename，中文会变成乱码
 *
 * @example
 * const realName = decodeMulterFileName(file.originalname);
 */
export function decodeMulterFileName(name: string): string {
  try {
    // 检测是否需要转码：如果已经是合法 UTF-8 就不处理
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    // 验证转码后是否合理（不含替换字符）
    if (!decoded.includes('\ufffd')) {
      return decoded;
    }
    return name;
  } catch {
    return name;
  }
}

