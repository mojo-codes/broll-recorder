import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  AppState,
  BrollApi,
  CaptureConfig,
  FinalizeRecordingPayload,
  FormatPresetId,
  FrameRect,
  OverlayState,
  QualityPresetId,
  RecordingResult
} from "../shared/types";

const api: BrollApi = {
  getAppState: () => ipcRenderer.invoke("app:get-state"),
  updateSettings: (patch) => ipcRenderer.invoke("settings:update", patch),
  chooseOutputDir: () => ipcRenderer.invoke("dialog:choose-output-dir"),
  showOverlay: (formatId) => ipcRenderer.invoke("overlay:show", formatId),
  hideOverlay: () => ipcRenderer.invoke("overlay:hide"),
  getOverlayState: () => ipcRenderer.invoke("overlay:get-state"),
  updateFrame: (frame) => ipcRenderer.invoke("overlay:update-frame", frame),
  getCaptureConfig: (payload) => ipcRenderer.invoke("recording:get-capture-config", payload),
  finalizeRecording: (payload) => ipcRenderer.invoke("recording:finalize", payload),
  showRecordingControls: () => ipcRenderer.invoke("recording:show-controls"),
  hideRecordingControls: () => ipcRenderer.invoke("recording:hide-controls"),
  requestStopRecording: () => ipcRenderer.invoke("recording-control:stop"),
  requestPauseRecording: () => ipcRenderer.invoke("recording-control:pause"),
  requestToggleRecordingFrame: () => ipcRenderer.invoke("recording-control:toggle-frame"),
  setRecordingPaused: (paused) => ipcRenderer.invoke("recording:set-paused", paused),
  hideRecordingFrame: () => ipcRenderer.invoke("recording:hide-frame"),
  showInFolder: (outputPath) => ipcRenderer.invoke("recording:show-in-folder", outputPath),
  openScreenSettings: () => ipcRenderer.invoke("app:open-screen-settings"),
  getUpdateStatus: () => ipcRenderer.invoke("updates:get-status"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  openLogFolder: () => ipcRenderer.invoke("diagnostics:open-log-folder"),
  copyDiagnostics: () => ipcRenderer.invoke("diagnostics:copy"),
  onShortcutRecordToggle: (callback) => subscribe("shortcut:record-toggle", callback),
  onShortcutFrameToggle: (callback) => subscribe("shortcut:frame-toggle", callback),
  onOverlayStateChanged: (callback) => subscribeWithPayload("overlay:state-changed", callback),
  onOverlayHidden: (callback) => subscribeWithPayload("overlay:hidden", callback),
  onRecordingPauseToggle: (callback) => subscribe("recording:pause-toggle", callback),
  onRecordingFrameToggle: (callback) => subscribe("recording:frame-toggle", callback),
  onRecordingStarted: (callback) => subscribe("recording:started", callback),
  onRecordingStopped: (callback) => subscribe("recording:stopped", callback),
  onRecordingPausedChanged: (callback) => subscribeWithPayload("recording:paused-changed", callback),
  onUpdateStatus: (callback) => subscribeWithPayload("update:status", callback),
  onNotice: (callback) => subscribeWithPayload("app:notice", callback)
};

contextBridge.exposeInMainWorld("broll", api);

function subscribe(channel: string, callback: () => void): () => void {
  const listener = () => callback();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function subscribeWithPayload<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
