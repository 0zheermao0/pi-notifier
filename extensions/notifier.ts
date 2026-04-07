import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type NotifyEventName = "waitingForInput" | "waitingForDecision";
type BackendName = "applescript";

type NotifierConfig = {
	enabled: boolean;
	backend: BackendName;
	desktop: {
		enabled: boolean;
	};
	sound: {
		enabled: boolean;
		name?: string;
	};
	events: {
		waitingForInput: boolean;
		waitingForDecision: boolean;
	};
	dedupe: {
		minIntervalMs: number;
	};
	messages: {
		waitingForInput: {
			title: string;
			body: string;
		};
		waitingForDecision: {
			title: string;
			body: string;
		};
	};
};

const DEFAULT_CONFIG: NotifierConfig = {
	enabled: true,
	backend: "applescript",
	desktop: {
		enabled: true,
	},
	sound: {
		enabled: true,
		name: "Glass",
	},
	events: {
		waitingForInput: true,
		waitingForDecision: true,
	},
	dedupe: {
		minIntervalMs: 2000,
	},
	messages: {
		waitingForInput: {
			title: "Pi",
			body: "Ready for input",
		},
		waitingForDecision: {
			title: "Pi",
			body: "Waiting for your decision",
		},
	},
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
	if (!isRecord(base) || !isRecord(override)) return (override as T) ?? base;

	const result: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		const current = result[key];
		if (isRecord(current) && isRecord(value)) {
			result[key] = deepMerge(current, value);
		} else {
			result[key] = value;
		}
	}
	return result as T;
}

function readJsonFile(filePath: string): unknown {
	if (!existsSync(filePath)) return undefined;
	const text = readFileSync(filePath, "utf8");
	return JSON.parse(text);
}

function clampConfig(input: NotifierConfig): NotifierConfig {
	const minIntervalMs =
		typeof input.dedupe.minIntervalMs === "number" &&
		Number.isFinite(input.dedupe.minIntervalMs)
			? Math.max(0, Math.floor(input.dedupe.minIntervalMs))
			: DEFAULT_CONFIG.dedupe.minIntervalMs;

	return {
		enabled: Boolean(input.enabled),
		backend: "applescript",
		desktop: {
			enabled: Boolean(input.desktop.enabled),
		},
		sound: {
			enabled: Boolean(input.sound.enabled),
			name:
				typeof input.sound.name === "string" && input.sound.name.trim()
					? input.sound.name.trim()
					: undefined,
		},
		events: {
			waitingForInput: Boolean(input.events.waitingForInput),
			waitingForDecision: Boolean(input.events.waitingForDecision),
		},
		dedupe: {
			minIntervalMs,
		},
		messages: {
			waitingForInput: {
				title:
					typeof input.messages.waitingForInput.title === "string"
						? input.messages.waitingForInput.title
						: DEFAULT_CONFIG.messages.waitingForInput.title,
				body:
					typeof input.messages.waitingForInput.body === "string"
						? input.messages.waitingForInput.body
						: DEFAULT_CONFIG.messages.waitingForInput.body,
			},
			waitingForDecision: {
				title:
					typeof input.messages.waitingForDecision.title === "string"
						? input.messages.waitingForDecision.title
						: DEFAULT_CONFIG.messages.waitingForDecision.title,
				body:
					typeof input.messages.waitingForDecision.body === "string"
						? input.messages.waitingForDecision.body
						: DEFAULT_CONFIG.messages.waitingForDecision.body,
			},
		},
	};
}

function loadConfig(cwd: string): {
	config: NotifierConfig;
	warnings: string[];
	paths: string[];
} {
	const warnings: string[] = [];
	const paths = [
		path.join(os.homedir(), ".pi", "agent", "pi-notifier.json"),
		path.join(cwd, ".pi", "pi-notifier.json"),
	];

	let merged: NotifierConfig = DEFAULT_CONFIG;
	for (const filePath of paths) {
		try {
			const parsed = readJsonFile(filePath);
			if (parsed !== undefined) merged = deepMerge(merged, parsed);
		} catch (error) {
			warnings.push(
				`Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return { config: clampConfig(merged), warnings, paths };
}

function escapeAppleScriptString(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function execFileAsync(command: string, args: string[]): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		execFile(command, args, (error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}

async function notifyMacOS(
	title: string,
	body: string,
	soundEnabled: boolean,
	soundName?: string,
): Promise<void> {
	const escapedTitle = escapeAppleScriptString(title);
	const escapedBody = escapeAppleScriptString(body);
	let script = `display notification "${escapedBody}" with title "${escapedTitle}"`;
	if (soundEnabled && soundName) {
		script += ` sound name "${escapeAppleScriptString(soundName)}"`;
	}
	await execFileAsync("osascript", ["-e", script]);
}

export default function notifierExtension(pi: ExtensionAPI) {
	let currentConfig = DEFAULT_CONFIG;
	let configWarnings: string[] = [];
	let configPaths: string[] = [];
	let warningShown = false;
	const lastSentAt = new Map<NotifyEventName, number>();

	function reloadConfig(cwd: string) {
		const loaded = loadConfig(cwd);
		currentConfig = loaded.config;
		configWarnings = loaded.warnings;
		configPaths = loaded.paths;
	}

	function shouldNotify(eventName: NotifyEventName): boolean {
		if (!currentConfig.enabled) return false;
		if (!currentConfig.desktop.enabled) return false;
		if (!currentConfig.events[eventName]) return false;
		if (process.platform !== "darwin") return false;

		const now = Date.now();
		const previous = lastSentAt.get(eventName) ?? 0;
		if (now - previous < currentConfig.dedupe.minIntervalMs) return false;
		lastSentAt.set(eventName, now);
		return true;
	}

	async function sendEventNotification(
		eventName: NotifyEventName,
	): Promise<boolean> {
		if (!shouldNotify(eventName)) return false;
		const message = currentConfig.messages[eventName];
		try {
			await notifyMacOS(
				message.title,
				message.body,
				currentConfig.sound.enabled,
				currentConfig.sound.name,
			);
			return true;
		} catch (error) {
			console.warn(
				`[pi-notifier] Failed to send macOS notification: ${error instanceof Error ? error.message : String(error)}`,
			);
			return false;
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		reloadConfig(ctx.cwd);
		if (!warningShown && configWarnings.length > 0 && ctx.hasUI) {
			warningShown = true;
			ctx.ui.notify(`[pi-notifier] ${configWarnings[0]}`, "warning");
		}
	});

	pi.on("agent_end", async () => {
		await sendEventNotification("waitingForInput");
	});

	pi.registerCommand("pi-notifier-test", {
		description:
			"Send a test macOS notification: /pi-notifier-test [input|decision]",
		handler: async (args, ctx) => {
			reloadConfig(ctx.cwd);
			const mode =
				args.trim() === "decision" ? "waitingForDecision" : "waitingForInput";
			const sent = await sendEventNotification(mode);
			if (!ctx.hasUI) return;
			if (process.platform !== "darwin") {
				ctx.ui.notify("pi-notifier: macOS only", "warning");
				return;
			}
			ctx.ui.notify(
				sent
					? `pi-notifier test sent (${mode})`
					: `pi-notifier test skipped (${mode})`,
				sent ? "info" : "warning",
			);
		},
	});

	pi.registerCommand("pi-notifier-status", {
		description: "Show pi-notifier config status",
		handler: async (_args, ctx) => {
			reloadConfig(ctx.cwd);
			const summary = [
				`enabled=${currentConfig.enabled}`,
				`desktop=${currentConfig.desktop.enabled}`,
				`sound=${currentConfig.sound.enabled}${currentConfig.sound.name ? `:${currentConfig.sound.name}` : ""}`,
				`waitingForInput=${currentConfig.events.waitingForInput}`,
				`waitingForDecision=${currentConfig.events.waitingForDecision}`,
				`dedupe=${currentConfig.dedupe.minIntervalMs}ms`,
				`platform=${process.platform}`,
			].join(" | ");

			if (ctx.hasUI) {
				ctx.ui.notify(summary, "info");
				if (configWarnings.length > 0)
					ctx.ui.notify(configWarnings[0], "warning");
				if (configPaths.length > 0)
					ctx.ui.notify(`config paths: ${configPaths.join(", ")}`, "info");
			}
		},
	});
}
