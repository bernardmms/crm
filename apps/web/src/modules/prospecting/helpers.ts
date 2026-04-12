import type { PersonRecord } from "@/modules/prospecting/types";

export function normalizeSearchValue(value?: string) {
  const normalized = value
    ?.trim()
    .replace(/[^a-zA-Z0-9@._\-\s]/g, "")
    .replace(/\s+/g, " ");

  return normalized || undefined;
}

export function parseIntegerFilter(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function normalizeRange(
  minValue?: number,
  maxValue?: number,
): [number | undefined, number | undefined] {
  if (minValue == null || maxValue == null || minValue <= maxValue) {
    return [minValue, maxValue];
  }

  return [maxValue, minValue];
}

export function getPersonName(person: PersonRecord) {
  return (
    person.fullName ??
    [person.firstName, person.lastName].filter(Boolean).join(" ") ??
    "-"
  );
}

export function formatCampaignStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function getApiErrorMessage(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return fallback;
}
