// 纯逻辑回归：不依赖 DSH 运行时，直接 `node test/smoke.mjs`。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectKeyRefs } from "../config.js";
import { TYPERT } from "../typert.host.js";
import { hasAnyWindow, normalizeUsage, pickWindow } from "../normalize.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("camelCase 包裹形态", () => {
  const account = normalizeUsage({
    usage: {
      rolling: { percent: 32, resetsAt: "2026-10-23T20:00:00Z", status: "active" },
      weekly: { percent: 18, resetsAt: "2026-10-27T00:00:00Z" },
      monthly: { percent: 9, resetsAt: "2026-11-01T00:00:00Z" },
    },
  });
  assert.equal(account.rolling.percent, 32);
  assert.equal(account.weekly.percent, 18);
  assert.equal(account.monthly.percent, 9);
  assert.equal(account.rolling.resetsAt, "2026-10-23T20:00:00Z");
  assert.equal(account.weekly.status, null);
  assert.equal(hasAnyWindow(account), true);
});

test("snake_case 平铺形态", () => {
  const account = normalizeUsage({
    rolling: { used_percent: "41.5", resets_at: "2026-10-23T20:00:00Z" },
    weekly: {},
    monthly: { percent: null },
  });
  assert.equal(account.rolling.percent, 41.5);
  assert.equal(account.rolling.resetsAt, "2026-10-23T20:00:00Z");
  assert.equal(account.weekly.percent, null);
  assert.equal(account.monthly.percent, null);
});

test("百分比越界被夹紧，非法值变 null", () => {
  assert.deepEqual(pickWindow({ percent: 130 }), { status: null, percent: 100, resetsAt: null });
  assert.deepEqual(pickWindow({ percent: -4 }), { status: null, percent: 0, resetsAt: null });
  assert.deepEqual(pickWindow({ percent: "abc" }), { status: null, percent: null, resetsAt: null });
  assert.equal(pickWindow(null), null);
});

test("空响应不抛错", () => {
  assert.equal(normalizeUsage(null), null);
  assert.equal(normalizeUsage("nope"), null);
  const empty = normalizeUsage({});
  assert.equal(hasAnyWindow(empty), false);
  assert.equal(empty.rolling, null);
});

test("凭据引用按 DSH 配置优先级收集", () => {
  const refs = collectKeyRefs([
    {
      ns: "llm-pi-ai",
      value: { providers: { "opencode-go": { apiKeyEnv: "OPENCODE_GO_API_KEY" } } },
    },
    {
      ns: "opencode-go",
      value: {
        apiKeyEnv: "DSH_OPENCODE_GO_ACCOUNT_AAA",
        accounts: [
          { apiKeyEnv: "DSH_OPENCODE_GO_ACCOUNT_AAA" },
          { apiKeyEnv: "DSH_OPENCODE_GO_ACCOUNT_BBB" },
        ],
      },
    },
    { ns: "other", value: { apiKeyEnv: "SHOULD_NOT_APPEAR" } },
    { ns: "opencode-go", value: { apiKeyEnv: "bad-name" } },
  ]);
  assert.deepEqual(refs, [
    "DSH_OPENCODE_GO_ACCOUNT_AAA",
    "DSH_OPENCODE_GO_ACCOUNT_BBB",
    "OPENCODE_GO_API_KEY",
  ]);
});

test("没有 opencode-go 配置时返回空", () => {
  assert.deepEqual(collectKeyRefs([]), []);
  assert.deepEqual(collectKeyRefs([{ ns: "opencode-go", value: {} }]), []);
  assert.deepEqual(collectKeyRefs([null, { ns: "opencode-go", value: null }]), []);
});

test("Typert codec 可脱离 zod 加载并校验结果", () => {
  assert.equal(TYPERT.invocations.length, 2);
  const parser = TYPERT.invocations[0].result.create();
  const value = {
    fetchedAt: 1,
    keySource: "dsh-config",
    keyRef: "OPENCODE_GO_API_KEY",
    account: {
      rolling: { status: null, percent: 32, resetsAt: "2026-10-23T20:00:00Z" },
      weekly: null,
      monthly: { status: "active", percent: 9, resetsAt: null },
    },
    error: null,
  };
  assert.equal(parser.parse(value), value);
  assert.throws(() => parser.parse({ fetchedAt: "x" }));
  assert.throws(() => parser.parse({ fetchedAt: 1, account: { rolling: { percent: "x" } } }));
});

test("悬浮弹层进度填充是块级元素（宽度百分比才生效）", () => {
  const client = readFileSync(new URL("../client.js", import.meta.url), "utf8");
  assert.match(client, /\.dsh-gq-row-fill\{display:block/);
  assert.match(client, /\.dsh-gq-fill\{display:block/);
});

console.log(`\n${passed} passed`);
