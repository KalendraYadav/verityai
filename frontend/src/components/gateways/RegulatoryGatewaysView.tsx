import React, { useState, useEffect } from 'react';
import {
  Network,
  ShieldCheck,
  Radio,
  Lock,
  RefreshCw,
  Server,
  Activity,
} from 'lucide-react';
import {
  fetchRegulatoryPortals,
  probeRegulatoryPortalHealth,
  fetchPortalSyncHistory,
  type ExternalPortalConfigItem,
  type ExternalPortalSyncLogItem,
  type ExternalPortalHealthData,
} from '../../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const RegulatoryGatewaysView: React.FC = () => {
  const [portals, setPortals] = useState<ExternalPortalConfigItem[]>([]);
  const [syncHistory, setSyncHistory] = useState<ExternalPortalSyncLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [probeResults, setProbeResults] = useState<Record<string, ExternalPortalHealthData>>({});

  async function loadData() {
    setLoading(true);
    try {
      const [portsRes, histRes] = await Promise.all([
        fetchRegulatoryPortals(),
        fetchPortalSyncHistory(50),
      ]);
      setPortals(portsRes);
      setSyncHistory(histRes);
    } catch (err: unknown) {
      console.error('Failed to load regulatory portal configuration', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleProbeHealth(providerId: string) {
    setProbingId(providerId);
    try {
      const res = await probeRegulatoryPortalHealth(providerId);
      setProbeResults((prev) => ({ ...prev, [providerId]: res }));
      const updatedHistory = await fetchPortalSyncHistory(50);
      setSyncHistory(updatedHistory);
    } catch (err: unknown) {
      console.error(`Health probe failed for ${providerId}`, err);
    } finally {
      setProbingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Network className="size-6 text-primary shrink-0" />
              Regulatory Gateways
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage external regulatory connections, statutory registries, and secured verification endpoints.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-8 gap-1.5 text-xs text-muted-foreground self-start sm:self-auto"
          title="Refresh Gateways"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh Gateways</span>
        </Button>
      </div>

      {/* 2. SSRF Protection Architecture Card */}
      <Card className="border-border shadow-[0_1px_3px_0_rgba(23,27,69,0.04)]">
        <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Outbound SSRF Protection Engine Active
              </CardTitle>
              <CardDescription className="text-xs text-emerald-700 font-medium">
                RFC-1918 Private IP Filter · Cloud Metadata Blocker · Bounded Response Ceiling
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold gap-1">
            <Lock className="size-3" />
            PROTECTION ENFORCED
          </Badge>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-primary block">Destination Scheme & Host Validation</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Enforces strict HTTPS schemes. Hostnames are resolved through secure DNS and checked against RFC-1918 and loopback CIDRs before connecting.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-destructive block">Cloud Metadata Defense</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Blocks <code>169.254.169.254</code> (AWS/GCP/Azure instance metadata), link-local IPv6, and internal subnets (<code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code>).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">Response Ceiling & Timeout</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Strict 10-second request timeout ceiling with 1MB maximum response payload streaming cap to prevent denial-of-service from malicious endpoints.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. The Gateway Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border p-5 space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))
        ) : (
          portals.map((portal) => {
            const probe = probeResults[portal.provider_id];
            const isProbing = probingId === portal.provider_id;

            return (
              <Card
                key={portal.id}
                className="border-border shadow-[0_1px_3px_0_rgba(23,27,69,0.04)] flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-secondary text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        <Radio className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-xs font-bold text-foreground leading-tight">
                          {portal.name}
                        </CardTitle>
                        <CardDescription className="font-mono text-[10px] text-primary">
                          {portal.provider_id}
                        </CardDescription>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold uppercase ${
                        portal.provider_type === 'LOCAL_SYNTHETIC'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : portal.provider_type === 'CONFIGURABLE_REST'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-red-50 text-destructive border-red-200'
                      }`}
                    >
                      {portal.provider_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {portal.description}
                  </p>
                </CardHeader>

                <CardContent className="px-4 sm:px-5 py-2 space-y-3">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Authority:</span>
                      <span className="font-semibold text-foreground">{portal.statutory_authority}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auth Protocol:</span>
                      <span className="font-mono text-primary">{portal.auth_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timeout Ceiling:</span>
                      <span className="font-mono text-foreground">{portal.timeout_seconds}s</span>
                    </div>
                  </div>

                  {probe && (
                    <div className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                      probe.status === 'ONLINE'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                        : probe.status === 'UNCONFIGURED'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                        : 'bg-red-50/80 border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          <Activity className="size-3" />
                          Status: {probe.status}
                        </span>
                        {probe.latency_ms !== null && probe.latency_ms !== undefined && (
                          <span className="font-mono text-[10px]">{probe.latency_ms}ms</span>
                        )}
                      </div>
                      <p className="text-[10px] leading-tight opacity-90">{probe.message}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-4 sm:p-5 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProbeHealth(portal.provider_id)}
                    disabled={isProbing}
                    className="w-full h-8 text-xs gap-1.5"
                  >
                    <RefreshCw className={`size-3 ${isProbing ? 'animate-spin' : ''}`} />
                    <span>{isProbing ? 'Probing Gateway...' : 'Probe Live Health'}</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* 4. Outbound Synchronization & Verification Audit Trail */}
      <Card className="border-border shadow-[0_1px_3px_0_rgba(23,27,69,0.04)] overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-primary shrink-0" />
            <CardTitle className="text-sm font-semibold text-foreground">
              Outbound Regulatory Gateway Sync & Health Audit ({syncHistory.length})
            </CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border">
            Zero Secret Exposure · Ephemeral TLS
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                  TIMESTAMP
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                  PROVIDER ID
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                  ACTION
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                  TARGET REF
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                  OUTCOME
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                  HTTP STATUS
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                  LATENCY
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    No outbound gateway synchronizations recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                syncHistory.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono font-bold text-xs text-primary">
                      {item.provider_id}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-medium text-xs text-foreground">
                      {item.action}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {item.target_identifier || 'N/A'}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${
                          item.status === 'SUCCESS' || item.status === 'ONLINE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'BLOCKED_SSRF'
                            ? 'bg-red-50 text-destructive border-red-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-[11px] text-foreground">
                      {item.http_status_code || '—'}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {item.response_latency_ms !== null && item.response_latency_ms !== undefined ? `${item.response_latency_ms} ms` : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
