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

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

const MISE_CONFIG_FILES = ["mise.toml", ".mise.toml", ".tool-versions"];

const __dirname = dirname(fileURLToPath(import.meta.url));

function findMiseConfig(cwd: string): string | null {
	for (const file of MISE_CONFIG_FILES) {
		if (existsSync(join(cwd, file))) {
			return file;
		}
	}
	return null;
}

export default function (pi: ExtensionAPI) {
	let miseActive = false;
	const miseBinary = "mise";

	pi.on("session_start", async (_event, ctx) => {
		miseActive = false;

		// Skip if mise is not installed
		try {
			await pi.exec(miseBinary, ["--version"], {});
		} catch {
			if (ctx.hasUI) {
				ctx.ui.notify("pi-mise: mise not found in PATH, skipping activation", "warn");
			}
			return;
		}

		const config = findMiseConfig(ctx.cwd);
		if (!config) {
			return;
		}

		// Trust the config so mise activate won't error
		try {
			await pi.exec(miseBinary, ["trust", config], {
				cwd: ctx.cwd,
			});
		} catch {
			// trust may fail if already trusted or if mise is misconfigured
			// proceed anyway — activation will surface the real error
		}

		miseActive = true;

		if (ctx.hasUI) {
			ctx.ui.notify(`mise activated (${config})`, "success");
		}
	});

	pi.on("resources_discover", () => {
		return {
			skillPaths: [join(__dirname, "..", "skills", "mise")],
		};
	});

	pi.on("tool_call", (event, _ctx) => {
		if (!miseActive) {
			return;
		}

		if (isToolCallEventType("bash", event)) {
			event.input.command = `eval "$(${miseBinary} activate bash)" && ${event.input.command}`;
		}
	});
}
