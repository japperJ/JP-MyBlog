import Link from "next/link";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ensureVisitorEventsSchema } from "@/lib/visitor-schema";
import {
  getRipeDbLookupUrl,
  lookupRipeOrgsForIPs,
  UNKNOWN_RESPONSIBLE_ORGANISATION,
} from "@/lib/ripe-lookup";

type IpOrganisationRow = {
  organisation: string;
  ipAddress: string;
  eventCount: number;
  location: string;
};

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

function formatLocation(city: string | null, region: string | null, country: string | null): string {
  return [city, region, country].filter(Boolean).join(", ") || "—";
}

function sortRows(rows: IpOrganisationRow[]): IpOrganisationRow[] {
  return [...rows].sort((left, right) => {
    const leftOrganisation =
      left.organisation === UNKNOWN_RESPONSIBLE_ORGANISATION ? "\uffff" : left.organisation;
    const rightOrganisation =
      right.organisation === UNKNOWN_RESPONSIBLE_ORGANISATION ? "\uffff" : right.organisation;

    return (
      leftOrganisation.localeCompare(rightOrganisation, undefined, { sensitivity: "base" }) ||
      left.ipAddress.localeCompare(right.ipAddress, undefined, { numeric: true })
    );
  });
}

export default async function IpOrganisationsPage() {
  await ensureVisitorEventsSchema();

  let rows: IpOrganisationRow[] = [];
  let dataErrorMessage: string | null = null;

  try {
    const ipAddressRows = await prisma.visitorEvent.groupBy({
      by: ["ipAddress"],
      where: { ipAddress: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 200,
    });

    const ipAddresses = ipAddressRows
      .map((row) => row.ipAddress?.trim())
      .filter((value): value is string => Boolean(value));

    const [locationRows, organisationsByIp] = await Promise.all([
      ipAddresses.length === 0
        ? Promise.resolve([])
        : prisma.visitorEvent.findMany({
            where: { ipAddress: { in: ipAddresses } },
            distinct: ["ipAddress"],
            orderBy: { occurredAt: "desc" },
            select: {
              ipAddress: true,
              city: true,
              region: true,
              country: true,
            },
          }),
      lookupRipeOrgsForIPs(ipAddresses),
    ]);

    const locationsByIp = new Map(
      locationRows
        .map((row) => {
          const ipAddress = row.ipAddress?.trim();
          if (!ipAddress) {
            return null;
          }

          return [ipAddress, formatLocation(row.city, row.region, row.country)] as const;
        })
        .filter((row): row is readonly [string, string] => Boolean(row))
    );

    rows = sortRows(
      ipAddressRows.flatMap((row) => {
        const ipAddress = row.ipAddress?.trim();
        if (!ipAddress) {
          return [];
        }

        return [
          {
            organisation:
              organisationsByIp.get(ipAddress) ?? UNKNOWN_RESPONSIBLE_ORGANISATION,
            ipAddress,
            eventCount: row._count.id,
            location: locationsByIp.get(ipAddress) ?? "—",
          },
        ];
      })
    );
  } catch (error) {
    dataErrorMessage = getVisitorsPageErrorMessage(error);
    console.error("Visitors IP organisations query failed", {
      route: "/admin/visitors/ip-organisations",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4 space-y-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">IP Organisations</h1>
              <p className="text-muted-foreground text-lg">
                Up to 200 unique IP addresses, grouped by responsible organisation and sorted A–Z.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/admin/visitors">Back to visitors</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin">Back to dashboard</Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Responsible organisations</CardTitle>
              <CardDescription>
                RIPE whois data is resolved on demand per IP address. Links open the corresponding RIPE DB query.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataErrorMessage ? (
                <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                  {dataErrorMessage}
                </div>
              ) : null}

              {rows.length === 0 ? (
                <p className="text-muted-foreground">No visitor IP addresses recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4 font-medium">Responsible organisation</th>
                        <th className="py-3 pr-4 font-medium">IP</th>
                        <th className="py-3 pr-4 font-medium">Events</th>
                        <th className="py-3 pr-4 font-medium">Location</th>
                        <th className="py-3 pr-4 font-medium">RIPE DB link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.ipAddress} className="border-b align-top">
                          <td className="py-3 pr-4 font-medium">{row.organisation}</td>
                          <td className="py-3 pr-4 font-mono text-xs">{row.ipAddress}</td>
                          <td className="py-3 pr-4">{row.eventCount}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{row.location}</td>
                          <td className="py-3 pr-4">
                            <a
                              href={getRipeDbLookupUrl(row.ipAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Open RIPE DB
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
