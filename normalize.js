// 纯函数：把 OpenCode 用量接口的返回体规范化为三个窗口。
// 不依赖任何 DSH/网络模块，便于单独做回归测试。

const WINDOW_KEYS = ["rolling", "weekly", "monthly"];

/** 把任意数值转成有限数字，失败返回 null。 */
function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** 百分比夹在 0..100；接口偶尔返回负数或 >100 时不破坏进度条。 */
function clampPercent(value) {
  if (value === null) return null;
  return Math.min(100, Math.max(0, value));
}

/**
 * 规范化单个窗口。
 * 兼容 camelCase / snake_case 两套字段名，以及数字字符串。
 * @param {unknown} value 原始窗口对象
 * @returns {{status: string|null, percent: number|null, resetsAt: string|null}|null}
 */
export function pickWindow(value) {
  if (value === null || typeof value !== "object") return null;
  const record = /** @type {Record<string, unknown>} */ (value);
  const percent = clampPercent(
    toNumber(record.percent ?? record.usedPercent ?? record.used_percent),
  );
  const resetRaw = record.resetsAt ?? record.resets_at ?? record.resetAt ?? record.reset_at;
  const statusRaw = record.status;
  return {
    status: typeof statusRaw === "string" ? statusRaw : null,
    percent,
    resetsAt: typeof resetRaw === "string" && resetRaw !== "" ? resetRaw : null,
  };
}

/**
 * 规范化整个用量返回体；支持 `{ usage: {...} }` 包裹与直接平铺两种形态。
 * @param {unknown} body 接口 JSON
 * @returns {{rolling: object|null, weekly: object|null, monthly: object|null}|null}
 */
export function normalizeUsage(body) {
  if (body === null || typeof body !== "object") return null;
  const record = /** @type {Record<string, unknown>} */ (body);
  const usage =
    record.usage !== null && typeof record.usage === "object" ? record.usage : record;
  if (usage === null || typeof usage !== "object") return null;
  const source = /** @type {Record<string, unknown>} */ (usage);
  /** @type {Record<string, object|null>} */
  const result = {};
  for (const key of WINDOW_KEYS) result[key] = pickWindow(source[key]);
  return /** @type {{rolling: object|null, weekly: object|null, monthly: object|null}} */ (result);
}

/** 三个窗口是否至少有一个有效百分比。 */
export function hasAnyWindow(account) {
  if (!account || typeof account !== "object") return false;
  return WINDOW_KEYS.some((key) => account[key] !== null && account[key] !== undefined);
}
