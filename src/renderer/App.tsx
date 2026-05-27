import {
  Check,
  Circle,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Frame,
  Info,
  RefreshCw,
  Settings,
  Square,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FORMAT_PRESETS, QUALITY_PRESETS, getFormatPreset } from "../shared/presets";
import { buildFileName, mergeNameFields } from "../shared/naming";
import type {
  AppSettings,
  AppState,
  FormatPresetId,
  NameFields,
  QualityPresetId,
  RecordingResult,
  UpdateStatus
} from "../shared/types";
import { recordToFile, type RecordingControls } from "./recording";

type RecordingState = "idle" | "countdown" | "recording" | "exporting";

const RECORD_HOTKEYS = [
  { value: "CommandOrControl+Shift+R", label: "Cmd/Ctrl + Shift + R" },
  { value: "CommandOrControl+Alt+R", label: "Cmd/Ctrl + Alt + R" },
  { value: "F8", label: "F8" }
];

const PAUSE_HOTKEYS = [
  { value: "CommandOrControl+Shift+P", label: "Cmd/Ctrl + Shift + P" },
  { value: "CommandOrControl+Alt+P", label: "Cmd/Ctrl + Alt + P" },
  { value: "F9", label: "F9" }
];

const FRAME_HOTKEYS = [
  { value: "CommandOrControl+Shift+F", label: "Cmd/Ctrl + Shift + F" },
  { value: "CommandOrControl+Alt+F", label: "Cmd/Ctrl + Alt + F" },
  { value: "F7", label: "F7" }
];

export function App(): JSX.Element {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [formatId, setFormatId] = useState<FormatPresetId>("vertical");
  const [qualityId, setQualityId] = useState<QualityPresetId>("sharp-ui");
  const [nameFields, setNameFields] = useState<NameFields>({
    brand: "mojo",
    function: "process",
    subject: "clip",
    action: "scroll"
  });
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [stopRecording, setStopRecording] = useState<(() => void) | null>(null);
  const [pauseRecording, setPauseRecording] = useState<(() => boolean) | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const recordingStateRef = useRef(recordingState);
  const stopRecordingRef = useRef(stopRecording);
  const pauseRecordingRef = useRef(pauseRecording);
  const formatIdRef = useRef(formatId);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    formatIdRef.current = formatId;
  }, [formatId]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    pauseRecordingRef.current = pauseRecording;
  }, [pauseRecording]);

  useEffect(() => {
    void window.broll.getAppState().then((state) => {
      setAppState(state);
      setFormatId(state.settings.defaultFormatPreset);
      setQualityId(state.settings.defaultQualityPreset);
      setNameFields(state.settings.defaults);
    });
    void window.broll.getUpdateStatus().then(setUpdateStatus);

    const cleanupRecord = window.broll.onShortcutRecordToggle(() => {
      if (recordingStateRef.current === "recording") {
        stopRecordingRef.current?.();
      }
    });
    const cleanupFrame = window.broll.onShortcutFrameToggle(() => {
      if (recordingStateRef.current === "recording") {
        void window.broll.requestToggleRecordingFrame();
      } else if (recordingStateRef.current === "idle") {
        void window.broll.showOverlay(formatIdRef.current);
      }
    });
    const cleanupOverlayHidden = window.broll.onOverlayHidden((state) => {
      setFrameReady(true);
      setNotice(`Rahmen gesetzt: ${Math.round(state.frame.width)}x${Math.round(state.frame.height)}`);
    });
    const cleanupPause = window.broll.onRecordingPauseToggle(() => {
      pauseRecordingRef.current?.();
    });
    const cleanupUpdate = window.broll.onUpdateStatus(setUpdateStatus);
    const cleanupNotice = window.broll.onNotice(setNotice);

    return () => {
      cleanupRecord();
      cleanupFrame();
      cleanupOverlayHidden();
      cleanupPause();
      cleanupUpdate();
      cleanupNotice();
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const settings = appState?.settings;
  const selectedFormat = getFormatPreset(formatId);
  const filenamePreview = useMemo(() => {
    if (!settings) {
      return "";
    }

    return buildFileName(settings, mergeNameFields(settings.defaults, nameFields), formatId, 1);
  }, [formatId, nameFields, settings]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const nextSettings = await window.broll.updateSettings(patch);
    setAppState((current) =>
      current
        ? {
            ...current,
            settings: nextSettings
          }
        : current
    );
    return nextSettings;
  }, []);

  const chooseOutputDir = useCallback(async () => {
    const outputDir = await window.broll.chooseOutputDir();
    if (outputDir) {
      await updateSettings({ outputDir });
    }
  }, [updateSettings]);

  const showFrame = useCallback(async () => {
    setNotice("Rahmen setzen und mit Fertig bestätigen.");
    await window.broll.showOverlay(formatId);
  }, [formatId]);

  const selectFormat = useCallback((nextFormatId: FormatPresetId) => {
    setFormatId(nextFormatId);
    setFrameReady(false);
  }, []);

  const checkUpdate = useCallback(async () => {
    const status = await window.broll.checkForUpdates();
    setUpdateStatus(status);
    setNotice(status.message);
  }, []);

  const installDownloadedUpdate = useCallback(async () => {
    await window.broll.installUpdate();
  }, []);

  const copyDiagnostics = useCallback(async () => {
    await window.broll.copyDiagnostics();
    setNotice("Diagnose kopiert.");
  }, []);

  const startRecording = useCallback(
    async (autoStopMs?: number) => {
      if (!settings || recordingState !== "idle") {
        return;
      }

      setResult(null);
      setError(null);
      setNotice(null);

      if (!frameReady) {
        await showFrame();
        setNotice("Rahmen setzen und danach Aufnahme starten.");
        return;
      }

      await updateSettings({
        defaultFormatPreset: formatId,
        defaultQualityPreset: qualityId,
        defaults: nameFields
      });

      setRecordingState("countdown");
      for (const step of [3, 2, 1]) {
        setCountdown(step);
        await wait(700);
      }
      setCountdown(null);

      try {
        const finalResult = await recordToFile({
          formatId,
          qualityId,
          nameFields,
          autoStopMs,
          onRecordingReady: (controls: RecordingControls) => {
            setStopRecording(() => controls.stop);
            setPauseRecording(() => controls.togglePause);
            setRecordingState("recording");
          },
          onFinalizing: () => {
            setStopRecording(null);
            setPauseRecording(null);
            setRecordingState("exporting");
          },
          onError: setError
        });

        setResult(finalResult);
      } catch (unknownError) {
        const message =
          unknownError instanceof Error
            ? unknownError.message
            : "Aufnahme konnte nicht abgeschlossen werden.";
        setError(cleanRecorderError(message));
        await window.broll.hideOverlay().catch(() => undefined);
        await window.broll.getAppState().then(setAppState).catch(() => undefined);
      } finally {
        setStopRecording(null);
        setPauseRecording(null);
        setRecordingState("idle");
      }
    },
    [formatId, frameReady, nameFields, qualityId, recordingState, settings, showFrame, updateSettings]
  );

  if (!settings || !appState) {
    return <div className="boot">B-Roll Recorder</div>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>B-Roll Recorder</h1>
          <p>{selectedFormat.technicalLabel} · {filenamePreview}</p>
        </div>
        <div className="topbar-actions">
          <UpdateButton
            status={updateStatus}
            onCheck={checkUpdate}
            onInstall={installDownloadedUpdate}
          />
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Einstellungen">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {!settings.hasCompletedSetup ? (
        <section className="setup-panel">
          <div>
            <h2>Setup</h2>
            <p>Sensible Daten vor der Aufnahme prüfen.</p>
          </div>
          <PermissionStrip appState={appState} />
          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={() => updateSettings({ hasCompletedSetup: true })}
            >
              <Check size={18} />
              Fertig
            </button>
          </div>
        </section>
      ) : null}

      <section className="work-surface" aria-label="Aufnahme">
        <ControlGroup title="Format">
          <SegmentedChoices
            values={FORMAT_PRESETS}
            selected={formatId}
            onSelect={(value) => selectFormat(value as FormatPresetId)}
          />
        </ControlGroup>

        <ControlGroup title="Qualität">
          <SegmentedChoices
            values={QUALITY_PRESETS.map((preset) => ({
              ...preset,
              help: getQualityHelp(preset.id as QualityPresetId)
            }))}
            selected={qualityId}
            onSelect={(value) => setQualityId(value as QualityPresetId)}
            onHelp={setNotice}
          />
        </ControlGroup>

        <ControlGroup title="Dateiname">
          <div className="name-grid">
            <TextInput
              label="Name"
              value={nameFields.brand}
              onChange={(brand) => setNameFields((current) => ({ ...current, brand }))}
            />
            <TextInput
              label="Was ist zu sehen?"
              value={nameFields.subject}
              onChange={(subject) => setNameFields((current) => ({ ...current, subject }))}
            />
            <TextInput
              label="Was passiert?"
              value={nameFields.action}
              onChange={(action) => setNameFields((current) => ({ ...current, action }))}
            />
          </div>
        </ControlGroup>

        <ControlGroup title="Speichern unter">
          <OutputPicker outputDir={settings.outputDir} onChoose={chooseOutputDir} />
        </ControlGroup>

        <section className="record-panel">
          <span className={`frame-status ${frameReady ? "ready" : ""}`}>
            {frameReady ? "Rahmen gesetzt" : "Rahmen fehlt"}
          </span>
          <button className="frame-button" type="button" onClick={showFrame}>
            <Frame size={19} />
            Rahmen setzen
          </button>
          <button
            className={`record-button ${recordingState === "recording" ? "is-recording" : ""}`}
            type="button"
            onClick={() => {
              if (recordingState === "recording") {
                stopRecording?.();
              } else {
                void startRecording();
              }
            }}
            disabled={recordingState === "countdown" || recordingState === "exporting"}
          >
            {recordingState === "recording" ? <Square size={22} /> : <Circle size={22} />}
            {recordingState === "recording" ? "Stop" : "Aufnehmen"}
          </button>
        </section>
      </section>

      {countdown ? <div className="countdown">{countdown}</div> : null}
      {recordingState === "exporting" ? <StatusBar text="Export läuft" tone="working" /> : null}
      {notice ? <StatusBar text={notice} tone="warning" onClose={() => setNotice(null)} /> : null}
      {error ? <StatusBar text={error} tone="error" onClose={() => setError(null)} /> : null}
      {result ? <ResultPanel result={result} /> : null}
      {settingsOpen ? (
        <SettingsPanel
          settings={settings}
          updateStatus={updateStatus}
          onClose={() => setSettingsOpen(false)}
          onSave={updateSettings}
          onChooseOutput={chooseOutputDir}
          onCheckUpdate={checkUpdate}
          onInstallUpdate={installDownloadedUpdate}
          onOpenLogFolder={() => window.broll.openLogFolder()}
          onCopyDiagnostics={copyDiagnostics}
        />
      ) : null}
    </main>
  );
}

function UpdateButton({
  status,
  onCheck,
  onInstall
}: {
  status: UpdateStatus | null;
  onCheck: () => void;
  onInstall: () => void;
}): JSX.Element {
  const phase = status?.phase ?? "idle";
  const disabled = phase === "checking" || phase === "available" || phase === "downloading";
  const isReady = phase === "downloaded";
  const label = getUpdateButtonLabel(status);

  return (
    <button
      className={`update-button ${isReady ? "is-ready" : ""}`}
      type="button"
      onClick={isReady ? onInstall : onCheck}
      disabled={disabled}
    >
      {isReady ? <Download size={17} /> : <RefreshCw size={17} />}
      {label}
    </button>
  );
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="control-group">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function SegmentedChoices({
  values,
  selected,
  onSelect,
  onHelp
}: {
  values: Array<{ id: string; label: string; technicalLabel?: string; description: string; help?: string }>;
  selected: string;
  onSelect: (value: string) => void;
  onHelp?: (help: string) => void;
}): JSX.Element {
  return (
    <div className="segmented">
      {values.map((value) => (
        <div className="choice-shell" key={value.id}>
          <button
            className={`choice-button ${value.id === selected ? "is-selected" : ""}`}
            type="button"
            onClick={() => onSelect(value.id)}
          >
            <span>{value.label}</span>
            <small>{value.technicalLabel ?? value.description}</small>
          </button>
          {value.help && onHelp ? (
            <button
              className="choice-info"
              type="button"
              aria-label={`${value.label} Info`}
              onClick={() => onHelp(value.help ?? "")}
            >
              <Info size={15} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ShortcutSelect({
  label,
  description,
  value,
  options,
  onChange
}: {
  label: string;
  description: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="shortcut-select">
      <span>{label}</span>
      <small>{description}</small>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OutputPicker({
  outputDir,
  onChoose
}: {
  outputDir: string;
  onChoose: () => void;
}): JSX.Element {
  return (
    <div className="output-picker">
      <span>{outputDir}</span>
      <button className="icon-button" type="button" onClick={onChoose} aria-label="Ordner wählen">
        <FolderOpen size={20} />
      </button>
    </div>
  );
}

function PermissionStrip({ appState }: { appState: AppState }): JSX.Element {
  const status = appState.permission.status;
  const needsAction = appState.permission.platform === "darwin" && status !== "granted";

  return (
    <div className={`permission-strip ${needsAction ? "needs-action" : ""}`}>
      <span>Bildschirmaufnahme: {status}</span>
      {needsAction ? (
        <button type="button" onClick={() => window.broll.openScreenSettings()}>
          Öffnen
          <ExternalLink size={14} />
        </button>
      ) : null}
    </div>
  );
}

function ResultPanel({ result }: { result: RecordingResult }): JSX.Element {
  return (
    <section className="result-panel">
      <div>
        <h2>{result.filename}</h2>
        <p>
          {result.width}x{result.height} · {result.fps} FPS · {formatDuration(result.duration)} ·{" "}
          {formatBytes(result.sizeBytes)} · {result.sourceMode}
        </p>
      </div>
      <button className="secondary-button" type="button" onClick={() => window.broll.showInFolder(result.outputPath)}>
        <FolderOpen size={18} />
        In Ordner zeigen
      </button>
    </section>
  );
}

function SettingsPanel({
  settings,
  updateStatus,
  onClose,
  onSave,
  onChooseOutput,
  onCheckUpdate,
  onInstallUpdate,
  onOpenLogFolder,
  onCopyDiagnostics
}: {
  settings: AppSettings;
  updateStatus: UpdateStatus | null;
  onClose: () => void;
  onSave: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  onChooseOutput: () => void;
  onCheckUpdate: () => void;
  onInstallUpdate: () => void;
  onOpenLogFolder: () => void;
  onCopyDiagnostics: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState(settings);
  const hasDownloadedUpdate = updateStatus?.phase === "downloaded";

  return (
    <div className="settings-backdrop" role="presentation">
      <aside className="settings-panel" role="dialog" aria-label="Einstellungen">
        <header>
          <h2>Einstellungen</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </header>

        <div className="settings-form">
          <section className="settings-section" aria-label="Speicherort">
            <h3>Speicherort</h3>
            <p>Standard-Ordner für neue Aufnahmen.</p>
            <OutputPicker outputDir={settings.outputDir} onChoose={onChooseOutput} />
          </section>

          <section className="settings-section" aria-label="Dateiname">
            <h3>Dateiname</h3>
            <p>Wird aus Name, Was ist zu sehen? und Was passiert? plus Format und Datum gebaut.</p>
          </section>

          <section className="settings-section" aria-label="Tastenkombinationen">
            <h3>Tastenkombinationen</h3>
            <p>Auf dem Mac steht Cmd, unter Windows Ctrl.</p>
            <ShortcutSelect
              label="Aufnahme starten/stoppen"
              description="Startet die Aufnahme oder stoppt sie, wenn sie läuft."
              value={draft.hotkeys.recordToggle}
              options={RECORD_HOTKEYS}
              onChange={(recordToggle) =>
                setDraft((current) => ({
                  ...current,
                  hotkeys: { ...current.hotkeys, recordToggle }
                }))
              }
            />
            <ShortcutSelect
              label="Pause/weiter"
              description="Pausiert oder setzt eine laufende Aufnahme fort."
              value={draft.hotkeys.pauseToggle}
              options={PAUSE_HOTKEYS}
              onChange={(pauseToggle) =>
                setDraft((current) => ({
                  ...current,
                  hotkeys: { ...current.hotkeys, pauseToggle }
                }))
              }
            />
            <ShortcutSelect
              label="Rahmen setzen/anzeigen"
              description="Setzt den Rahmen vor der Aufnahme; blendet ihn während der Aufnahme ein oder aus."
              value={draft.hotkeys.frameToggle}
              options={FRAME_HOTKEYS}
              onChange={(frameToggle) =>
                setDraft((current) => ({
                  ...current,
                  hotkeys: { ...current.hotkeys, frameToggle }
                }))
              }
            />
          </section>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={draft.showCursor}
              onChange={(event) => setDraft((current) => ({ ...current, showCursor: event.target.checked }))}
            />
            <span>Cursor aufnehmen</span>
          </label>

          <section className="settings-section" aria-label="Updates">
            <h3>Updates</h3>
            <p>{updateStatus?.message ?? "Updater bereit."}</p>
            <div className="settings-actions">
              <button
                className={hasDownloadedUpdate ? "primary-button" : "secondary-button"}
                type="button"
                onClick={hasDownloadedUpdate ? onInstallUpdate : onCheckUpdate}
                disabled={
                  updateStatus?.phase === "checking" ||
                  updateStatus?.phase === "available" ||
                  updateStatus?.phase === "downloading"
                }
              >
                {hasDownloadedUpdate ? <Download size={18} /> : <RefreshCw size={18} />}
                {getUpdateButtonLabel(updateStatus)}
              </button>
            </div>
          </section>

          <section className="settings-section" aria-label="Diagnose">
            <h3>Diagnose</h3>
            <div className="settings-actions">
              <button className="secondary-button" type="button" onClick={onOpenLogFolder}>
                <FileText size={18} />
                Log öffnen
              </button>
              <button className="secondary-button" type="button" onClick={onCopyDiagnostics}>
                <Clipboard size={18} />
                Diagnose kopieren
              </button>
            </div>
          </section>
        </div>

        <footer>
          <button className="secondary-button" type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              void onSave(draft).then(onClose);
            }}
          >
            <Check size={18} />
            Speichern
          </button>
        </footer>
      </aside>
    </div>
  );
}

function StatusBar({
  text,
  tone,
  onClose
}: {
  text: string;
  tone: "working" | "warning" | "error";
  onClose?: () => void;
}): JSX.Element {
  return (
    <div className={`status-bar ${tone}`}>
      <span>{text}</span>
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Schließen">
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

function formatBytes(size: number): string {
  if (size < 1_000_000) {
    return `${Math.round(size / 1000)} KB`;
  }

  return `${(size / 1_000_000).toFixed(1)} MB`;
}

function formatDuration(duration: number): string {
  return `${duration.toFixed(1)}s`;
}

function cleanRecorderError(message: string): string {
  const cleaned = message.replace(/^Error invoking remote method '[^']+':\s*/i, "");

  if (/Bildschirmaufnahme ist nicht erlaubt/i.test(cleaned)) {
    return cleaned;
  }

  if (/failed to get sources|Bildschirmquelle konnte nicht gelesen/i.test(cleaned)) {
    return "Bildschirmaufnahme konnte nicht gestartet werden. Bitte macOS-Bildschirmaufnahme für B-Roll Recorder oder Electron erlauben und die App danach neu starten.";
  }

  if (/permission|denied|not allowed/i.test(message)) {
    return "Bildschirmaufnahme ist nicht erlaubt.";
  }

  return cleaned;
}

function getQualityHelp(qualityId: QualityPresetId): string {
  if (qualityId === "standard") {
    return "Normal: Für kurze Demos und einfache Scrolls. Kleinere Dateien.";
  }

  if (qualityId === "sharp-ui") {
    return "Text scharf: Für Websites, Code, Sheets und kleine UI-Schrift.";
  }

  return "Flüssig: Für Mausbewegungen, Animationen und schnelle Scrolls.";
}

function getUpdateButtonLabel(status: UpdateStatus | null): string {
  if (!status) {
    return "Update prüfen";
  }

  if (status.phase === "checking") {
    return "Prüfe...";
  }

  if (status.phase === "available") {
    return "Lade...";
  }

  if (status.phase === "downloading") {
    return `${Math.round(status.progressPercent ?? 0)} %`;
  }

  if (status.phase === "downloaded") {
    return "Update installieren";
  }

  return "Update prüfen";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
