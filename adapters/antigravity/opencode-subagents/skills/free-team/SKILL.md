---
name: free-team
description: >-
  当用户提到 /free-team、免费子代理、多模型会诊、代码审查或并行处理聚焦小任务时立即激活此技能（连接本机唯一 OpenCode 免费后端，有效上下文上限约 200K，切勿塞入超长上下文）。
---

# OpenCode 免费子代理集群调度指南 (`/free-team`)

本技能仅作为轻量接入层，直连本机唯一后端 `http://127.0.0.1:8787`。现役免费模型目录与默认主力推荐由后端实时同步与分配，避免上游模型上下线时在多个客户端重复修改。

> **重要使用边界（约 200K 上下文限制）**
> - **适用场景**：聚焦小任务、局部代码审查、单文件或少数相关文件分析、独立模块/脚本编写、多模型思路交叉验证。
> - **避免场景**：不要一次性塞入超长上下文、整库代码或巨型日志（`file_paths` 自动限流在 120,000 字符以内）。

## 调用方式（双通道保障）

### 方式 A：MCP 工具（若当前会话已加载 `opencode-subagents`）
- **查看实时现役模型**：`list_free_models({})`
- **单子代理委派**：`run_subagent({ prompt: "...", file_paths: [...] })`（省略 `model` 即自动使用后端现役旗舰，也可指定 `list_free_models` 返回的任意模型 ID）
- **多模型并行会诊**：`parallel_subagents({ prompt: "...", file_paths: [...] })`（省略 `tasks` 即自动并行唤醒后端推荐的现役 3 模型会诊团队）

### 方式 B：零延迟 CLI 直通车（若未加载 MCP 工具声明，用 `run_command` 执行）
- **自动团队并行会诊**：
  ```powershell
  node "<OPENCODE_PROXY_DIR>/cli-subagent.mjs" team --prompt "你的聚焦任务或问题" --file "可选少量关键文件路径"
  ```
- **单模型委派**：
  ```powershell
  node "<OPENCODE_PROXY_DIR>/cli-subagent.mjs" run --prompt "你的聚焦任务或问题" --file "可选少量关键文件路径"
  ```
- **查看实时模型清单**：
  ```powershell
  node "<OPENCODE_PROXY_DIR>/cli-subagent.mjs" list
  ```
