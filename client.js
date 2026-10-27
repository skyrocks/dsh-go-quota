// Client 半：在输入框下方常驻显示 OpenCode GO 三窗口用量。
// 手写 lazy-CJS bundle：脚本执行时只注册 factory，模块体在 materialize 时才运行。
window.__ModuleLoader__.load({
  id: "dsh-go-quota",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const GO_PROVIDER = "opencode-go";
    const POLL_MS = 300000;
    const WINDOWS = [
      { key: "rolling", short: "5h", long: "5 小时" },
      { key: "weekly", short: "周", long: "本周" },
      { key: "monthly", short: "月", long: "本月" },
    ];

    // 客户端只声明调用形状；结果校验在 Host 侧完成，这里直通即可。
    // 0.2.1 要求 strict codec 带 create() 工厂。
    const passThrough = () => ({ parse: (value) => value });
    const REMOTE = {
      package: "dsh-go-quota",
      descriptors: [
        {
          id: "dsh-go-quota#goQuota/read",
          service: "goQuota",
          namespace: "goQuota",
          method: "read",
          invocation: { kind: "direct" },
          parameters: [],
          result: {
            mode: "strict",
            typeSymbol: "dsh-go-quota#GoQuotaResult",
            create: passThrough,
          },
        },
        {
          id: "dsh-go-quota#goQuota/refresh",
          service: "goQuota",
          namespace: "goQuota",
          method: "refresh",
          invocation: { kind: "direct" },
          parameters: [],
          result: {
            mode: "strict",
            typeSymbol: "dsh-go-quota#GoQuotaResult",
            create: passThrough,
          },
        },
      ],
    };

    const CSS = [
      ".dsh-gq-dock{position:relative;display:inline-flex;align-items:center;gap:10px;height:18px;font-size:11px;line-height:1;color:var(--dsw-alias-label-tertiary,#8a8f98);cursor:pointer;user-select:none;font-variant-numeric:tabular-nums;outline:none;}",
      "[data-composer-dock] .dsh-gq-dock,[data-composer-dock] > :has(> .dsh-gq-dock){order:99;}",
      ".dsh-gq-dock:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:3px;border-radius:4px;}",
      ".dsh-gq-brand{font-size:10px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-label-secondary,#6b7280);opacity:.85;}",
      ".dsh-gq-item{display:inline-flex;align-items:center;gap:5px;}",
      ".dsh-gq-label{opacity:.75;font-size:10px;}",
      ".dsh-gq-track{position:relative;width:36px;height:4px;border-radius:999px;background:var(--dsw-gq-track,rgba(127,127,127,.25));overflow:hidden;flex:none;}",
      ".dsh-gq-fill{display:block;height:100%;border-radius:inherit;transition:width .35s ease,background-color .2s ease;}",
      ".dsh-gq-pct{min-width:29px;text-align:right;font-size:10.5px;}",
      ".dsh-gq-status{opacity:.7;font-size:10.5px;white-space:nowrap;}",
      ".dsh-gq-dock.is-busy .dsh-gq-status{animation:dsh-gq-pulse 1.1s ease-in-out infinite;}",
      "@keyframes dsh-gq-pulse{0%,100%{opacity:.35}50%{opacity:.9}}",
      ".dsh-gq-pop{position:absolute;left:0;bottom:calc(100% + 8px);z-index:40;width:252px;padding:10px 12px 11px;border-radius:10px;background:var(--dsw-alias-bg-module-platform,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));box-shadow:0 8px 24px rgba(0,0,0,.14);color:var(--dsw-alias-label-primary,#1f2329);cursor:default;}",
      ".dsh-gq-pop-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:7px;}",
      ".dsh-gq-pop-title{font-size:11.5px;font-weight:600;}",
      ".dsh-gq-pop-meta{font-size:10px;color:var(--dsw-alias-label-tertiary,#8a8f98);white-space:nowrap;}",
      ".dsh-gq-row{display:grid;grid-template-columns:42px 1fr 54px;align-items:center;gap:8px;margin-top:6px;font-size:10.5px;}",
      ".dsh-gq-row-name{color:var(--dsw-alias-label-secondary,#6b7280);}",
      ".dsh-gq-row-track{height:5px;border-radius:999px;background:var(--dsw-gq-track,rgba(127,127,127,.25));overflow:hidden;}",
      ".dsh-gq-row-fill{display:block;height:100%;border-radius:inherit;transition:width .35s ease,background-color .2s ease;}",
      ".dsh-gq-row-pct{text-align:right;}",
      ".dsh-gq-row-reset{margin:3px 0 1px;text-align:right;color:var(--dsw-alias-label-tertiary,#8a8f98);font-size:10px;}",
      "@media (max-width:560px){.dsh-gq-brand{display:none}.dsh-gq-label{display:none}.dsh-gq-track{width:26px}.dsh-gq-dock{gap:8px}}",
    ].join("");

    let ctxRef = null;
    let mountReady = null;

    /** 通过 Remote 取一次用量；force 时先让 Host 清缓存。 */
    async function requestUsage(force) {
      await mountReady;
      const api = ctxRef === null ? undefined : ctxRef.get("remote.goQuota");
      if (api === undefined) throw new Error("remote-unavailable");
      if (force) {
        try {
          await api.refresh();
        } catch {
          // 刷新失败时仍尝试读缓存。
        }
      }
      const result = await api.read();
      if (!result || result.ok === false) {
        const reason = result && result.error ? result.error.message || String(result.error) : "remote-failed";
        throw new Error(reason);
      }
      return result.value;
    }

    // 已用部分的颜色：<80% 绿；≥80% 琥珀；≥90% 红。
    function barColor(percent) {
      if (percent === null) return "transparent";
      if (percent >= 90) return "var(--dsw-alias-state-error-primary,#e5484d)";
      if (percent >= 80) return "#e6a23c";
      return "#6bd586";
    }

    // 百分比文字：常态用次要文字色，避免浅绿文字对比度不足；阈值时跟随状态色。
    function textColor(percent) {
      if (percent === null) return "var(--dsw-alias-label-tertiary,#8a8f98)";
      if (percent >= 90) return "var(--dsw-alias-state-error-primary,#e5484d)";
      if (percent >= 80) return "#b45309";
      return "var(--dsw-alias-label-secondary,#6b7280)";
    }

    function percentOf(window) {
      if (!window || typeof window.percent !== "number" || !Number.isFinite(window.percent)) return null;
      return Math.min(100, Math.max(0, window.percent));
    }

    function formatReset(iso) {
      if (typeof iso !== "string" || iso === "") return "";
      const target = new Date(iso).getTime();
      if (!Number.isFinite(target)) return "";
      const delta = target - Date.now();
      if (delta <= 0) return "即将重置";
      const minutes = Math.floor(delta / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days} 天后重置`;
      if (hours > 0) return `${hours} 小时后重置`;
      return `${Math.max(1, minutes)} 分钟后重置`;
    }

    function QuotaItem(props) {
      const percent = percentOf(props.window);
      const color = barColor(percent);
      return React.createElement(
        "span",
        { className: "dsh-gq-item" },
        React.createElement("span", { className: "dsh-gq-label" }, props.label),
        React.createElement(
          "span",
          { className: "dsh-gq-track", "aria-hidden": "true" },
          React.createElement("span", {
            className: "dsh-gq-fill",
            style: { width: `${percent === null ? 0 : percent}%`, backgroundColor: color },
          }),
        ),
        React.createElement(
          "span",
          { className: "dsh-gq-pct", style: { color: textColor(percent) } },
          percent === null ? "—" : `${Math.round(percent)}%`,
        ),
      );
    }

    function Popup(props) {
      const account = props.account;
      const updated = props.fetchedAt ? new Date(props.fetchedAt).toLocaleTimeString() : "";
      return React.createElement(
        "div",
        { className: "dsh-gq-pop" },
        React.createElement(
          "div",
          { className: "dsh-gq-pop-head" },
          React.createElement("span", { className: "dsh-gq-pop-title" }, "OpenCode GO 套餐额度"),
          updated ? React.createElement("span", { className: "dsh-gq-pop-meta" }, `更新 ${updated}`) : null,
        ),
        WINDOWS.map((entry) => {
          const window = account ? account[entry.key] : null;
          const percent = percentOf(window);
          const color = barColor(percent);
          return React.createElement(
            React.Fragment,
            { key: entry.key },
            React.createElement(
              "div",
              { className: "dsh-gq-row" },
              React.createElement("span", { className: "dsh-gq-row-name" }, entry.long),
              React.createElement(
                "span",
                { className: "dsh-gq-row-track" },
                React.createElement("span", {
                  className: "dsh-gq-row-fill",
                  style: { width: `${percent === null ? 0 : percent}%`, backgroundColor: color },
                }),
              ),
              React.createElement(
                "span",
                { className: "dsh-gq-row-pct", style: { color: textColor(percent) } },
                percent === null ? "未知" : `${Math.round(percent)}%`,
              ),
            ),
            React.createElement(
              "div",
              { className: "dsh-gq-row-reset" },
              formatReset(window && window.resetsAt) || "重置时间未知",
            ),
          );
        }),
      );
    }

    function Dock(props) {
      const sessionId = props && props.sessionId;
      const [usage, setUsage] = React.useState(null);
      const [status, setStatus] = React.useState("idle");
      const [error, setError] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [hover, setHover] = React.useState(false);
      const [provider, setProvider] = React.useState(undefined);
      const alive = React.useRef(true);
      const generation = React.useRef(0);

      const load = React.useCallback(async (force) => {
        const id = generation.current + 1;
        generation.current = id;
        setStatus((current) => (current === "ready" ? current : "loading"));
        try {
          const value = await requestUsage(force);
          if (!alive.current || generation.current !== id) return;
          setUsage(value);
          if (value && value.account) {
            setStatus("ready");
            setError(value.error || null);
          } else {
            setStatus("error");
            setError((value && value.error) || "empty");
          }
        } catch (failure) {
          if (!alive.current || generation.current !== id) return;
          setStatus("error");
          setError(failure && failure.message ? failure.message : String(failure));
        }
      }, []);

      React.useEffect(() => {
        return () => {
          alive.current = false;
        };
      }, []);

      // 当前会话的模型 provider：非 opencode-go 时整条隐藏。
      React.useEffect(() => {
        if (!sessionId) {
          setProvider(undefined);
          return;
        }
        let store = null;
        try {
          const directories = ctxRef === null ? undefined : ctxRef.get("modelDirectories");
          if (directories !== undefined) store = directories.directoryFor(sessionId).store;
        } catch {
          store = null;
        }
        if (!store) {
          setProvider(undefined);
          return;
        }
        const read = () => {
          try {
            const snapshot = store.getSnapshot();
            const current = snapshot && snapshot.current;
            setProvider(current && typeof current.provider === "string" ? current.provider : undefined);
          } catch {
            setProvider(undefined);
          }
        };
        read();
        const dispose = typeof store.subscribe === "function" ? store.subscribe(read) : undefined;
        return () => {
          if (typeof dispose === "function") dispose();
        };
      }, [sessionId]);

      const isGo = provider === undefined || provider === GO_PROVIDER;

      React.useEffect(() => {
        if (!isGo) return;
        load(false);
        const timer = ctxRef === null ? undefined : ctxRef.get("timer");
        let stop;
        if (timer !== undefined && typeof timer.interval === "function") {
          stop = timer.interval(() => {
            load(false);
          }, POLL_MS);
        } else {
          const handle = setInterval(() => {
            load(false);
          }, POLL_MS);
          stop = () => clearInterval(handle);
        }
        return () => {
          if (typeof stop === "function") stop();
        };
      }, [isGo, load]);

      if (!isGo) return null;

      const activate = () => {
        if (busy) return;
        setBusy(true);
        load(true).finally(() => {
          if (alive.current) setBusy(false);
        });
      };

      const account = usage && usage.account ? usage.account : null;
      const title =
        status === "ready" && account
          ? `${WINDOWS.map((entry) => `${entry.short} ${percentOf(account[entry.key]) === null ? "—" : `${Math.round(percentOf(account[entry.key]))}%`}`).join(" · ")}（点击刷新）`
          : status === "error"
            ? `${describeError(error, usage)}（点击重试）`
            : "OpenCode GO 用量";

      const content = [];
      content.push(React.createElement("span", { className: "dsh-gq-brand", key: "brand" }, "GO"));
      if (status === "ready" && account) {
        for (const entry of WINDOWS) {
          content.push(
            React.createElement(QuotaItem, {
              key: entry.key,
              label: entry.short,
              window: account[entry.key],
            }),
          );
        }
      } else if (status === "error") {
        const missing = error === "no-key" || error === "no-config";
        content.push(
          React.createElement(
            "span",
            { className: "dsh-gq-status", key: "status" },
            missing ? "未配置" : busy ? "刷新中…" : "不可用",
          ),
        );
      } else {
        content.push(
          React.createElement("span", { className: "dsh-gq-status", key: "status" }, busy ? "刷新中…" : "读取中…"),
        );
      }
      if (hover && status === "ready" && account) {
        content.push(
          React.createElement(Popup, { key: "popup", account, fetchedAt: usage && usage.fetchedAt }),
        );
      }

      return React.createElement(
        "div",
        {
          className: busy ? "dsh-gq-dock is-busy" : "dsh-gq-dock",
          role: "button",
          tabIndex: 0,
          title,
          "aria-label": title,
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          onClick: activate,
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              activate();
            }
          },
        },
        content,
      );
    }

    function describeError(error, usage) {
      if (error === "no-config") return "DSH 配置中未找到 opencode-go 的 apiKeyEnv";
      if (error === "no-key") {
        const ref = usage && usage.keyRef ? `（${usage.keyRef}）` : "";
        return `DSH 配置中的凭据引用未配置${ref}`;
      }
      if (error === "unauthorized") return "API Key 已失效（401）";
      if (error === "no-subscription") return "当前账户没有 GO 订阅（403）";
      if (error === "network") return "网络请求失败";
      if (error === "bad-json") return "接口返回无法解析";
      if (error === "empty") return "接口未返回额度数据";
      if (typeof error === "string" && error.startsWith("http-")) return `接口返回 ${error.slice(5)}`;
      return error ? String(error) : "用量读取失败";
    }

    function ensureStyle() {
      if (typeof document === "undefined") return () => {};
      const id = "dsh-go-quota-style";
      const existing = document.getElementById(id);
      if (existing) return () => {};
      const element = document.createElement("style");
      element.id = id;
      element.textContent = CSS;
      document.head.appendChild(element);
      return () => {
        element.remove();
      };
    }

    function apply(ctx) {
      ctxRef = ctx;
      mountReady = ctx.remote.$mount(REMOTE);
      const slots = ctx.get("slots");
      if (slots === undefined) return;
      ctx.effect(() => ensureStyle());
      slots.inject("conversation.composer.dock", () =>
        slots.register(
          { name: "conversation.composer.dock", id: "go-quota-dock", order: 5 },
          (props) => React.createElement(Dock, { sessionId: props && props.sessionId }),
        ),
      );
    }

    exports.apply = apply;
    exports.inject = ["slots", "remote"];
    return module.exports;
  },
});
