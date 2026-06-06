# @capotej/pi-mise

Auto-activates [mise](https://mise.jdx.dev/) for pi coding sessions.

When this pi package is installed and a `mise.toml`, `.mise.toml`, or `.tool-versions` file is detected in the project root, it automatically:

- Trusts the mise configuration
- Prepends `eval "$(mise activate bash)"` to every `bash` tool call
- Contributes the `mise` skill for managing tool versions

## Installation

```bash
pi install @capotej/pi-mise
```

## Requirements

- `mise` must be installed and available in `PATH`

## License

MIT
