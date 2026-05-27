import { app, clipboard, shell } from "electron";
import type { BrowserWindow } from "electron";
import log from "electron-log/main";
import { autoUpdater } from "electron-updater";
import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from "electron-updater";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { UpdateStatus } from "../shared/types";

let status: UpdateStatus = createStatus("idle", "Updater bereit.");
let updateCheckInFlight: Promise<UpdateStatus> | null = null;
let getControlWindow: (() => BrowserWindow | null) | null = null;

export function initializeDiagnostics(): void {
  log.initialize();
  log.transports.file.level = "info";
  log.transports.console.level = app.isPackaged ? false : "debug";

  process.on("uncaughtException", (error) => {
    log.error("Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    log.error("Unhandled rejection", reason);
  });

  log.info(`B-Roll Recorder ${app.getVersion()} starting on ${process.platform} ${os.release()}`);
}

export function configureAutoUpdates(controlWindowGetter: () => BrowserWindow | null): void {
  getControlWindow = controlWindowGetter;
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    setStatus("checking", "Suche nach Updates.");
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    setStatus("available", `Update ${info.version} gefunden. Download läuft.`, {
      updateVersion: info.version
    });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    setStatus("downloading", `Update wird geladen: ${Math.round(progress.percent)} %.`, {
      progressPercent: progress.percent
    });
  });

  autoUpdater.on("update-downloaded", (event: UpdateDownloadedEvent) => {
    setStatus("downloaded", `Update ${event.version} ist bereit.`, {
      updateVersion: event.version,
      progressPercent: 100
    });
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    setStatus("not-available", `Version ${info.version} ist aktuell.`, {
      updateVersion: info.version,
      progressPercent: undefined
    });
  });

  autoUpdater.on("error", (error: Error) => {
    log.error("Auto updater error", error);
    setStatus("error", `Update fehlgeschlagen: ${error.message}`);
  });

  if (app.isPackaged) {
    windowSetTimeout(() => {
      void checkForUpdates();
    }, 10_000);

    windowSetInterval(() => {
      void checkForUpdates();
    }, 6 * 60 * 60 * 1000);
  } else {
    setStatus("idle", "Updates sind erst in der installierten App aktiv.");
  }
}

export function getUpdateStatus(): UpdateStatus {
  return status;
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    return setStatus("idle", "Updates sind erst in der installierten App aktiv.");
  }

  if (!hasUpdateConfig()) {
    return setStatus("idle", "Updates sind nach dem ersten GitHub-Release aktiv.");
  }

  if (updateCheckInFlight) {
    return updateCheckInFlight;
  }

  updateCheckInFlight = autoUpdater
    .checkForUpdates()
    .then(() => status)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log.error("Manual update check failed", error);
      return setStatus("error", `Update fehlgeschlagen: ${message}`);
    })
    .finally(() => {
      updateCheckInFlight = null;
    });

  return updateCheckInFlight;
}

export function installUpdate(): void {
  log.info("Installing downloaded update");
  autoUpdater.quitAndInstall(false, true);
}

export function openLogFolder(): void {
  const logPath = getLogPath();
  if (logPath) {
    shell.showItemInFolder(logPath);
  }
}

export function copyDiagnostics(): void {
  const lines = [
    "B-Roll Recorder Diagnose",
    `Version: ${app.getVersion()}`,
    `Platform: ${process.platform} ${os.release()} (${process.arch})`,
    `Packaged: ${app.isPackaged}`,
    `Update: ${status.phase} - ${status.message}`,
    `Log: ${getLogPath()}`,
    `UserData: ${app.getPath("userData")}`
  ];

  clipboard.writeText(lines.join("\n"));
}

function setStatus(
  phase: UpdateStatus["phase"],
  message: string,
  patch: Partial<UpdateStatus> = {}
): UpdateStatus {
  status = createStatus(phase, message, patch);
  log.info(`Update status: ${status.phase} - ${status.message}`);
  const controlWindow = getControlWindow?.();
  controlWindow?.webContents.send("update:status", status);
  return status;
}

function createStatus(
  phase: UpdateStatus["phase"],
  message: string,
  patch: Partial<UpdateStatus> = {}
): UpdateStatus {
  return {
    phase,
    message,
    appVersion: app.getVersion(),
    logPath: getLogPath(),
    checkedAtIso: new Date().toISOString(),
    ...patch
  };
}

function getLogPath(): string {
  try {
    return log.transports.file.getFile().path;
  } catch {
    return app.getPath("logs");
  }
}

function hasUpdateConfig(): boolean {
  return fs.existsSync(path.join(process.resourcesPath, "app-update.yml"));
}

function windowSetTimeout(callback: () => void, ms: number): void {
  setTimeout(callback, ms);
}

function windowSetInterval(callback: () => void, ms: number): void {
  setInterval(callback, ms);
}
