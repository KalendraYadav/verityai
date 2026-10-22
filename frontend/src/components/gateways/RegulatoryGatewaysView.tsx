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
      // Also refresh sync history to show the audit record
      const updatedHistory = await fetchPortalSyncHistory(50);
      setSyncHistory(updatedHistory);
    } catch (err: unknown) {
      console.error(`Health probe failed for ${providerId}`, err);
    } finally {
      setProbingId(null);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2.5">
            <Network className="w-6 h-6 text-[#7450D8]" />
            Regulatory Gateways & Outbound SSRF Defenses
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Interoperability layer for statutory authorities, external registries, and AICTE approval databases with strict SSRF controls.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-[#E9E6F2] text-[#5F6485] hover:bg-[#FAF8FF] hover:text-[#7450D8] transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh Gateways"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2. SSRF Shield Security Architecture Card */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#EEEAF5] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF3] text-[#027A48] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#171B45]">
                Outbound SSRF Protection Engine Active
              </h2>
              <span className="text-[11px] text-[#027A48] font-semibold">
                RFC-1918 Private IP Filter · Cloud Metadata Blocker · Bounded Response Ceiling
              </span>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            PROTECTION ENFORCED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#7450D8] block">Destination Scheme & Host Validation</span>
            <p className="text-[11px] text-[#5F6485]">
              Enforces strict HTTPS schemes. Hostnames are resolved through secure DNS and checked against RFC-1918 and loopback CIDRs before connecting.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#B42318] block">Cloud Metadata Defense</span>
            <p className="text-[11px] text-[#5F6485]">
              Blocks <code>169.254.169.254</code> (AWS/GCP/Azure instance metadata), link-local IPv6, and internal subnets (<code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code>).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#175CD3] block">Response Ceiling & Timeout</span>
            <p className="text-[11px] text-[#5F6485]">
              Strict 10-second request timeout ceiling with 1MB maximum response payload streaming cap to prevent denial-of-service from malicious endpoints.
            </p>
          </div>
        </div>
      </div>

      {/* 3. The Gateway Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {portals.map((portal) => {
          const probe = probeResults[portal.provider_id];
          const isProbing = probingId === portal.provider_id;

          return (
            <div
              key={portal.id}
              className="bg-white rounded-2xl border border-[#E9E6F2] p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#DCD0F7] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center font-bold text-xs">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#171B45] leading-tight">
                        {portal.name}
                      </h3>
                      <span className="font-mono text-[10px] text-[#7450D8]">
                        {portal.provider_id}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    portal.provider_type === 'LOCAL_SYNTHETIC'
                      ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                      : portal.provider_type === 'CONFIGURABLE_REST'
                      ? 'bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]'
                      : 'bg-[#FFF0EF] text-[#B42318] border border-[#FECDCA]'
                  }`}>
                    {portal.provider_type.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-[#5F6485] leading-relaxed">
                  {portal.description}
                </p>

                <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#8589A6]">Authority:</span>
                    <span className="font-semibold text-[#171B45]">{portal.statutory_authority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8589A6]">Auth Protocol:</span>
                    <span className="font-mono text-[#7450D8]">{portal.auth_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8589A6]">Timeout Limit:</span>
                    <span className="font-mono text-[#171B45]">{portal.timeout_seconds}s</span>
                  </div>
                </div>

                {/* Probe result indicator */}
                {probe && (
                  <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                    probe.status === 'ONLINE'
                      ? 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]'
                      : probe.status === 'UNCONFIGURED'
                      ? 'bg-[#FFF6ED] border-[#FECDCA] text-[#C4320A]'
                      : 'bg-[#FFF0EF] border-[#FECDCA] text-[#B42318]'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" />
                        Status: {probe.status}
                      </span>
                      {probe.latency_ms !== null && probe.latency_ms !== undefined && (
                        <span className="font-mono text-[10px]">{probe.latency_ms}ms</span>
                      )}
                    </div>
                    <p className="text-[10px] leading-tight opacity-90">{probe.message}</p>
                  </div>
                )}
              </div>

              {/* Probe Action Button */}
              <div className="pt-2 border-t border-[#EEEAF5]">
                <button
                  onClick={() => handleProbeHealth(portal.provider_id)}
                  disabled={isProbing}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] hover:bg-[#F3EEFC] text-[#7450D8] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                  {isProbing ? 'Probing Gateway...' : 'Probe Live Health'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Outbound Synchronization & Verification Audit Trail */}
      <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEEAF5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#7450D8]" />
            <h2 className="text-sm font-bold text-[#171B45]">
              Outbound Regulatory Gateway Sync & Health Audit ({syncHistory.length})
            </h2>
          </div>
          <span className="text-[11px] text-[#8589A6]">
            Immutable Outbound Call Ledger · Zero Secret Exposure
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9FC] border-b border-[#EEEAF5] text-[11px] font-bold text-[#5F6485] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Provider ID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Ref</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">HTTP Status</th>
                <th className="py-3 px-4">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEAF5]">
              {syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8589A6]">
                    No outbound gateway synchronizations recorded yet.
                  </td>
                </tr>
              ) : (
                syncHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8FF] transition-colors">
                    <td className="py-3 px-4 text-[#8589A6] font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#7450D8]">
                      {item.provider_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#171B45]">
                      {item.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#5F6485]">
                      {item.target_identifier || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'SUCCESS' || item.status === 'ONLINE'
                          ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                          : item.status === 'BLOCKED_SSRF'
                          ? 'bg-[#FFF0EF] text-[#B42318] border border-[#FECDCA]'
                          : 'bg-[#FAF9FC] text-[#5F6485] border border-[#E9E6F2]'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#171B45]">
                      {item.http_status_code || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#8589A6]">
                      {item.response_latency_ms !== null && item.response_latency_ms !== undefined ? `${item.response_latency_ms} ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
