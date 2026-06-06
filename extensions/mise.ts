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

function getMiseBinary(): string {
	const locations = [
		"/usr/local/bin/mise",
		join(process.env.HOME ?? "/root", ".local/bin/mise"),
	];
	for (const loc of locations) {
		if (existsSync(loc)) return loc;
	}
	return "mise";
}

export default function (pi: ExtensionAPI) {
	let miseActive = false;
	let miseBinary = "mise";

	pi.on("session_start", async (_event, ctx) => {
		miseActive = false;

		const config = findMiseConfig(ctx.cwd);
		if (!config) return;

		miseBinary = getMiseBinary();

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

		// Trust the config so mise activate won't error
		const { execSync } = await import("node:child_process");
		try {
			execSync(`${miseBinary} trust ${config}`, {
				cwd: ctx.cwd,
				stdio: "pipe",
			});
		} catch {
			// trust may fail if already trusted or if mise is misconfigured
			// proceed anyway — activation will surface the real error
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
			if (!event.input.command.includes("mise activate")) {
				event.input.command = `eval "$(${miseBinary} activate bash)" && ${event.input.command}`;
			}
		}
	});
}
