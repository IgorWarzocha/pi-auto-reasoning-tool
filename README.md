# pi-auto-reasoning-tool

A small [Pi](https://pi.dev) package that lets agents adjust their own reasoning level with a `change_reasoning` tool.

The tool is intentionally minimal: the agent directly chooses a level, and the extension calls Pi's `setThinkingLevel` API. No scoring rubric, no UI, no commands.

## Why

Pi already supports reasoning levels. This package exposes that control as an agent-callable tool so the agent can raise or lower its budget when a user prompt looks like substantial follow-up work.

It is meant to be conservative: the tool prompt tells the agent that it often does **not** need to call the tool.

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
level: off | minimal | low | medium | high | xhigh
```

Behavior:

1. Agent chooses `level`.
2. Extension calls `pi.setThinkingLevel(level)`.
3. Tool result reports the previous and applied level.
4. If Pi clamps the requested level because of model capability, the result says so.

## Agent-facing prompt copy

Description:

> Set your reasoning level for the current task.

Prompt snippet:

> Set reasoning level when the user prompt implies substantial follow-up work: default medium; low for small/simple, high for hard/risky/broad, xhigh extreme.

Guidelines:

> Consider change_reasoning only after analyzing whether the user prompt implies substantial follow-up work; it often does not need to be called.

> Default to medium for substantial normal coding/debugging work or when unsure.

> Skip change_reasoning for answers, quick checks, or obvious/simple/mechanical tasks unless the current level is clearly wrong.

Parameter:

`level`

> Reasoning level to use for this task.

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
