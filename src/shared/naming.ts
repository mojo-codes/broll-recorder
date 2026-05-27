import type { AppSettings, FormatPresetId, NameFields } from "./types";
import { getFormatPreset } from "./presets";

export const DEFAULT_FILENAME_TEMPLATE =
  "br_<brand>_<function>_<subject>_<action>_<format>_<date>_v<version>";

export function slugifyPart(value: string, fallback: string): string {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || fallback;
}

export function localDateToken(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildFileName(
  settings: Pick<AppSettings, "filenameTemplate">,
  fields: NameFields,
  formatId: FormatPresetId,
  version: number,
  date = new Date()
): string {
  const format = getFormatPreset(formatId);
  const tokens: Record<string, string> = {
    brand: slugifyPart(fields.brand, "shared"),
    function: slugifyPart(fields.function, "process"),
    subject: slugifyPart(fields.subject, "clip"),
    action: slugifyPart(fields.action, "demo"),
    format: format.filenameToken,
    date: localDateToken(date),
    version: String(version).padStart(2, "0")
  };

  const templateWithoutExtension = settings.filenameTemplate.replace(/\.mp4$/i, "");
  const rendered = templateWithoutExtension.replace(/<([a-z]+)>/gi, (_match, key: string) => {
    return tokens[key] ?? slugifyPart(key, "x");
  });

  return `${rendered.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-")}.mp4`;
}

export function mergeNameFields(defaults: NameFields, fields: Partial<NameFields>): NameFields {
  return {
    brand: fields.brand ?? defaults.brand,
    function: fields.function ?? defaults.function,
    subject: fields.subject ?? defaults.subject,
    action: fields.action ?? defaults.action
  };
}
