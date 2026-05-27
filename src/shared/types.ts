export type FormatPresetId = "vertical" | "wide";
export type QualityPresetId = "standard" | "sharp-ui";

export interface FormatPreset {
  id: FormatPresetId;
  label: string;
  technicalLabel: string;
  description: string;
  width: number;
  height: number;
  filenameToken: string;
}

export interface QualityPreset {
  id: QualityPresetId;
  label: string;
  description: string;
  fps: number;
  videoBitsPerSecond: number;
  exportBitrate: string;
}

export interface NameFields {
  brand: string;
  function: string;
  subject: string;
  action: string;
}

export interface AppSettings {
  outputDir: string;
  defaultFormatPreset: FormatPresetId;
  defaultQualityPreset: QualityPresetId;
  filenameTemplate: string;
  defaults: NameFields;
  hotkeys: {
    recordToggle: string;
    pauseToggle: string;
    frameToggle: string;
  };
  showCursor: boolean;
  recordAudio: boolean;
  hasCompletedSetup: boolean;
}

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId: string;
}

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SourceMode = "native" | "retina/high-dpi" | "scaled";

export interface CaptureConfig {
  sourceId: string;
  sourceName: string;
  displayBounds: DisplayBounds;
  displayScaleFactor: number;
  frame: FrameRect;
  output: {
    width: number;
    height: number;
  };
  quality: QualityPreset;
  showCursor: boolean;
  sourceMode: SourceMode;
}

export interface CaptureArea {
  displayBounds: DisplayBounds;
  frame: FrameRect;
  sourceWidth: number;
  sourceHeight: number;
}

export interface RecordingResult {
  outputPath: string;
  filename: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  sizeBytes: number;
  videoBitrate: number;
  sourceMode: SourceMode;
}

export interface ScreenPermission {
  platform: string;
  status: string;
  canOpenSettings: boolean;
}

export interface AppState {
  settings: AppSettings;
  permission: ScreenPermission;
  settingsPath: string;
  mojoWorkspaceDetected: boolean;
}

export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatus {
  phase: UpdatePhase;
  message: string;
  appVersion: string;
  logPath: string;
  updateVersion?: string;
  progressPercent?: number;
  checkedAtIso?: string;
}

export interface OverlayState {
  frame: FrameRect;
  displayBounds: DisplayBounds;
  formatId: FormatPresetId;
}

export interface FinalizeRecordingPayload {
  buffer: ArrayBuffer;
  formatId: FormatPresetId;
  qualityId: QualityPresetId;
  nameFields: NameFields;
  startedAtIso: string;
  sourceMode: SourceMode;
  mimeType: string;
  captureArea?: CaptureArea;
}

export interface BrollApi {
  getAppState: () => Promise<AppState>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  chooseOutputDir: () => Promise<string | null>;
  showOverlay: (formatId: FormatPresetId) => Promise<OverlayState>;
  hideOverlay: () => Promise<void>;
  getOverlayState: () => Promise<OverlayState>;
  updateFrame: (frame: FrameRect) => Promise<FrameRect>;
  resetFrame: (formatId: FormatPresetId) => Promise<OverlayState>;
  getCaptureConfig: (payload: {
    formatId: FormatPresetId;
    qualityId: QualityPresetId;
  }) => Promise<CaptureConfig>;
  finalizeRecording: (payload: FinalizeRecordingPayload) => Promise<RecordingResult>;
  showRecordingControls: () => Promise<void>;
  hideRecordingControls: () => Promise<void>;
  requestStopRecording: () => Promise<void>;
  requestPauseRecording: () => Promise<void>;
  requestToggleRecordingFrame: () => Promise<void>;
  setRecordingPaused: (paused: boolean) => Promise<void>;
  hideRecordingFrame: () => Promise<void>;
  showInFolder: (outputPath: string) => Promise<void>;
  openScreenSettings: () => Promise<void>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  checkForUpdates: () => Promise<UpdateStatus>;
  installUpdate: () => Promise<void>;
  openLogFolder: () => Promise<void>;
  copyDiagnostics: () => Promise<void>;
  onShortcutRecordToggle: (callback: () => void) => () => void;
  onShortcutFrameToggle: (callback: () => void) => () => void;
  onOverlayStateChanged: (callback: (state: OverlayState) => void) => () => void;
  onOverlayHidden: (callback: (state: OverlayState) => void) => () => void;
  onRecordingPauseToggle: (callback: () => void) => () => void;
  onRecordingFrameToggle: (callback: () => void) => () => void;
  onRecordingStarted: (callback: () => void) => () => void;
  onRecordingStopped: (callback: () => void) => () => void;
  onRecordingPausedChanged: (callback: (paused: boolean) => void) => () => void;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
  onNotice: (callback: (notice: string) => void) => () => void;
}
