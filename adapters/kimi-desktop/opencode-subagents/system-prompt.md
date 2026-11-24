# OpenCode 免费子代理集群协作规范（薄接入层）

当启用 `opencode-subagents` MCP 工具（`list_free_models`、`run_subagent`、`parallel_subagents`）时，遵循以下约定：

1. **后端单一事实来源**：不在客户端写死易变更的模型名称；省略 `model` 或仅传 `prompt` 给 `parallel_subagents` 即可由唯一后端自动选用当前现役模型（需要指定模型时先调 `list_free_models`）。
2. **严守 200K 有效上下文上限**：免费通道有效上下文约 **200K tokens**，只分担聚焦小任务与少数直接相关的 `file_paths`，切勿塞入超长历史或全量代码库。
3. **主控核实原则**：子代理回复仅作参考线索，修改代码或下最终技术结论前须用 `Read` / `Bash` 等本地工具亲自核实。
