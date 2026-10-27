// 纯函数：从 DSH 配置表单中提取 opencode-go 的凭据引用。
// 与 DSH 的 REF_PATTERN 保持一致：POSIX shell 标识符。

const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * 按来源优先级收集：先 `opencode-go` 插件条目，再 `llm-pi-ai` 的 provider 配置。
 * @param {unknown[]} forms settings.describe() 的结果
 * @returns {string[]} 按优先级排序、去重的凭据引用名
 */
export function collectKeyRefs(forms) {
  const refs = [];
  const push = (value) => {
    if (typeof value === "string" && REF_PATTERN.test(value) && !refs.includes(value)) {
      refs.push(value);
    }
  };
  const configsOf = (ns) => {
    const out = [];
    for (const form of forms) {
      if (form === null || typeof form !== "object") continue;
      const record = /** @type {Record<string, unknown>} */ (form);
      if (record.ns !== ns) continue;
      const value = record.value;
      if (value !== null && typeof value === "object") {
        out.push(/** @type {Record<string, unknown>} */ (value));
      }
    }
    return out;
  };

  for (const config of configsOf("opencode-go")) {
    push(config.apiKeyEnv);
    if (Array.isArray(config.accounts)) {
      for (const account of config.accounts) {
        if (account !== null && typeof account === "object") {
          push(/** @type {Record<string, unknown>} */ (account).apiKeyEnv);
        }
      }
    }
  }

  for (const config of configsOf("llm-pi-ai")) {
    const providers = config.providers;
    if (providers === null || typeof providers !== "object") continue;
    const provider = /** @type {Record<string, unknown>} */ (providers)["opencode-go"];
    if (provider !== null && typeof provider === "object") {
      push(/** @type {Record<string, unknown>} */ (provider).apiKeyEnv);
    }
  }

  return refs;
}
