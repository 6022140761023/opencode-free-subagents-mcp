# OpenCode Free Subagents MCP

将本机 **OpenCode 免费模型池** 封装为一套本地 **OpenAI 兼容反代 + 无状态 MCP 服务**，并为 **Antigravity、Kimi Desktop、Codex、DeepSeek Harness** 提供开箱即用的**极薄客户端接入层（Thin Connectors）**。

> **核心架构原则：单一后端自治 + 各端极薄连接层**
> - 底层只运行**唯一一份**后端服务（`http://127.0.0.1:8787`），统一负责同步在线免费模型目录、动态分配默认主力、请求格式转换与上下文护栏。
> - 各个 AI 客户端（Antigravity / Kimi Desktop / Codex / DeepSeek Harness）侧仅保留几 KB 的轻量接入插件或片段，**不写死易变动的上游模型名**，也不重复拷贝运行库或缓存。

---

## 核心特性

1. **单一后台服务，多端共用**
   - 同时提供 OpenAI 兼容接口（`/v1/models`、`/v1/chat/completions`、`/v1/responses`）与 Streamable HTTP MCP 接口（`/mcp`），以及支持按需静默拉起后台守护进程的 Stdio MCP 桥（`mcp-server.mjs`）。
2. **动态现役模型追踪与自动组队**
   - 支持通过 `POST /v1/models/refresh` 同步上游最新免费模型列表，自动剔除已下线（`deprecated`）模型。
   - 当客户端省略 `model` 或向 `parallel_subagents` 仅传入 `prompt` 时，后端自动从现役池中挑出当前旗舰、敏捷编码、中文/摘要 3 席团队并行会诊，上游模型轮换时无需改动各个客户端插件。
3. **内置约 200K 有效上下文护栏**
   - 免费上游通道的有效上下文窗口实测上限约为 **200K tokens**。
   - MCP 工具描述与 `file_paths` 读取器均自带提示与防超限裁剪（单文件上限 `60,000` 字符、总计上限 `120,000` 字符），专为**聚焦小任务、局部代码审查、单/少数文件分析、独立脚本编写与多模型交叉验证**设计。
4. **全客户端适配包（`adapters/`）**
   - **Antigravity**：完整插件包（`plugin.json` + 常驻主动委派规则 `AGENTS.md` + `/free-team` 技能 + `mcp_config.example.json`）
   - **Kimi Desktop**：符合官方 `plugin-builder` 规范的个人插件（`kimi.plugin.json` + 自动自启 `run-mcp.mjs` + `/free-team` & `/opencode-subagents` 命令 + `zh-CN`/`en-US` 双语清单）
   - **Codex**：`config.snippet.toml` 与 `free-subagents` Skill
   - **DeepSeek Harness**：`cordis.patch.snippet.yml` 声明片段

---

## 目录结构

```text
opencode-free-subagents-mcp/
├── server.mjs                   # 唯一后端：OpenAI 兼容反代 + Streamable HTTP MCP + 动态选模
├── mcp-server.mjs               # Stdio MCP 桥接器（未启动后台时自动静默唤醒）
├── cli-subagent.mjs             # 零配置 CLI 直通脚本（list / run / team）
├── manage.mjs                   # 服务管理（start / stop / restart / status / install-autostart）
├── start-hidden.vbs             # Windows 无窗口后台拉起脚本
├── start.bat / stop.bat / status.bat
├── config.example.json          # 本地配置文件模板（可复制为 config.json 自定义）
├── opencode-signature.json      # OpenCode 请求头与协议签名模板
├── scripts/
│   └── install-adapters.mjs     # 一键安装各客户端薄接入层脚本
└── adapters/
    ├── antigravity/             # Antigravity 插件与 MCP 示例配置
    ├── kimi-desktop/            # Kimi Desktop 个人市场插件源码
    ├── codex/                   # Codex CLI/App MCP 片段与 Skill
    └── deepseek-harness/        # DeepSeek Harness Cordis 配置片段
```

---

## 快速开始

### 前置依赖

- **Node.js `v22+`**（需支持内置 `node:sqlite` 与原生 `fetch`；推荐 `v24+`）
- 本机已安装 **OpenCode Desktop**（Windows 后台启动脚本会优先使用 `%LOCALAPPDATA%\Programs\ai.opencode.desktop\resources\opencode-cli.exe` 在 `BUN_BE_BUN=1` 下托管启动，匹配原生 TLS 指纹；若未找到则回退为 `node server.mjs`）

### 1. 克隆并启动唯一后端

```bash
git clone https://github.com/6022140761023/opencode-free-subagents-mcp.git
cd opencode-free-subagents-mcp

# 可选：按需复制配置文件模板
cp config.example.json config.json

# 启动后台常驻服务（Windows）
node manage.mjs start

# 查看运行状态与已同步模型数量
node manage.mjs status
```

常用运维命令：

```bash
node manage.mjs restart            # 重启后台服务
node manage.mjs stop               # 停止后台服务
node manage.mjs install-autostart  # 注册 Windows 开机后台静默自启
```

刷新上游最新可用免费模型目录：

```bash
curl -X POST http://127.0.0.1:8787/v1/models/refresh
```

### 2. 一键安装各 Agent 客户端薄接入层

```bash
# 安装全部可检测到的客户端（Antigravity + Codex + Kimi Desktop 源码）
node scripts/install-adapters.mjs --all

# 或按需单独安装某一个客户端
node scripts/install-adapters.mjs --antigravity
node scripts/install-adapters.mjs --codex
node scripts/install-adapters.mjs --kimi
node scripts/install-adapters.mjs --print-dsh
```

> **Kimi Desktop 额外一步**：运行 `--kimi` 后，使用 Kimi 的 `plugin-builder`（`validate_plugin.py` → `register_personal.py`）登记到个人市场，然后在 Kimi Desktop 插件页 **「个人」** 页签点击 **`+` 安装**即可热加载生效。

### 3. CLI 快速验证

```bash
# 查看当前在线免费模型及后端自动推荐组合
node cli-subagent.mjs list

# 自动调用当前旗舰免费子代理处理聚焦问题
node cli-subagent.mjs run --prompt "检查这段代码的边界条件" --file path/to/file.js

# 自动并行唤醒现役 3 席团队交叉会诊
node cli-subagent.mjs team --prompt "从架构、实现 Bug、边界条件三个视角审查此模块" --file path/to/file.js
```

---

## MCP 工具说明

| 工具名 | 说明 | 关键参数 |
| :--- | :--- | :--- |
| `list_free_models` | 实时查询当前全部现役免费模型、思考挡位与动态推荐主力 | 无 |
| `run_subagent` | 向单个免费子代理委派聚焦任务 | `prompt`（必填）, `model`（可选，默认 `"auto"`）, `reasoning_effort`, `system_prompt`, `file_paths` |
| `parallel_subagents` | 并行唤醒多个免费子代理同时分析 | `prompt`（省略 `tasks` 时自动组建现役 3 模型团队）或 `tasks`, `reasoning_effort`, `file_paths` |

---

## 使用注意事项

- **遵守约 200K 上下文边界**：切勿将整个大型仓库、数十个无关文件或巨型日志直接传入 `file_paths`；先在主代理中精确定位代码范围后，再交由免费子代理分担局部工作。
- **隐私与本地状态**：运行时生成的 `config.json`、`models-cache.json`、`proxy.log`、`proxy.pid` 已被 `.gitignore` 忽略，不会随仓库提交。
- **合规边界**：本项目仅用于个人本地学习、开发辅助与多 Agent MCP 接口统一调试；上游免费模型的可用性、限流策略与上下线以 OpenCode 官方为准。

---

## License

[MIT](./LICENSE)
