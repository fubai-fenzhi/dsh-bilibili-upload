import { dirname, join } from 'node:path';

export const DEFAULT_TAGS = ['DeepSeek Harness', 'DSH', '插件', 'AI编程', '效率工具', '开源'];

/**
 * Resolve the biliup binary. No absolute path is baked in: use the plugin
 * config `biliupPath` or the BILIUP_PATH environment variable. When neither is
 * set the tools fail with a configuration hint.
 */
export function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const biliupPath = (typeof source.biliupPath === 'string' && source.biliupPath.trim())
    ? source.biliupPath.trim()
    : (process.env.BILIUP_PATH ?? '').trim();
  return {
    biliupPath,
    cookiePath: typeof source.cookiePath === 'string' && source.cookiePath.trim()
      ? source.cookiePath.trim()
      : (biliupPath ? join(dirname(biliupPath), 'cookies.json') : ''),
    defaultTid: Number.isInteger(source.defaultTid) ? source.defaultTid : 188,
    defaultTags: Array.isArray(source.defaultTags) && source.defaultTags.length
      ? source.defaultTags.map(String)
      : DEFAULT_TAGS,
    defaultOnlySelf: source.defaultOnlySelf !== false,
    defaultSubmit: typeof source.defaultSubmit === 'string' && ['app', 'web', 'b-cut-android'].includes(source.defaultSubmit)
      ? source.defaultSubmit
      : 'web',
    timeoutMs: Number.isInteger(source.timeoutMs) ? source.timeoutMs : 1800000,
  };
}
