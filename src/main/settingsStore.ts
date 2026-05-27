import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AppSettings } from "../shared/types";
import { DEFAULT_FILENAME_TEMPLATE } from "../shared/naming";

const MOJO_BROLL_INBOX =
  "/Users/mojo/Social Media Growth/Recordings Social Media.nosync/Broll/_inbox/new_unsorted";

export function mojoWorkspaceDetected(): boolean {
  return fs.existsSync(MOJO_BROLL_INBOX);
}

export function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export function getDefaultSettings(): AppSettings {
  const fallbackOutput = path.join(app.getPath("videos"), "B-Roll Recorder");

  return {
    outputDir: mojoWorkspaceDetected() ? MOJO_BROLL_INBOX : fallbackOutput,
    defaultFormatPreset: "vertical",
    defaultQualityPreset: "sharp-ui",
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    defaults: {
      brand: "mojo",
      function: "process",
      subject: "clip",
      action: "scroll"
    },
    hotkeys: {
      recordToggle: "CommandOrControl+Shift+R",
      frameToggle: "CommandOrControl+Shift+F"
    },
    showCursor: true,
    recordAudio: false,
    hasCompletedSetup: false
  };
}

export function loadSettings(): AppSettings {
  const defaults = getDefaultSettings();
  const settingsPath = getSettingsPath();

  if (!fs.existsSync(settingsPath)) {
    return defaults;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Partial<AppSettings>;
    return {
      ...defaults,
      ...raw,
      defaults: {
        ...defaults.defaults,
        ...raw.defaults
      },
      hotkeys: {
        ...defaults.hotkeys,
        ...raw.hotkeys
      }
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    defaults: {
      ...current.defaults,
      ...patch.defaults
    },
    hotkeys: {
      ...current.hotkeys,
      ...patch.hotkeys
    }
  };

  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(next, null, 2));
  return next;
}
