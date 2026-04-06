const RIPE_WHOIS_URL = "https://stat.ripe.net/data/whois/data.json";
const RIPE_DB_URL = "https://apps.db.ripe.net/db-web-ui/query";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  value: string | null;
};

type RipeField = {
  key?: unknown;
  value?: unknown;
};

type RipeLookupResponse = {
  data?: {
    records?: Array<RipeField[]>;
    irr_records?: Array<RipeField[]>;
  };
};

const ripeLookupCache = new Map<string, CacheEntry>();

export const UNKNOWN_RESPONSIBLE_ORGANISATION = "Unknown";

function normalizeLookupValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getCachedValue(ipAddress: string): string | null | undefined {
  const cached = ripeLookupCache.get(ipAddress);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    ripeLookupCache.delete(ipAddress);
    return undefined;
  }

  return cached.value;
}

function setCachedValue(ipAddress: string, value: string | null) {
  ripeLookupCache.set(ipAddress, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function isPrivateOrLocalIpAddress(ipAddress: string): boolean {
  return (
    ipAddress === "localhost" ||
    ipAddress === "::1" ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("127.") ||
    ipAddress.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ipAddress) ||
    ipAddress.startsWith("fc") ||
    ipAddress.startsWith("fd") ||
    ipAddress.startsWith("fe80:")
  );
}

export function getRipeDbLookupUrl(ipAddress: string): string {
  const searchParams = new URLSearchParams({
    bflag: "false",
    dflag: "false",
    rflag: "true",
    searchtext: ipAddress,
    source: "RIPE",
  });

  return `${RIPE_DB_URL}?${searchParams.toString()}`;
}

export function extractResponsibleOrganisation(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as RipeLookupResponse;
  const groups = [...(response.data?.records ?? []), ...(response.data?.irr_records ?? [])];

  for (const preferredKey of ["org-name", "descr", "netname"]) {
    for (const group of groups) {
      for (const field of group) {
        if (field?.key !== preferredKey) {
          continue;
        }

        const normalized = normalizeLookupValue(field.value);
        if (normalized) {
          return normalized;
        }
      }
    }
  }

  return null;
}

async function lookupResponsibleOrganisation(ipAddress: string): Promise<string | null> {
  const normalizedIpAddress = ipAddress.trim();
  if (!normalizedIpAddress || isPrivateOrLocalIpAddress(normalizedIpAddress)) {
    return null;
  }

  const cached = getCachedValue(normalizedIpAddress);
  if (cached !== undefined) {
    return cached;
  }

  const url = `${RIPE_WHOIS_URL}?${new URLSearchParams({ resource: normalizedIpAddress }).toString()}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`RIPE lookup failed for ${normalizedIpAddress}: ${response.status}`);
  }

  const organisation = extractResponsibleOrganisation(await response.json());
  setCachedValue(normalizedIpAddress, organisation);
  return organisation;
}

export async function lookupRipeOrgsForIPs(
  ipAddresses: string[],
  concurrency = 10
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const queue = Array.from(
    new Set(
      ipAddresses
        .map((ipAddress) => ipAddress.trim())
        .filter(Boolean)
    )
  );

  let currentIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, queue.length || 1));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (currentIndex < queue.length) {
        const index = currentIndex++;
        const ipAddress = queue[index];

        try {
          results.set(ipAddress, await lookupResponsibleOrganisation(ipAddress));
        } catch (error) {
          console.error("RIPE lookup failed", {
            ipAddress,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          });
          results.set(ipAddress, null);
        }
      }
    })
  );

  return results;
}
