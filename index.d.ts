/**
 * Mise Auto-Activation Extension
 *
 * Detects mise config files (mise.toml, .mise.toml, .tool-versions) in the
 * project root and silently activates mise for all bash commands run by the
 * LLM. Contributes the mise skill for edge cases (install, trust, tasks).
 *
 * - On session start, scans cwd for mise config files
 * - Automatically trusts the config (idempotent, safe)
 * - Prepends `eval "$(mise activate bash)"` to every bash tool call
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
export default function (pi: ExtensionAPI): void;
