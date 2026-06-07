# @capotej/pi-mise

Auto-activates [mise](https://mise.jdx.dev/) for [pi](https://github.com/mariozechner/pi-coding-agent) coding sessions.

When this pi package is installed and a `mise.toml`, `.mise.toml`, or `.tool-versions` file is detected in the project root, it automatically:

- **Trusts** the mise configuration (idempotent, safe)
- **Prepends** `eval "$(mise activate bash)"` to every `bash` tool call, ensuring all commands run with the correct tool versions
- **Contributes** the `mise` skill for edge cases (manual install, trust, tasks)

## Installation

```bash
pi install @capotej/pi-mise
```

## How It Works

1. On **session start**, the extension checks if `mise` is available in `PATH`
2. It scans the project root for mise config files (`mise.toml`, `.mise.toml`, `.tool-versions`)
3. If a config is found, it runs `mise trust <config>` so mise won't prompt for trust
4. Every subsequent `bash` tool call is automatically prefixed with `eval "$(mise activate bash)"`, so the LLM's commands run with mise-managed tools on `PATH`
5. A notification is shown when mise is activated (or if mise is missing)

If no mise config file is found, the extension does nothing — zero overhead.

## Requirements

- `mise` must be installed and available in `PATH`
- A mise config file (`mise.toml`, `.mise.toml`, or `.tool-versions`) in the project root

## The `mise` Skill

This package also contributes a `mise` skill that teaches the LLM how to:

- Use `mise exec` for one-off commands
- Run mise tasks with `mise run`
- Install tools with `mise install`
- Handle trust, activation, and common pitfalls

> **Note:** When the pi-mise extension is active, mise activation is already prepended to every bash command. The skill instructs the LLM **not** to manually add `eval "$(mise activate bash)"` — it's handled automatically.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## License

MIT © Julio Capote
