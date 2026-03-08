type HeaderReader = Pick<Headers, "get">;

const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeOrigin(value: string): string {
  const url = new URL(value);
  return url.origin;
}

function withProtocolIfNeeded(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export function getConfiguredAppOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeOrigin(withProtocolIfNeeded(vercelUrl));
  }

  return DEFAULT_LOCAL_ORIGIN;
}

export function getRequestOrigin(headers: HeaderReader): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) {
    return null;
  }

  const forwardedProto = headers.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (LOCAL_HOSTNAMES.has(host.split(":")[0]) ? "http" : "https");

  return normalizeOrigin(`${protocol}://${host}`);
}

export function getPreferredAppOrigin(headers?: HeaderReader | null): string {
  if (headers) {
    return getRequestOrigin(headers) ?? getConfiguredAppOrigin();
  }

  return getConfiguredAppOrigin();
}

export function getAppUrl(pathname: string, headers?: HeaderReader | null): string {
  return new URL(pathname, getPreferredAppOrigin(headers)).toString();
}

export function getAppHost(headers?: HeaderReader | null): string {
  return new URL(getPreferredAppOrigin(headers)).host;
}

export function isVercelHostedEnvironment(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    Boolean(process.env.VERCEL_URL)
  );
}

export function areFilesystemUploadsDisabled(): boolean {
  return isVercelHostedEnvironment();
}
