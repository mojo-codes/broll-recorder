import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import type { AppSettings, CaptureArea, FinalizeRecordingPayload, RecordingResult } from "../../shared/types";
import { buildFileName, mergeNameFields } from "../../shared/naming";
import { getFormatPreset, getQualityPreset } from "../../shared/presets";

interface ProbeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  bit_rate?: string;
}

interface ProbeOutput {
  streams?: ProbeStream[];
  format?: {
    duration?: string;
    bit_rate?: string;
    size?: string;
  };
}

export async function finalizeRecording(
  settings: AppSettings,
  payload: FinalizeRecordingPayload
): Promise<RecordingResult> {
  if (!ffmpegPath) {
    throw new Error("FFmpeg wurde nicht gefunden.");
  }
  const resolvedFfmpegPath = resolvePackagedBinaryPath(ffmpegPath);

  const format = getFormatPreset(payload.formatId);
  const quality = getQualityPreset(payload.qualityId);
  const outputDir = settings.outputDir;

  await fsp.mkdir(outputDir, { recursive: true });
  await fsp.access(outputDir, fs.constants.W_OK);

  const outputPath = await nextOutputPath(settings, payload);
  const tempDir = path.join(os.tmpdir(), "broll-recorder");
  await fsp.mkdir(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, `capture-${Date.now()}.webm`);
  await fsp.writeFile(inputPath, Buffer.from(payload.buffer));

  try {
    const inputProbe = await probeOutput(inputPath);
    const inputStream = inputProbe.streams?.find((stream) => stream.codec_type === "video");
    const captureArea =
      payload.captureArea && inputStream?.width && inputStream.height
        ? {
            ...payload.captureArea,
            sourceWidth: inputStream.width,
            sourceHeight: inputStream.height
          }
        : payload.captureArea;
    const videoFilter = buildVideoFilter(captureArea, format.width, format.height);

    await runProcess(resolvedFfmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-an",
      "-vf",
      videoFilter,
      "-r",
      String(quality.fps),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-b:v",
      quality.exportBitrate,
      "-maxrate",
      quality.exportBitrate,
      "-bufsize",
      `${quality.videoBitsPerSecond * 2}`,
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath
    ]);

    const probe = await probeOutput(outputPath);
    const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
    const stat = await fsp.stat(outputPath);

    return {
      outputPath,
      filename: path.basename(outputPath),
      width: videoStream?.width ?? format.width,
      height: videoStream?.height ?? format.height,
      fps: parseFrameRate(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate),
      duration: Number(probe.format?.duration ?? 0),
      sizeBytes: stat.size,
      videoBitrate: Number(videoStream?.bit_rate ?? probe.format?.bit_rate ?? 0),
      sourceMode: payload.sourceMode
    };
  } catch (error) {
    await fsp.rm(outputPath, { force: true });
    throw error;
  } finally {
    await fsp.rm(inputPath, { force: true });
  }
}

function buildVideoFilter(
  captureArea: CaptureArea | undefined,
  outputWidth: number,
  outputHeight: number
): string {
  if (!captureArea) {
    return `scale=${outputWidth}:${outputHeight}:flags=lanczos`;
  }

  const crop = getCrop(captureArea);
  return `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${outputWidth}:${outputHeight}:flags=lanczos`;
}

function getCrop(captureArea: CaptureArea): { x: number; y: number; width: number; height: number } {
  const scaleX = captureArea.sourceWidth / captureArea.displayBounds.width;
  const scaleY = captureArea.sourceHeight / captureArea.displayBounds.height;
  const rawX = (captureArea.frame.x - captureArea.displayBounds.x) * scaleX;
  const rawY = (captureArea.frame.y - captureArea.displayBounds.y) * scaleY;
  const rawWidth = captureArea.frame.width * scaleX;
  const rawHeight = captureArea.frame.height * scaleY;
  const width = clampEven(Math.floor(rawWidth), 2, captureArea.sourceWidth);
  const height = clampEven(Math.floor(rawHeight), 2, captureArea.sourceHeight);
  const x = clampEven(Math.floor(rawX), 0, captureArea.sourceWidth - width);
  const y = clampEven(Math.floor(rawY), 0, captureArea.sourceHeight - height);

  return { x, y, width, height };
}

function clampEven(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  const even = clamped - (clamped % 2);
  return Math.max(min, even);
}

async function nextOutputPath(
  settings: AppSettings,
  payload: FinalizeRecordingPayload
): Promise<string> {
  const fields = mergeNameFields(settings.defaults, payload.nameFields);
  const startedAt = new Date(payload.startedAtIso);

  for (let version = 1; version < 100; version += 1) {
    const filename = buildFileName(settings, fields, payload.formatId, version, startedAt);
    const outputPath = path.join(settings.outputDir, filename);

    if (!fs.existsSync(outputPath)) {
      return outputPath;
    }
  }

  throw new Error("Kein freier Dateiname mehr gefunden.");
}

async function probeOutput(outputPath: string): Promise<ProbeOutput> {
  const ffprobePath = resolvePackagedBinaryPath(ffprobeStatic.path);
  const stdout = await runProcess(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    outputPath
  ]);

  return JSON.parse(stdout) as ProbeOutput;
}

function resolvePackagedBinaryPath(binaryPath: string): string {
  if (!binaryPath.includes("app.asar")) {
    return binaryPath;
  }

  return binaryPath.replace("app.asar", "app.asar.unpacked");
}

function parseFrameRate(value?: string): number {
  if (!value || value === "0/0") {
    return 0;
  }

  if (value.includes("/")) {
    const [rawNumerator, rawDenominator] = value.split("/");
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);
    return denominator ? Number((numerator / denominator).toFixed(2)) : 0;
  }

  return Number(value);
}

function runProcess(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString("utf8"));
        return;
      }

      const errorText = Buffer.concat(stderr).toString("utf8").slice(-4000);
      reject(new Error(errorText || `Prozess fehlgeschlagen: ${command}`));
    });
  });
}
