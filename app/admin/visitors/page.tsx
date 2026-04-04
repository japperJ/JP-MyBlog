import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminNavigation } from "@/components/admin-navigation";
import { BlogPagination } from "@/components/blog/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, Users, Shield, Bot } from "lucide-react";

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{
    page?: string;
    eventType?: string;
    source?: string;
    pathname?: string;
    visitorId?: string;
    ipAddress?: string;
    auth?: string;
    bot?: string;
  }>;
};

function truncate(value: string | null | undefined, max = 80): string {
  if (!value) return "—";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function formatMetadata(metadata: unknown): string {
  if (!metadata) {
    return "—";
  }

  try {
    const serialized = JSON.stringify(metadata);
    return truncate(serialized, 140);
  } catch {
    return "[unserializable metadata]";
  }
}

function getVisitorsPageErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Visitor data is temporarily unavailable. Please try again in a moment.";
  }

  const message = error.message;

  if (message.includes("Can't reach database server")) {
    return "Visitor data is temporarily unavailable because the database is unreachable. Please verify DATABASE_URL and try again.";
  }

  if (
    message.includes("visitor_events") ||
    message.includes("visitorEvent") ||
    message.includes("does not exist")
  ) {
    return "Visitor tracking schema is not available yet. Run a schema update (for example `prisma db push`) and refresh this page.";
  }

  return "Visitor data is temporarily unavailable due to a server-side query error. Please check logs and try again.";
}

export default async function VisitorsPage({ searchParams }: Props) {
  const {
    page: pageParam,
    eventType,
    source,
    pathname,
    visitorId,
    ipAddress,
    auth,
    bot,
  } = await searchParams;

  const requestedPage = Math.max(1, Number.parseInt(pageParam || "1", 10));

  const where = {
    ...(eventType ? { eventType } : {}),
    ...(source ? { source } : {}),
    ...(pathname ? { pathname: { contains: pathname, mode: "insensitive" as const } } : {}),
    ...(visitorId ? { visitorId: { contains: visitorId, mode: "insensitive" as const } } : {}),
    ...(ipAddress ? { ipAddress: { contains: ipAddress, mode: "insensitive" as const } } : {}),
    ...(auth === "authenticated" ? { authenticated: true } : {}),
    ...(auth === "anonymous" ? { authenticated: false } : {}),
    ...(bot === "bot" ? { isBot: true } : {}),
    ...(bot === "human" ? { isBot: false } : {}),
  };

  let totalEvents = 0;
  let totalPageViews = 0;
  let totalAuthenticatedEvents = 0;
  let totalBotEvents = 0;
  let uniqueVisitors: Array<{ visitorId: string | null }> = [];
  let events: Array<{
    id: string;
    eventType: string;
    source: string;
    pathname: string;
    queryString: string | null;
    visitorId: string | null;
    method: string | null;
    authenticated: boolean;
    isBot: boolean;
    responseStatus: number | null;
    occurredAt: Date;
    ipAddress: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    browser: string | null;
    operatingSystem: string | null;
    deviceType: string | null;
    userAgent: string | null;
    metadata: unknown;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    } | null;
  }> = [];
  let dataErrorMessage: string | null = null;

  try {
    [
      totalEvents,
      totalPageViews,
      totalAuthenticatedEvents,
      totalBotEvents,
      uniqueVisitors,
    ] = await Promise.all([
      prisma.visitorEvent.count({ where }),
      prisma.visitorEvent.count({ where: { ...where, eventType: "page_view" } }),
      prisma.visitorEvent.count({ where: { ...where, authenticated: true } }),
      prisma.visitorEvent.count({ where: { ...where, isBot: true } }),
      prisma.visitorEvent.findMany({
        where: {
          ...where,
          visitorId: { not: null },
        },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
    ]);
  } catch (error) {
    dataErrorMessage = getVisitorsPageErrorMessage(error);
    console.error("Visitors dashboard aggregate query failed", {
      route: "/admin/visitors",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }

  const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  if (!dataErrorMessage) {
    try {
      events = await prisma.visitorEvent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          occurredAt: "desc",
        },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });
    } catch (error) {
      dataErrorMessage = getVisitorsPageErrorMessage(error);
      console.error("Visitors dashboard events query failed", {
        route: "/admin/visitors",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
  }

  const paginationParams: Record<string, string> = {};
  if (eventType) paginationParams.eventType = eventType;
  if (source) paginationParams.source = source;
  if (pathname) paginationParams.pathname = pathname;
  if (visitorId) paginationParams.visitorId = visitorId;
  if (ipAddress) paginationParams.ipAddress = ipAddress;
  if (auth) paginationParams.auth = auth;
  if (bot) paginationParams.bot = bot;

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4 space-y-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Visitor Intelligence</h1>
              <p className="text-muted-foreground text-lg">
                Public traffic, authenticated activity, and admin audit events in one place.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin">Back to dashboard</Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEvents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPageViews}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueVisitors.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Authenticated / Bots</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAuthenticatedEvents}</div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  {totalBotEvents} bot events
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Narrow the stream by route, identity, event type, source, or machine-vs-human traffic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="GET">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="pathname">Path contains</label>
                  <Input id="pathname" name="pathname" defaultValue={pathname} placeholder="/blog" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="eventType">Event type</label>
                  <Input id="eventType" name="eventType" defaultValue={eventType} placeholder="page_view" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="source">Source</label>
                  <select
                    id="source"
                    name="source"
                    defaultValue={source ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="client-beacon">client-beacon</option>
                    <option value="auth">auth</option>
                    <option value="admin">admin</option>
                    <option value="api">api</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="visitorId">Visitor ID</label>
                  <Input id="visitorId" name="visitorId" defaultValue={visitorId} placeholder="UUID or token" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="ipAddress">IP address</label>
                  <Input id="ipAddress" name="ipAddress" defaultValue={ipAddress} placeholder="192.168" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="auth">Identity</label>
                  <select
                    id="auth"
                    name="auth"
                    defaultValue={auth ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="authenticated">Authenticated</option>
                    <option value="anonymous">Anonymous</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="bot">Traffic type</label>
                  <select
                    id="bot"
                    name="bot"
                    defaultValue={bot ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="human">Human</option>
                    <option value="bot">Bot</option>
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <Button type="submit">Apply</Button>
                  <Button asChild type="button" variant="ghost">
                    <Link href="/admin/visitors">Reset</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                {totalEvents === 0
                  ? 'No events match the current filters yet.'
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, totalEvents)} of ${totalEvents} events.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataErrorMessage ? (
                <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                  {dataErrorMessage}
                </div>
              ) : null}

              {events.length === 0 ? (
                <p className="text-muted-foreground">No events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4 font-medium">When</th>
                        <th className="py-3 pr-4 font-medium">Event</th>
                        <th className="py-3 pr-4 font-medium">Path</th>
                        <th className="py-3 pr-4 font-medium">Visitor</th>
                        <th className="py-3 pr-4 font-medium">User</th>
                        <th className="py-3 pr-4 font-medium">IP / Geo</th>
                        <th className="py-3 pr-4 font-medium">Agent</th>
                        <th className="py-3 pr-4 font-medium">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id} className="border-b align-top">
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <div>{new Date(event.occurredAt).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.source}
                              {event.responseStatus ? ` • ${event.responseStatus}` : ""}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-medium">{event.eventType}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.authenticated ? 'authenticated' : 'anonymous'}
                              {event.isBot ? ' • bot' : ''}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-mono text-xs">{truncate(event.pathname, 60)}</div>
                            <div className="text-xs text-muted-foreground">{truncate(event.queryString, 60)}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-mono text-xs">{truncate(event.visitorId, 24)}</div>
                            <div className="text-xs text-muted-foreground">{event.method ?? '—'}</div>
                          </td>
                          <td className="py-3 pr-4">
                            {event.user ? (
                              <>
                                <div>{event.user.name || event.user.email}</div>
                                <div className="text-xs text-muted-foreground">{event.user.email}</div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-mono text-xs">{event.ipAddress ?? '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {[event.city, event.region, event.country].filter(Boolean).join(', ') || '—'}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div>{event.browser ?? 'Unknown browser'}</div>
                            <div className="text-xs text-muted-foreground">
                              {[event.operatingSystem, event.deviceType].filter(Boolean).join(' • ') || truncate(event.userAgent, 40)}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">
                            {formatMetadata(event.metadata)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <BlogPagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/admin/visitors"
                searchParams={paginationParams}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}