/**
 * 简单日志工具
 */

export function createLogger(namespace: string) {
  const prefix = `[${namespace}]`;
  return {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
  };
}

export default createLogger;

