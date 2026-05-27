import type { CaptureConfig, FinalizeRecordingPayload, FormatPresetId, NameFields, QualityPresetId } from "../shared/types";

export interface RecordingControls {
  stop: () => void;
  togglePause: () => boolean;
}

export interface StartRecordingOptions {
  formatId: FormatPresetId;
  qualityId: QualityPresetId;
  nameFields: NameFields;
  autoStopMs?: number;
  onRecordingReady: (controls: RecordingControls) => void;
  onFinalizing: () => void;
  onError: (message: string) => void;
}

export async function recordToFile(
  options: StartRecordingOptions
): Promise<Awaited<ReturnType<typeof window.broll.finalizeRecording>>> {
  const config = await window.broll.getCaptureConfig({
    formatId: options.formatId,
    qualityId: options.qualityId
  });
  const stream = await getDesktopStream(config);
  const sourceSize = await getStreamVideoSize(stream);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: config.quality.videoBitsPerSecond
  });
  const chunks: Blob[] = [];
  const startedAtIso = new Date().toISOString();
  let isPaused = false;
  let isStopping = false;

  const stoppedPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = () => reject(new Error("Aufnahme ist fehlgeschlagen."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  const stopRecording = () => {
    if (isStopping || recorder.state === "inactive") {
      return;
    }

    isStopping = true;
    if (recorder.state === "paused") {
      recorder.resume();
    }

    try {
      recorder.requestData();
    } catch {
      // Some Chromium builds throw if data is already being flushed.
    }

    window.setTimeout(() => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }, 80);
  };

  const togglePause = () => {
    if (recorder.state === "recording") {
      recorder.pause();
      isPaused = true;
    } else if (recorder.state === "paused") {
      recorder.resume();
      isPaused = false;
    }

    void window.broll.setRecordingPaused(isPaused);
    return isPaused;
  };

  recorder.start(1000);
  options.onRecordingReady({ stop: stopRecording, togglePause });
  await window.broll.showRecordingControls();

  let autoStopTimer: number | undefined;
  if (options.autoStopMs) {
    autoStopTimer = window.setTimeout(stopRecording, options.autoStopMs);
  }

  try {
    const blob = await stoppedPromise;
    if (blob.size === 0) {
      throw new Error("Keine Videodaten aufgenommen. Bitte Aufnahme erneut starten.");
    }

    options.onFinalizing();
    await window.broll.hideRecordingControls();
    const buffer = await blob.arrayBuffer();
    const payload: FinalizeRecordingPayload = {
      buffer,
      formatId: options.formatId,
      qualityId: options.qualityId,
      nameFields: options.nameFields,
      startedAtIso,
      sourceMode: config.sourceMode,
      mimeType,
      captureArea: {
        displayBounds: config.displayBounds,
        frame: config.frame,
        sourceWidth: sourceSize.width,
        sourceHeight: sourceSize.height
      }
    };
    return await window.broll.finalizeRecording(payload);
  } finally {
    await window.broll.hideRecordingControls().catch(() => undefined);
    await window.broll.hideRecordingFrame().catch(() => undefined);
    window.clearTimeout(autoStopTimer);
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function getDesktopStream(config: CaptureConfig): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: config.sourceId,
        maxFrameRate: config.quality.fps,
        minFrameRate: config.quality.fps
      },
      cursor: config.showCursor ? "always" : "never"
    } as MediaTrackConstraints
  } as MediaStreamConstraints);
}

async function getStreamVideoSize(stream: MediaStream): Promise<{ width: number; height: number }> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  await waitForVideoSize(video);

  const size = {
    width: video.videoWidth,
    height: video.videoHeight
  };
  video.pause();
  video.srcObject = null;

  if (!size.width || !size.height) {
    const [track] = stream.getVideoTracks();
    const settings = track?.getSettings();
    if (settings?.width && settings.height) {
      return {
        width: settings.width,
        height: settings.height
      };
    }
  }

  return size;
}

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function waitForVideoSize(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });
}
