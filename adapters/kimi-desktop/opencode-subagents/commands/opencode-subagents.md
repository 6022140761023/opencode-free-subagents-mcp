---
name: opencode-subagents
description: 通过本机唯一 OpenCode 免费子代理后端执行聚焦小任务或并行会诊（动态选用现役模型，约 200K 上下文上限）。
---

# OpenCode 免费子代理委派

针对 `$ARGUMENTS` 调用 `opencode-subagents` MCP 工具：

1. 查现役模型与推荐配置：调用 `list_free_models`。
2. 单模型聚焦任务：调用 `run_subagent`（可省略 `model` 自动采用后端现役旗舰）。
3. 多模型并行会诊：调用 `parallel_subagents`（直接传 `prompt` 即可由后端自动组队）。
4. 严守约 200K 上下文边界：先用 `Read` / `Grep` 精简上下文，仅传核心片段与少量 `file_paths`。
