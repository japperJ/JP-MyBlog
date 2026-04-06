"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { DATE_RANGE_PRESETS, type DateRangePreset } from "@/lib/visitor-date-range";

interface VisitorDateFilterProps {
  currentRange: string;
  currentDateFrom: string;
  currentDateTo: string;
}

export function VisitorDateFilter({
  currentRange,
  currentDateFrom,
  currentDateTo,
}: VisitorDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [localDateFrom, setLocalDateFrom] = useState(currentDateFrom);
  const [localDateTo, setLocalDateTo] = useState(currentDateTo);

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return `${pathname}?${params.toString()}`;
    },
    [searchParams, pathname]
  );

  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as DateRangePreset;
      const updates: Record<string, string> = { range: value };
      if (value !== "custom") {
        updates.dateFrom = "";
        updates.dateTo = "";
        setLocalDateFrom("");
        setLocalDateTo("");
      }
      startTransition(() => {
        router.push(buildUrl(updates));
      });
    },
    [router, buildUrl]
  );

  const applyCustomDates = useCallback(
    (from: string, to: string) => {
      startTransition(() => {
        router.push(buildUrl({ range: "custom", dateFrom: from, dateTo: to }));
      });
    },
    [router, buildUrl]
  );

  const isCustom = currentRange === "custom";

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="date-range-preset">
          Date range
        </label>
        <select
          id="date-range-preset"
          value={currentRange}
          onChange={handlePresetChange}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {DATE_RANGE_PRESETS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isCustom && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="date-from">
              From
            </label>
            <input
              type="date"
              id="date-from"
              value={localDateFrom}
              onChange={(e) => setLocalDateFrom(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="date-to">
              To
            </label>
            <input
              type="date"
              id="date-to"
              value={localDateTo}
              onChange={(e) => setLocalDateTo(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => applyCustomDates(localDateFrom, localDateTo)}
            className="flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply dates
          </button>
        </>
      )}
    </div>
  );
}
