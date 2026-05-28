# pi-auto-reasoning-tool

A small [Pi](https://pi.dev) package that lets agents adjust their own reasoning level with a `change_reasoning` tool.

The tool is intentionally minimal: the agent directly chooses `low`, `medium`, or `high`, and the extension calls Pi's `setThinkingLevel` API. No scoring rubric, no UI, no commands.

After every successful/non-retryable agent run, the extension restores reasoning to the session's starting level. Retryable transport/provider failures keep the current level so Pi's auto-retry does not accidentally drop the agent back to the baseline.

## Why

Pi already supports reasoning levels. This package exposes a narrow agent-callable tool so the agent can raise or lower its budget when a prompt or in-progress discovery actually needs it, while returning to the user's starting level afterward.

The prompt is conservative: agents are told to use the tool sparingly and preferably in parallel with other useful tool calls, avoiding standalone reasoning-change turns.

## Install

```bash
pi install npm:@howaboua/pi-auto-reasoning-tool
```

Or add it to your Pi settings:

```json
{
  "packages": ["npm:@howaboua/pi-auto-reasoning-tool"]
}
```

Then restart Pi or run `/reload`.

## Tool

Registers one tool:

```text
change_reasoning
```

Parameters:

```text
level: low | medium | high
```

Behavior:

1. Agent chooses `level`.
2. Extension calls `pi.setThinkingLevel(level)`.
3. Tool result reports the previous and applied level.
4. If Pi clamps the requested level because of model capability, the result says so.
5. On the first `agent_start`, the extension captures the session's starting reasoning level.
6. On `agent_end`, the extension restores reasoning to that starting level unless the last assistant message is a retryable error.

## Agent-facing prompt copy

Description:

> Set your reasoning level for the current task.

Prompt snippet:

> Set reasoning level sparingly: low default/simple/back-and-forth/cleanup; medium complex single task or feature planning; high multiple tasks, architecture-spanning work, or unexpectedly hard issues.

Guidelines:

> Use change_reasoning sparingly; it is often unnecessary because low is the default operating mode.

> Prefer calling change_reasoning in parallel with other useful tool calls so you do not waste a turn only changing reasoning.

> Use low for single simple tasks, back-and-forth conversations, or simple cleanup after harder tasks.

> Use medium for complex single tasks or planning features.

> Use high for handling multiple tasks in one turn, work spanning different architecture elements, or unexpected hard-to-solve issues during a turn.

Parameter:

`level`

> Reasoning level to use for this task: low, medium, or high.

## Development

```bash
npm install
npm run check
pi -e ./src/index.ts
```

## Publish

```bash
npm publish --access public
```

## License

MIT
