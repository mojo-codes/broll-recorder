import type {
  AppSettings,
  BrollApi,
  FinalizeRecordingPayload,
  FormatPresetId,
  FrameRect,
  OverlayState,
  UpdateStatus
} from "../shared/types";
import { DEFAULT_FILENAME_TEMPLATE } from "../shared/naming";

const defaultOutputDir =
  "/Users/mojo/Social Media Growth/Recordings Social Media.nosync/Broll/_inbox/new_unsorted";

let mockSettings: AppSettings = {
  outputDir: defaultOutputDir,
  defaultFormatPreset: "vertical",
  defaultQualityPreset: "sharp-ui",
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  defaults: {
    brand: "mojo",
    function: "process",
    subject: "control-center",
    action: "scroll"
  },
  hotkeys: {
    recordToggle: "CommandOrControl+Shift+R",
    pauseToggle: "CommandOrControl+Shift+P",
    frameToggle: "CommandOrControl+Shift+F"
  },
  showCursor: true,
  recordAudio: false,
  hasCompletedSetup: false
};

const mockOverlay: OverlayState = {
  formatId: "vertical",
  displayBounds: {
    x: 0,
    y: 0,
    width: 1440,
    height: 900
  },
  frame: {
    x: 468,
    y: 81,
    width: 506,
    height: 900,
    displayId: "dev"
  }
};

const mockUpdateStatus: UpdateStatus = {
  phase: "idle",
  message: "Updates sind erst in der installierten App aktiv.",
  appVersion: "0.1.0",
  logPath: "dev-preview",
  checkedAtIso: new Date().toISOString()
};

export function installDevBrollApi(): void {
  if (window.broll || !import.meta.env.DEV) {
    return;
  }

  const api: BrollApi = {
    getAppState: async () => ({
      settings: mockSettings,
      permission: {
        platform: "browser",
        status: "preview",
        canOpenSettings: false
      },
      settingsPath: "dev-preview",
      mojoWorkspaceDetected: true
    }),
    updateSettings: async (patch) => {
      mockSettings = {
        ...mockSettings,
        ...patch,
        defaults: {
          ...mockSettings.defaults,
          ...patch.defaults
        },
        hotkeys: {
          ...mockSettings.hotkeys,
          ...patch.hotkeys
        }
      };
      return mockSettings;
    },
    chooseOutputDir: async () => defaultOutputDir,
    showOverlay: async (formatId: FormatPresetId) => ({
      ...mockOverlay,
      formatId
    }),
    hideOverlay: async () => undefined,
    getOverlayState: async () => mockOverlay,
    updateFrame: async (frame: FrameRect) => frame,
    resetFrame: async (formatId: FormatPresetId) => ({
      ...mockOverlay,
      formatId
    }),
    getCaptureConfig: async () => {
      throw new Error("Aufnahme läuft nur in der Desktop-App.");
    },
    finalizeRecording: async (_payload: FinalizeRecordingPayload) => {
      throw new Error("Export läuft nur in der Desktop-App.");
    },
    showRecordingControls: async () => undefined,
    hideRecordingControls: async () => undefined,
    requestStopRecording: async () => undefined,
    requestPauseRecording: async () => undefined,
    requestToggleRecordingFrame: async () => undefined,
    setRecordingPaused: async () => undefined,
    hideRecordingFrame: async () => undefined,
    showInFolder: async () => undefined,
    openScreenSettings: async () => undefined,
    getUpdateStatus: async () => mockUpdateStatus,
    checkForUpdates: async () => mockUpdateStatus,
    installUpdate: async () => undefined,
    openLogFolder: async () => undefined,
    copyDiagnostics: async () => undefined,
    onShortcutRecordToggle: () => () => undefined,
    onShortcutFrameToggle: () => () => undefined,
    onOverlayStateChanged: () => () => undefined,
    onOverlayHidden: () => () => undefined,
    onRecordingPauseToggle: () => () => undefined,
    onRecordingFrameToggle: () => () => undefined,
    onRecordingStarted: () => () => undefined,
    onRecordingStopped: () => () => undefined,
    onRecordingPausedChanged: () => () => undefined,
    onUpdateStatus: () => () => undefined,
    onNotice: () => () => undefined
  };

  window.broll = api;
}
