# 常驻规则：主动调度 OpenCode 免费模型子代理集群（薄接入层）

你通过轻量接入层连接本机唯一的 OpenCode 免费子代理后端（`http://127.0.0.1:8787`），由后端统一维护现役免费模型列表与默认主力分配，不在客户端写死模型清单。

> **重要上下文边界**：免费通道的实际有效上下文上限约 **200K tokens**。仅用于分担**聚焦的小任务或具体专项工作**（如局部代码审查、单文件/少量相关文件分析、独立小脚本生成、疑难问题第二视角会诊），**切勿一次性塞入超长上下文或整个大型代码库**。

## 主动委派原则

1. **何时主动调用免费子代理**：
   - 当用户要求“叫子代理/小弟帮忙”、“多模型会诊/对比”，或输入 `/free-team` 时；
   - 当遇到可拆分的**聚焦小任务**时，主动派免费子代理分担并控制上下文精简（`file_paths` 上限 120K 字符）。
2. **MCP + CLI 双通道保障**：
   - 若当前上下文已有 `opencode-subagents` MCP 工具：
     - 查现役模型：`list_free_models({})`
     - 单模型委派：`run_subagent({ prompt: "...", file_paths: [...] })`（省略 `model` 或传 `"auto"` 由后端自动选现役旗舰）
     - 多模型并诊：`parallel_subagents({ prompt: "...", file_paths: [...] })`（直接由后端自动召集现役默认 3 席团队，或自定义 `tasks`）
   - 若当前会话尚未注入该 MCP 工具声明，直接通过 `run_command` 调用直通脚本：
     - 自动团队并诊：`node "<OPENCODE_PROXY_DIR>/cli-subagent.mjs" team --prompt "具体任务"`
     - 单模型专项委派：`node "<OPENCODE_PROXY_DIR>/cli-subagent.mjs" run --prompt "具体任务"`
