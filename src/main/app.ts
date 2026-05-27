import "electron-squirrel-startup";
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
  shell,
  systemPreferences
} from "electron";
import type { OpenDialogOptions, SourcesOptions } from "electron";
import path from "node:path";
import type {
  AppSettings,
  CaptureConfig,
  DisplayBounds,
  FormatPresetId,
  FrameRect,
  OverlayState,
  QualityPresetId,
  ScreenPermission,
  SourceMode
} from "../shared/types";
import { FORMAT_PRESETS, getFormatPreset, getQualityPreset } from "../shared/presets";
import { finalizeRecording } from "./recording/exporter";
import { getSettingsPath, loadSettings, mojoWorkspaceDetected, saveSettings } from "./settingsStore";
import {
  checkForUpdates,
  configureAutoUpdates,
  copyDiagnostics,
  getUpdateStatus,
  initializeDiagnostics,
  installUpdate,
  openLogFolder
} from "./updater";

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const rendererIndexPath = path.join(__dirname, "../renderer/index.html");
const preloadPath = path.join(__dirname, "../preload/index.js");

let controlWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let recordingFrameWindow: BrowserWindow | null = null;
let recordingControlWindow: BrowserWindow | null = null;
let activeFormatId: FormatPresetId = "vertical";
let latestFrame: FrameRect | null = null;
let controlWindowHiddenForOverlay = false;

initializeDiagnostics();

function createControlWindow(): void {
  controlWindow = new BrowserWindow({
    width: 1040,
    height: 780,
    minWidth: 900,
    minHeight: 680,
    title: "B-Roll Recorder",
    backgroundColor: "#f7f6f2",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  controlWindow.setContentProtection(true);
  hardenWindow(controlWindow);

  if (devServerUrl) {
    void controlWindow.loadURL(devServerUrl);
  } else {
    void controlWindow.loadFile(rendererIndexPath);
  }

  controlWindow.on("closed", () => {
    controlWindow = null;
  });
}

function createOverlayWindow(formatId: FormatPresetId): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  activeFormatId = formatId;
  latestFrame = fitFrameToDisplay(formatId, display.bounds, String(display.id));

  const window = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    acceptFirstMouse: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.setContentProtection(true);
  hardenWindow(window);

  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (devServerUrl) {
    void window.loadURL(`${devServerUrl}/#overlay`);
  } else {
    void window.loadFile(rendererIndexPath, { hash: "overlay" });
  }

  window.on("closed", () => {
    overlayWindow = null;
  });

  overlayWindow = window;
  return window;
}

function createRecordingFrameWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const window = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.setContentProtection(true);
  hardenWindow(window);
  window.setIgnoreMouseEvents(true, { forward: true });
  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (devServerUrl) {
    void window.loadURL(`${devServerUrl}/#recording-frame`);
  } else {
    void window.loadFile(rendererIndexPath, { hash: "recording-frame" });
  }

  window.on("closed", () => {
    recordingFrameWindow = null;
  });

  recordingFrameWindow = window;
  return window;
}

function createRecordingControlWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const windowWidth = 430;
  const windowHeight = 72;
  const initialPosition = getWindowPositionOutsideFrame(
    { width: windowWidth, height: windowHeight },
    latestFrame,
    display.bounds
  );

  const window = new BrowserWindow({
    x: initialPosition.x,
    y: initialPosition.y,
    width: windowWidth,
    height: windowHeight,
    frame: false,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    hasShadow: true,
    fullscreenable: false,
    alwaysOnTop: true,
    backgroundColor: "#171a18",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.setContentProtection(true);
  hardenWindow(window);

  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (devServerUrl) {
    void window.loadURL(`${devServerUrl}/#recording-control`);
  } else {
    void window.loadFile(rendererIndexPath, { hash: "recording-control" });
  }

  window.on("closed", () => {
    recordingControlWindow = null;
  });

  recordingControlWindow = window;
  return window;
}

function hardenWindow(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });
}

function showOverlay(formatId: FormatPresetId): OverlayState {
  activeFormatId = formatId;
  const display = screen.getPrimaryDisplay();

  if (!latestFrame || latestFrame.displayId !== String(display.id)) {
    latestFrame = fitFrameToDisplay(formatId, display.bounds, String(display.id));
  } else {
    latestFrame = fitExistingFrameToFormat(latestFrame, formatId, display.bounds);
  }

  const window = overlayWindow ?? createOverlayWindow(formatId);
  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
  window.webContents.send("overlay:state-changed", getOverlayState());
  hideControlWindowForOverlay();
  return getOverlayState();
}

function hideOverlay(): void {
  overlayWindow?.hide();
  restoreControlWindowAfterOverlay();
  controlWindow?.webContents.send("overlay:hidden", getOverlayState());
}

function showRecordingControls(): void {
  const display = screen.getPrimaryDisplay();
  if (controlWindow && !controlWindow.isDestroyed() && latestFrame) {
    placeControlWindowOutsideFrame(latestFrame, display.bounds);
    controlWindow.show();
  }

  const window = recordingControlWindow ?? createRecordingControlWindow();
  const bounds = window.getBounds();
  const nextPosition = getWindowPositionOutsideFrame(
    { width: bounds.width, height: bounds.height },
    latestFrame,
    display.bounds
  );

  window.setPosition(nextPosition.x, nextPosition.y);
  window.show();
  window.focus();
}

function hideRecordingControls(): void {
  recordingControlWindow?.hide();
  hideRecordingFrameGuide();

  if (controlWindow && !controlWindow.isDestroyed()) {
    if (latestFrame) {
      placeControlWindowOutsideFrame(latestFrame, screen.getPrimaryDisplay().bounds);
    }
    controlWindow.show();
    controlWindow.focus();
  }
}

function toggleRecordingFrameGuide(): boolean {
  if (recordingFrameWindow?.isVisible()) {
    hideRecordingFrameGuide();
    return false;
  }

  showRecordingFrameGuide();
  return true;
}

function showRecordingFrameGuide(): void {
  const display = screen.getPrimaryDisplay();
  const window = recordingFrameWindow ?? createRecordingFrameWindow();

  if (!latestFrame) {
    latestFrame = fitFrameToDisplay(activeFormatId, display.bounds, String(display.id));
  }

  window.setBounds(display.bounds);
  window.setIgnoreMouseEvents(true, { forward: true });
  window.showInactive();
  window.webContents.send("overlay:state-changed", getOverlayState());
}

function hideRecordingFrameGuide(): void {
  recordingFrameWindow?.hide();
}

function getOverlayState(): OverlayState {
  const display = screen.getPrimaryDisplay();

  if (!latestFrame) {
    latestFrame = fitFrameToDisplay(activeFormatId, display.bounds, String(display.id));
  }

  return {
    frame: latestFrame,
    displayBounds: display.bounds,
    formatId: activeFormatId
  };
}

function fitFrameToDisplay(
  formatId: FormatPresetId,
  displayBounds: DisplayBounds,
  displayId: string
): FrameRect {
  const format = getFormatPreset(formatId);
  const aspect = format.width / format.height;
  const margin = 48;
  const maxWidth = displayBounds.width - margin;
  const maxHeight = displayBounds.height - margin;
  let width = maxWidth;
  let height = width / aspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  return {
    x: Math.round(displayBounds.x + (displayBounds.width - width) / 2),
    y: Math.round(displayBounds.y + (displayBounds.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
    displayId
  };
}

function fitExistingFrameToFormat(
  frame: FrameRect,
  formatId: FormatPresetId,
  displayBounds: DisplayBounds
): FrameRect {
  const displayId = frame.displayId;
  const centerX = frame.x + frame.width / 2;
  const centerY = frame.y + frame.height / 2;
  const format = getFormatPreset(formatId);
  const aspect = format.width / format.height;
  const sizeFromWidth = {
    width: frame.width,
    height: frame.width / aspect
  };
  const maxWidth = displayBounds.width - 48;
  const maxHeight = displayBounds.height - 48;
  let width = Math.min(sizeFromWidth.width, maxWidth);
  let height = width / aspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  return clampFrame(
    {
      x: Math.round(centerX - width / 2),
      y: Math.round(centerY - height / 2),
      width: Math.round(width),
      height: Math.round(height),
      displayId
    },
    displayBounds
  );
}

function clampFrame(frame: FrameRect, displayBounds: DisplayBounds): FrameRect {
  const width = Math.min(frame.width, displayBounds.width);
  const height = Math.min(frame.height, displayBounds.height);
  const minX = displayBounds.x;
  const minY = displayBounds.y;
  const maxX = displayBounds.x + displayBounds.width - width;
  const maxY = displayBounds.y + displayBounds.height - height;

  return {
    ...frame,
    width,
    height,
    x: Math.min(Math.max(frame.x, minX), maxX),
    y: Math.min(Math.max(frame.y, minY), maxY)
  };
}

function hideControlWindowForOverlay(): void {
  if (!controlWindow || controlWindow.isDestroyed()) {
    return;
  }

  controlWindowHiddenForOverlay = controlWindow.isVisible();
  if (controlWindowHiddenForOverlay) {
    controlWindow.hide();
  }
}

function restoreControlWindowAfterOverlay(): void {
  if (!controlWindow || controlWindow.isDestroyed()) {
    return;
  }

  const display = screen.getPrimaryDisplay();
  if (latestFrame) {
    placeControlWindowOutsideFrame(latestFrame, display.bounds);
  }

  if (controlWindowHiddenForOverlay || !controlWindow.isVisible()) {
    controlWindow.show();
  }
  controlWindow.focus();
  controlWindowHiddenForOverlay = false;
}

function placeControlWindowOutsideFrame(frame: FrameRect, displayBounds: DisplayBounds): void {
  if (!controlWindow || controlWindow.isDestroyed()) {
    return;
  }

  const bounds = controlWindow.getBounds();
  const best = getWindowPositionOutsideFrame(bounds, frame, displayBounds);
  controlWindow.setPosition(best.x, best.y);
}

function getWindowPositionOutsideFrame(
  windowSize: Pick<DisplayBounds, "width" | "height">,
  frame: FrameRect | null,
  displayBounds: DisplayBounds
): { x: number; y: number } {
  const gap = 18;
  const fallbackFrame =
    frame ??
    ({
      x: displayBounds.x,
      y: displayBounds.y,
      width: 0,
      height: 0
    } as FrameRect);
  const windowBounds = {
    x: 0,
    y: 0,
    width: windowSize.width,
    height: windowSize.height
  };
  const candidates = [
    { x: fallbackFrame.x + fallbackFrame.width + gap, y: fallbackFrame.y },
    { x: fallbackFrame.x - windowSize.width - gap, y: fallbackFrame.y },
    { x: fallbackFrame.x, y: fallbackFrame.y + fallbackFrame.height + gap },
    { x: fallbackFrame.x, y: fallbackFrame.y - windowSize.height - gap },
    { x: displayBounds.x + displayBounds.width - windowSize.width - gap, y: displayBounds.y + gap },
    {
      x: displayBounds.x + displayBounds.width - windowSize.width - gap,
      y: displayBounds.y + displayBounds.height - windowSize.height - gap
    },
    { x: displayBounds.x + gap, y: displayBounds.y + gap },
    { x: displayBounds.x + gap, y: displayBounds.y + displayBounds.height - windowSize.height - gap }
  ].map((candidate) => clampWindowPosition(candidate, windowBounds, displayBounds));

  const nonOverlapping = candidates.find(
    (candidate) =>
      !rectsOverlap(
        { x: candidate.x, y: candidate.y, width: windowSize.width, height: windowSize.height },
        fallbackFrame
      )
  );

  return nonOverlapping ?? candidates[0] ?? { x: displayBounds.x + gap, y: displayBounds.y + gap };
}

function clampWindowPosition(
  position: { x: number; y: number },
  windowBounds: DisplayBounds,
  displayBounds: DisplayBounds
): { x: number; y: number } {
  return {
    x: Math.round(
      Math.min(
        Math.max(position.x, displayBounds.x),
        displayBounds.x + displayBounds.width - windowBounds.width
      )
    ),
    y: Math.round(
      Math.min(
        Math.max(position.y, displayBounds.y),
        displayBounds.y + displayBounds.height - windowBounds.height
      )
    )
  };
}

function rectsOverlap(a: DisplayBounds, b: DisplayBounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

async function getCaptureConfig(formatId: FormatPresetId, qualityId: QualityPresetId): Promise<CaptureConfig> {
  activeFormatId = formatId;
  const settings = loadSettings();
  const display = screen.getPrimaryDisplay();

  if (!latestFrame) {
    latestFrame = fitFrameToDisplay(formatId, display.bounds, String(display.id));
  }

  hideOverlay();
  if (latestFrame) {
    placeControlWindowOutsideFrame(latestFrame, display.bounds);
  }
  await new Promise((resolve) => setTimeout(resolve, 180));

  const sources = await getScreenSources();

  const source =
    sources.find((candidate) => candidate.display_id === String(display.id)) ?? sources[0];

  if (!source) {
    throw new Error("Keine Bildschirmquelle gefunden.");
  }

  const physicalWidth = latestFrame.width * display.scaleFactor;
  const physicalHeight = latestFrame.height * display.scaleFactor;
  const format = getFormatPreset(formatId);

  return {
    sourceId: source.id,
    sourceName: source.name,
    displayBounds: display.bounds,
    displayScaleFactor: display.scaleFactor,
    frame: latestFrame,
    output: {
      width: format.width,
      height: format.height
    },
    quality: getQualityPreset(qualityId),
    showCursor: settings.showCursor,
    sourceMode: getSourceMode(physicalWidth, physicalHeight, format.width, format.height, display.scaleFactor)
  };
}

function getSourceMode(
  physicalWidth: number,
  physicalHeight: number,
  outputWidth: number,
  outputHeight: number,
  scaleFactor: number
): SourceMode {
  if (physicalWidth < outputWidth || physicalHeight < outputHeight) {
    return "scaled";
  }

  if (scaleFactor > 1) {
    return "retina/high-dpi";
  }

  return "native";
}

async function getScreenSources(): Promise<Electron.DesktopCapturerSource[]> {
  const options: SourcesOptions = {
    types: ["screen"],
    thumbnailSize: { width: 1, height: 1 },
    fetchWindowIcons: false
  };

  try {
    return await desktopCapturer.getSources(options);
  } catch (error) {
    throw new Error(getScreenSourceErrorMessage(error));
  }
}

function getScreenSourceErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);

  if (process.platform === "darwin") {
    const permission = systemPreferences.getMediaAccessStatus("screen" as never);
    if (permission !== "granted") {
      return "Bildschirmaufnahme ist nicht erlaubt. Bitte macOS-Einstellungen öffnen, B-Roll Recorder oder Electron erlauben und die App danach neu starten.";
    }
  }

  if (/failed to get sources/i.test(detail)) {
    return "Bildschirmquelle konnte nicht gelesen werden. Bitte Bildschirmaufnahme-Berechtigung prüfen und die App danach neu starten.";
  }

  return `Bildschirmquelle konnte nicht gelesen werden: ${detail}`;
}

function getScreenPermission(): ScreenPermission {
  if (process.platform !== "darwin") {
    return {
      platform: process.platform,
      status: "system",
      canOpenSettings: false
    };
  }

  return {
    platform: process.platform,
    status: systemPreferences.getMediaAccessStatus("screen" as never),
    canOpenSettings: true
  };
}

function registerHotkeys(settings: AppSettings): void {
  globalShortcut.unregisterAll();

  const recordRegistered = globalShortcut.register(settings.hotkeys.recordToggle, () => {
    controlWindow?.webContents.send("shortcut:record-toggle");
  });

  const frameRegistered = globalShortcut.register(settings.hotkeys.frameToggle, () => {
    controlWindow?.webContents.send("shortcut:frame-toggle");
  });

  const pauseRegistered = globalShortcut.register(settings.hotkeys.pauseToggle, () => {
    controlWindow?.webContents.send("recording:pause-toggle");
  });

  if (!recordRegistered || !frameRegistered || !pauseRegistered) {
    controlWindow?.webContents.send("app:notice", "Ein Hotkey ist bereits belegt.");
  }
}

function registerIpc(): void {
  ipcMain.handle("app:get-state", () => ({
    settings: loadSettings(),
    permission: getScreenPermission(),
    settingsPath: getSettingsPath(),
    mojoWorkspaceDetected: mojoWorkspaceDetected()
  }));

  ipcMain.handle("settings:update", (_event, patch: Partial<AppSettings>) => {
    const settings = saveSettings(patch);
    registerHotkeys(settings);
    return settings;
  });

  ipcMain.handle("dialog:choose-output-dir", async () => {
    const options: OpenDialogOptions = {
      title: "Speichern unter",
      properties: ["openDirectory", "createDirectory"]
    };
    const result = controlWindow
      ? await dialog.showOpenDialog(controlWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("overlay:show", (_event, formatId: FormatPresetId) => showOverlay(formatId));
  ipcMain.handle("overlay:hide", () => hideOverlay());
  ipcMain.handle("overlay:get-state", () => getOverlayState());
  ipcMain.handle("overlay:update-frame", (_event, frame: FrameRect) => {
    const display = screen.getPrimaryDisplay();
    latestFrame = clampFrame(frame, display.bounds);
    return latestFrame;
  });

  ipcMain.handle(
    "recording:get-capture-config",
    (_event, payload: { formatId: FormatPresetId; qualityId: QualityPresetId }) =>
      getCaptureConfig(payload.formatId, payload.qualityId)
  );

  ipcMain.handle("recording:finalize", async (_event, payload) => {
    return finalizeRecording(loadSettings(), payload);
  });

  ipcMain.handle("recording:show-controls", () => {
    showRecordingControls();
  });

  ipcMain.handle("recording:hide-controls", () => {
    hideRecordingControls();
  });

  ipcMain.handle("recording:hide-frame", () => {
    hideRecordingFrameGuide();
  });

  ipcMain.handle("recording:set-paused", (_event, paused: boolean) => {
    recordingControlWindow?.webContents.send("recording:paused-changed", paused);
  });

  ipcMain.handle("recording-control:stop", () => {
    controlWindow?.webContents.send("shortcut:record-toggle");
  });

  ipcMain.handle("recording-control:pause", () => {
    controlWindow?.webContents.send("recording:pause-toggle");
  });

  ipcMain.handle("recording-control:toggle-frame", () => {
    const visible = toggleRecordingFrameGuide();
    controlWindow?.webContents.send("recording:frame-toggle");
    recordingControlWindow?.webContents.send("app:notice", visible ? "Rahmen sichtbar" : "Rahmen ausgeblendet");
  });

  ipcMain.handle("recording:show-in-folder", (_event, outputPath: string) => {
    shell.showItemInFolder(outputPath);
  });

  ipcMain.handle("app:open-screen-settings", () => {
    if (process.platform === "darwin") {
      void shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture");
    }
  });

  ipcMain.handle("updates:get-status", () => getUpdateStatus());
  ipcMain.handle("updates:check", () => checkForUpdates());
  ipcMain.handle("updates:install", () => {
    installUpdate();
  });
  ipcMain.handle("diagnostics:open-log-folder", () => {
    openLogFolder();
  });
  ipcMain.handle("diagnostics:copy", () => {
    copyDiagnostics();
  });
}

app.whenReady().then(() => {
  registerIpc();
  createControlWindow();
  registerHotkeys(loadSettings());
  configureAutoUpdates(() => controlWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
