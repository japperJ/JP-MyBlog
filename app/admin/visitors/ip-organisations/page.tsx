import Link from "next/link";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ensureVisitorEventsSchema } from "@/lib/visitor-schema";
import {
  lookupRipeOrgsForIPs,
  UNKNOWN_RESPONSIBLE_ORGANISATION,
} from "@/lib/ripe-lookup";
import { IpOrganisationsTable, type OrgGroup } from "./ip-organisations-table";

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

function groupRowsByOrganisation(rows: IpOrganisationRow[]): OrgGroup[] {
  const sorted = sortRows(rows);
  const groupMap = new Map<string, OrgGroup>();

  for (const row of sorted) {
    const existing = groupMap.get(row.organisation);
    if (existing) {
      existing.totalEvents += row.eventCount;
      existing.ips.push({ ipAddress: row.ipAddress, eventCount: row.eventCount, location: row.location });
    } else {
      groupMap.set(row.organisation, {
        organisation: row.organisation,
        totalEvents: row.eventCount,
        ips: [{ ipAddress: row.ipAddress, eventCount: row.eventCount, location: row.location }],
      });
    }
  }

  return Array.from(groupMap.values());
}

export default async function IpOrganisationsPage() {
  await ensureVisitorEventsSchema();

  let groups: OrgGroup[] = [];
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

    const flatRows: IpOrganisationRow[] = ipAddressRows.flatMap((row) => {
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
    });

    groups = groupRowsByOrganisation(flatRows);
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
                RIPE whois data is resolved on demand per IP address. Click an organisation row to
                expand or collapse its IPs. Links open the corresponding RIPE DB query.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataErrorMessage ? (
                <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                  {dataErrorMessage}
                </div>
              ) : null}

              {groups.length === 0 ? (
                <p className="text-muted-foreground">No visitor IP addresses recorded yet.</p>
              ) : (
                <IpOrganisationsTable groups={groups} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
