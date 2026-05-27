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
  const { video, canvasStream, stopDrawing } = await createCroppedCanvasStream(stream, config);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(canvasStream, {
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
      mimeType
    };
    return await window.broll.finalizeRecording(payload);
  } finally {
    await window.broll.hideRecordingControls().catch(() => undefined);
    await window.broll.hideRecordingFrame().catch(() => undefined);
    window.clearTimeout(autoStopTimer);
    stopDrawing();
    stream.getTracks().forEach((track) => track.stop());
    canvasStream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
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
      }
    } as MediaTrackConstraints
  } as MediaStreamConstraints);
}

async function createCroppedCanvasStream(
  stream: MediaStream,
  config: CaptureConfig
): Promise<{
  video: HTMLVideoElement;
  canvasStream: MediaStream;
  stopDrawing: () => void;
}> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  await waitForVideoSize(video);

  const canvas = document.createElement("canvas");
  canvas.width = config.output.width;
  canvas.height = config.output.height;

  const context = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
  });

  if (!context) {
    throw new Error("Canvas konnte nicht gestartet werden.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const draw = () => {
    drawCroppedFrame(context, video, config);
  };

  draw();
  const drawInterval = window.setInterval(draw, Math.max(16, 1000 / config.quality.fps));

  return {
    video,
    canvasStream: canvas.captureStream(config.quality.fps),
    stopDrawing: () => {
      window.clearInterval(drawInterval);
    }
  };
}

function drawCroppedFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  config: CaptureConfig
): void {
  const relativeX = (config.frame.x - config.displayBounds.x) / config.displayBounds.width;
  const relativeY = (config.frame.y - config.displayBounds.y) / config.displayBounds.height;
  const relativeWidth = config.frame.width / config.displayBounds.width;
  const relativeHeight = config.frame.height / config.displayBounds.height;

  const sx = clamp(relativeX * video.videoWidth, 0, video.videoWidth);
  const sy = clamp(relativeY * video.videoHeight, 0, video.videoHeight);
  const sw = clamp(relativeWidth * video.videoWidth, 1, video.videoWidth - sx);
  const sh = clamp(relativeHeight * video.videoHeight, 1, video.videoHeight - sy);

  context.fillStyle = "#050505";
  context.fillRect(0, 0, config.output.width, config.output.height);
  context.drawImage(video, sx, sy, sw, sh, 0, 0, config.output.width, config.output.height);
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
