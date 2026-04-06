"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRipeDbLookupUrl, UNKNOWN_RESPONSIBLE_ORGANISATION } from "@/lib/ripe-lookup";

export type IpRow = {
  ipAddress: string;
  eventCount: number;
  location: string;
};

export type OrgGroup = {
  organisation: string;
  totalEvents: number;
  ips: IpRow[];
};

interface IpOrganisationsTableProps {
  groups: OrgGroup[];
}

export function IpOrganisationsTable({ groups }: IpOrganisationsTableProps) {
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.organisation))
  );

  const allExpanded = expandedOrgs.size === groups.length;

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedOrgs(new Set());
    } else {
      setExpandedOrgs(new Set(groups.map((g) => g.organisation)));
    }
  };

  const toggleOrg = (organisation: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(organisation)) {
        next.delete(organisation);
      } else {
        next.add(organisation);
      }
      return next;
    });
  };

  const totalIps = groups.reduce((sum, g) => sum + g.ips.length, 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {groups.length} organisation{groups.length !== 1 ? "s" : ""} &middot; {totalIps} IP
          address{totalIps !== 1 ? "es" : ""}
        </p>
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </div>

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
            {groups.map((group) => {
              const isExpanded = expandedOrgs.has(group.organisation);
              const isUnknown = group.organisation === UNKNOWN_RESPONSIBLE_ORGANISATION;

              return (
                <>
                  {/* Organisation group header row */}
                  <tr
                    key={`org-${group.organisation}`}
                    className="cursor-pointer border-b bg-muted/40 hover:bg-muted/60"
                    onClick={() => toggleOrg(group.organisation)}
                    aria-expanded={isExpanded}
                  >
                    <td className="py-3 pr-4 font-semibold">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className={isUnknown ? "text-muted-foreground italic" : undefined}>
                          {group.organisation}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {group.ips.length} IP{group.ips.length !== 1 ? "s" : ""}
                    </td>
                    <td className="py-3 pr-4">{group.totalEvents}</td>
                    <td className="py-3 pr-4" />
                    <td className="py-3 pr-4" />
                  </tr>

                  {/* Per-IP detail rows (shown when group is expanded) */}
                  {isExpanded &&
                    group.ips.map((ip) => (
                      <tr key={ip.ipAddress} className="border-b align-top">
                        <td className="py-2.5 pl-9 pr-4 text-muted-foreground">
                          <span className="sr-only">{group.organisation}</span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs">{ip.ipAddress}</td>
                        <td className="py-2.5 pr-4">{ip.eventCount}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{ip.location}</td>
                        <td className="py-2.5 pr-4">
                          <a
                            href={getRipeDbLookupUrl(ip.ipAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            Open RIPE DB
                          </a>
                        </td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
