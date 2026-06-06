/**
 * Mise Auto-Activation Extension
 *
 * Detects mise config files (mise.toml, .mise.toml, .tool-versions) in the
 * project root and silently activates mise for all bash commands run by the
 * LLM. Contributes the mise skill for edge cases (install, trust, tasks).
 *
 * - On session start, scans cwd for mise config files
 * - Asks the user to confirm activation (and trusts the config)
 * - Prepends `eval "$(mise activate bash)"` to every bash tool call
 */

import { existsSync } from "node:fs";
import { execFile } from "node:child_process/promises";
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
			await execFile(miseBinary, ["--version"], { stdio: "pipe" });
		} catch {
			if (ctx.hasUI) {
				ctx.ui.notify("pi-mise: mise not found in PATH, skipping activation", "warn");
			}
			return;
		}

		const config = findMiseConfig(ctx.cwd);
		if (!config) return;

		// Trust the config so mise activate won't error
		try {
			await execFile(miseBinary, ["trust", config], {
				cwd: ctx.cwd,
			});
		} catch {
			// trust may fail if already trusted or if mise is misconfigured
			// proceed anyway — activation will surface the real error
		}

		if (!ctx.hasUI) {
			// Non-interactive mode — activate without prompting
			miseActive = true;
			return;
		}

		const confirmed = await ctx.ui.confirm(
			"mise auto-activation",
			`Found ${config}. Activate mise and trust this config?`,
		);

		if (!confirmed) {
			ctx.ui.notify("mise activation skipped", "info");
			return;
		}

		miseActive = true;
		ctx.ui.notify(`mise activated (${config})`, "success");
	});

	pi.on("resources_discover", async () => {
		return {
			skillPaths: [join(__dirname, "..", "skills", "mise")],
		};
	});

	pi.on("tool_call", async (event, _ctx) => {
		if (!miseActive) return;

		if (isToolCallEventType("bash", event)) {
			event.input.command = `eval "$(${miseBinary} activate bash)" && ${event.input.command}`;
		}
	});
}
