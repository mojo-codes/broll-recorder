import type { FormatPreset, FormatPresetId, QualityPreset, QualityPresetId } from "./types";

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: "vertical",
    label: "Handy",
    technicalLabel: "1080x1920",
    description: "TikTok/Reels Fullscreen",
    width: 1080,
    height: 1920,
    filenameToken: "vert"
  },
  {
    id: "wide",
    label: "Breit",
    technicalLabel: "1920x1080",
    description: "Website- und Desktop-B-Roll",
    width: 1920,
    height: 1080,
    filenameToken: "wide"
  },
  {
    id: "upper-proof",
    label: "Text groß",
    technicalLabel: "1080x850",
    description: "Große Proof-Screens für Remotion",
    width: 1080,
    height: 850,
    filenameToken: "upper-proof"
  }
];

export const QUALITY_PRESETS: QualityPreset[] = [
  {
    id: "standard",
    label: "Normal",
    description: "30 FPS",
    fps: 30,
    videoBitsPerSecond: 16_000_000,
    exportBitrate: "16M"
  },
  {
    id: "sharp-ui",
    label: "Text scharf",
    description: "30 FPS, hohe Bitrate",
    fps: 30,
    videoBitsPerSecond: 28_000_000,
    exportBitrate: "28M"
  },
  {
    id: "smooth",
    label: "Flüssig",
    description: "60 FPS",
    fps: 60,
    videoBitsPerSecond: 40_000_000,
    exportBitrate: "40M"
  }
];

export function getFormatPreset(id: FormatPresetId): FormatPreset {
  return FORMAT_PRESETS.find((preset) => preset.id === id) ?? FORMAT_PRESETS[0]!;
}

export function getQualityPreset(id: QualityPresetId): QualityPreset {
  return QUALITY_PRESETS.find((preset) => preset.id === id) ?? QUALITY_PRESETS[1]!;
}
