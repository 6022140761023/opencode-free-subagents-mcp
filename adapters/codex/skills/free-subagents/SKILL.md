---
name: free-subagents
description: Thin connector skill to delegate focused small-to-medium tasks (local code review, targeted debugging, helper scripts, or multi-model second opinions) to the single local OpenCode free sub-agent backend via opencode_subagents MCP. Effective context is capped at ~200K tokens; never stuff huge codebases.
---

Use the MCP tools from `opencode_subagents` (single local backend dynamically tracks active free models so clients never hardcode stale model IDs):
- **Context Budget (~200K effective limit)**: Keep prompts concise and pass only a few directly relevant `file_paths` (backend caps attached files at 120,000 chars total). Do **not** pass entire repositories or huge logs.
- `list_free_models`: Inspect all currently active free models, capabilities, and dynamic recommendations.
- `run_subagent`: Delegate a focused task to a single free model (`model` is optional and defaults to the backend's active flagship, or pass any ID from `list_free_models`).
- `parallel_subagents`: Pass top-level `prompt` (and optional `file_paths`) to automatically fan out across the backend's active 3-model consensus team, or provide custom `tasks`.
