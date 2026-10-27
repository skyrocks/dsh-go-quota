// Host 半：读取当前 DSH 配置中 opencode-go 使用的凭据引用 → 请求用量接口。
//
// 密钥规则（按需求）：只读当前 DSH 配置里的 key，不做任何“兜底探测”：
//   1. `settings.describe()` 中 id 为 `opencode-go` 的插件条目：
//      取 `apiKeyEnv`，再退到 `accounts[].apiKeyEnv`；
//   2. `llm-pi-ai` 条目里 `providers["opencode-go"].apiKeyEnv`。
//   两者都是 DSH 配置中声明的“凭据引用”（环境变量名），通过 ctx.credentials
//   解析成实际值；不读 opencode 的 auth.json，也不扫描无关环境变量。
import z from "@deepseek-ai/schemastery";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { collectKeyRefs } from "./config.js";
import { hasAnyWindow, normalizeUsage } from "./normalize.js";

const DEFAULT_BASE_URL = "https://opencode.ai/zen/go/v1/usage";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CACHE_MS = 45000;

export const Config = z.object({
  baseUrl: z.string().default(DEFAULT_BASE_URL),
  timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
  cacheMs: z.number().default(DEFAULT_CACHE_MS),
});

/** 读取 settings.describe() 的活跃表单；服务不可用时返回空数组。 */
function describeForms(ctx) {
  try {
    const settings = typeof ctx.get === "function" ? ctx.get("settings") : undefined;
    if (settings === undefined || typeof settings.describe !== "function") return [];
    const forms = settings.describe();
    return Array.isArray(forms) ? forms : [];
  } catch {
    return [];
  }
}

/**
 * 解析 DSH 当前配置的 GO key。
 * @returns {Promise<{key: string|null, ref: string|null, error: string|null}>}
 */
async function resolveConfiguredKey(ctx) {
  const refs = collectKeyRefs(describeForms(ctx));
  if (refs.length === 0) return { key: null, ref: null, error: "no-config" };
  for (const ref of refs) {
    try {
      const found = await ctx.credentials.resolve(credentialRef(ref));
      if (found !== undefined && typeof found.value === "string" && found.value.length > 0) {
        return { key: found.value, ref, error: null };
      }
    } catch {
      // 该引用未配置或凭据服务拒绝解析：继续看下一个配置项。
    }
  }
  return { key: null, ref: refs[0], error: "no-key" };
}

/**
 * 请求用量接口并映射错误码；网络错误重试一次。
 * @returns {Promise<{account: object|null, error: string|null}>}
 */
async function requestUsage(key, config) {
  const baseUrl = typeof config.baseUrl === "string" ? config.baseUrl : DEFAULT_BASE_URL;
  const timeoutMs =
    typeof config.timeoutMs === "number" && config.timeoutMs > 0
      ? config.timeoutMs
      : DEFAULT_TIMEOUT_MS;
  let lastError = "network";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500));
    let response;
    try {
      response = await fetch(baseUrl, {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      lastError = "network";
      continue;
    }
    if (response.status === 401) return { account: null, error: "unauthorized" };
    if (response.status === 403) return { account: null, error: "no-subscription" };
    if (!response.ok) return { account: null, error: `http-${response.status}` };
    let body;
    try {
      body = await response.json();
    } catch {
      return { account: null, error: "bad-json" };
    }
    const account = normalizeUsage(body);
    if (!hasAnyWindow(account)) return { account: null, error: "empty" };
    return { account, error: null };
  }
  return { account: null, error: lastError };
}

export class GoQuotaGateway extends TypertRemoteService {
  static inject = ["credentials"];
  static Config = Config;

  constructor(ctx, config) {
    super(ctx, "goQuota");
    this.config = config ?? {};
    this.cache = null;
    this.inflight = null;
  }

  /** 读取用量；命中缓存时直接返回（默认 45s）。 */
  async read() {
    const cacheMs =
      typeof this.config.cacheMs === "number" && this.config.cacheMs >= 0
        ? this.config.cacheMs
        : DEFAULT_CACHE_MS;
    if (this.cache !== null && Date.now() - this.cache.at < cacheMs) {
      return this.cache.payload;
    }
    if (this.inflight !== null) return this.inflight;
    this.inflight = this.collect()
      .then((payload) => {
        this.cache = { at: Date.now(), payload };
        return payload;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  /** 绕过缓存强制刷新。 */
  async refresh() {
    this.cache = null;
    return this.read();
  }

  async collect() {
    const resolved = await resolveConfiguredKey(this.ctx);
    if (resolved.key === null) {
      return {
        fetchedAt: Date.now(),
        keySource: null,
        keyRef: resolved.ref,
        account: null,
        error: resolved.error,
      };
    }
    const result = await requestUsage(resolved.key, this.config);
    return {
      fetchedAt: Date.now(),
      keySource: "dsh-config",
      keyRef: resolved.ref,
      account: result.account,
      error: result.error,
    };
  }
}

export default GoQuotaGateway;
