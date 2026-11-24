---
name: free-team
description: 召集 OpenCode 后端现役免费子代理团队并行会诊（薄连接自动选模型，仅用于聚焦小任务，有效上下文约 200K）。
---

# 免费模型并行会诊 (`/free-team`)

针对任务：`$ARGUMENTS`

1. 若涉及代码或文件，先用 `Read` / `Grep` 裁出关键片段或少数核心文件（严守 **约 200K tokens** 有效上限）。
2. 直接调用 `parallel_subagents` 并传入 `prompt`（以及可选的精简 `file_paths`），由后端自动分配现役 3 模型团队并行会诊（如需特定模型，先调用 `list_free_models` 确认现役清单）。
3. 对比各子代理的共识与分歧，核实代码实况后给出最终结论。
