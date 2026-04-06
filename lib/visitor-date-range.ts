export type DateRangePreset = "24h" | "7d" | "30d" | "90d" | "all" | "custom";

export const DEFAULT_RANGE: DateRangePreset = "30d";

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const PRESET_HOURS: Record<string, number> = {
  "24h": 24,
  "7d": 7 * 24,
  "30d": 30 * 24,
  "90d": 90 * 24,
};

/**
 * Compute the Prisma `occurredAt` filter from URL search parameters.
 * Returns `undefined` when no date constraint should be applied (all time).
 */
export function computeDateRange(
  range: string | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined
): { gte?: Date; lte?: Date } | undefined {
  const effectiveRange = (range as DateRangePreset) ?? DEFAULT_RANGE;

  if (effectiveRange === "all") {
    return undefined;
  }

  if (effectiveRange === "custom") {
    const result: { gte?: Date; lte?: Date } = {};
    if (dateFrom) {
      result.gte = new Date(`${dateFrom}T00:00:00Z`);
    }
    if (dateTo) {
      result.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  const hours = PRESET_HOURS[effectiveRange] ?? PRESET_HOURS["30d"];
  return { gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
}

/**
 * Returns the human-readable label for a date range preset value.
 * Falls back to the default range label when the value is not recognised.
 */
export function getDateRangeLabel(range: string): string {
  return (
    DATE_RANGE_PRESETS.find((p) => p.value === range)?.label ??
    DATE_RANGE_PRESETS.find((p) => p.value === DEFAULT_RANGE)!.label
  );
}
