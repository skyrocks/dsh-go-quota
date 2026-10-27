// Typert Host 清单：声明 goQuota/read 与 goQuota/refresh 两个 direct 调用。
// 0.2.1 strict codec 必须是 `{ mode, typeSymbol, create() }`；缺少 create 会让
// typert gateway 撤回全部 strict 定义，进而拖垮整个客户端连接。
//
// 这里不依赖 zod：目录方式安装（pnpm link:）不会安装插件自己的 dependencies，
// 用内置校验可以让「粘贴本地目录」和 tarball 两种安装方式都不缺依赖。

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function fail(field, expected) {
  throw new Error(`dsh-go-quota result: ${field} must be ${expected}`);
}

function parseWindow(field, value) {
  if (value === null) return null;
  if (!isRecord(value)) fail(field, "an object or null");
  if (value.status !== null && typeof value.status !== "string") fail(`${field}.status`, "a string or null");
  if (value.resetsAt !== null && typeof value.resetsAt !== "string") fail(`${field}.resetsAt`, "a string or null");
  if (value.percent !== null && (typeof value.percent !== "number" || !Number.isFinite(value.percent))) {
    fail(`${field}.percent`, "a finite number or null");
  }
  return value;
}

/** `create()` 返回的 parser：校验 Host 结果的 wire 形状。 */
function parseResult(value) {
  if (!isRecord(value)) fail("result", "an object");
  if (typeof value.fetchedAt !== "number" || !Number.isFinite(value.fetchedAt)) fail("fetchedAt", "a finite number");
  if (value.keySource !== null && typeof value.keySource !== "string") fail("keySource", "a string or null");
  if (value.keyRef !== null && typeof value.keyRef !== "string") fail("keyRef", "a string or null");
  if (value.error !== null && typeof value.error !== "string") fail("error", "a string or null");
  if (value.account !== null) {
    if (!isRecord(value.account)) fail("account", "an object or null");
    for (const key of ["rolling", "weekly", "monthly"]) {
      parseWindow(`account.${key}`, value.account[key] === undefined ? null : value.account[key]);
    }
  }
  return value;
}

const resultCodec = {
  mode: "strict",
  typeSymbol: "dsh-go-quota#GoQuotaResult",
  create: () => ({ parse: parseResult }),
};

const invocation = (method) => ({
  id: `dsh-go-quota#goQuota/${method}`,
  service: "goQuota",
  namespace: "goQuota",
  method,
  invocation: { kind: "direct" },
  parameters: [],
  result: resultCodec,
});

export const TYPERT = {
  package: "dsh-go-quota",
  face: "host",
  schemas: [],
  invocations: [invocation("read"), invocation("refresh")],
  model: { services: [], events: [], objects: [] },
};
