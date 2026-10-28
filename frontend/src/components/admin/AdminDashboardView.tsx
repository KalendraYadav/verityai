import React, { useState, useEffect } from 'react';
import {
  fetchApplications,
  fetchAuditEvents,
  fetchUsersList,
  type ApplicationListItem,
  type AuditEventItem,
} from '../../api/client';
import {
  ShieldAlert,
  Users,
  FileText,
  History,
  Network,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Props {
  onNavigateToTab: (tab: string) => void;
  onSelectApplication: (id: string) => void;
}

export const AdminDashboardView: React.FC<Props> = ({
  onNavigateToTab,
  onSelectApplication,
}) => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function loadData() {
    try {
      const [appsRes, auditsRes, usersRes] = await Promise.all([
        fetchApplications({ page_size: 8 }),
        fetchAuditEvents(8),
        fetchUsersList({ pageSize: 1 }).catch(() => ({ meta: { total: 0 } })),
      ]);

      setApplications(appsRes.data);
      setAuditEvents(auditsRes);
      setTotalUsers(usersRes.meta.total);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner - Linea Midnight Slate-Navy */}
      <div className="bg-[#1F3954] rounded-3xl p-6 sm:p-8 text-[#FAF5F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#2D4E70]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/10 text-[#FAF5F0] border border-white/20 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-sans font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-[#33CC7A]" />
              Regulatory Administrator Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-[30px] font-display font-bold tracking-tight text-white leading-[1.2]">Executive Platform Oversight</h1>
          <p className="text-xs sm:text-sm text-[#BACDE0] max-w-2xl leading-relaxed font-sans font-normal">
            Centralized platform governance, scrutiny officer access provisioning, statutory registry configuration,
            and cryptographic audit oversight.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 text-[#FAF5F0] border-white/20 rounded-full px-4 gap-1.5 text-xs font-medium font-sans"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#33CC7A]' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
          </Button>
          <button
            type="button"
            onClick={() => onNavigateToTab('users')}
            className="main-btn btn-hover !py-2 !px-4 text-xs font-medium gap-1.5 cursor-pointer shadow-xs font-sans"
          >
            <Users className="w-3.5 h-3.5 text-white" />
            <span>Manage Access</span>
          </button>
        </div>
      </div>

      {/* Metric Cards - Linea Warm Paper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* User Accounts */}
        <div
          onClick={() => onNavigateToTab('users')}
          className="bg-white rounded-2xl border border-[#EEE5DC] p-5 shadow-[0_2px_8px_rgba(27,20,17,0.03)] hover:border-[#1B1411]/30 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#536174]">
            <span className="text-xs font-medium font-sans">Provisioned Accounts</span>
            <div className="size-8 rounded-full bg-[#FAF5F0] text-[#202936] flex items-center justify-center border border-[#EEE5DC] group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-[28px] font-display font-semibold text-[#202936] my-2">{totalUsers}</div>
          <div className="text-xs text-[#202936] font-medium flex items-center gap-1 pt-1 border-t border-[#EEE5DC] font-sans">
            <span>Manage roles &amp; accounts</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Portfolio Dossiers */}
        <div
          onClick={() => onNavigateToTab('applications')}
          className="bg-white rounded-2xl border border-[#EEE5DC] p-5 shadow-[0_2px_8px_rgba(27,20,17,0.03)] hover:border-[#1B1411]/30 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#536174]">
            <span className="text-xs font-medium font-sans">Institutional Dossiers</span>
            <div className="size-8 rounded-full bg-[#FAF5F0] text-[#1F3954] flex items-center justify-center border border-[#EEE5DC] group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-[28px] font-display font-semibold text-[#202936] my-2">{applications.length}</div>
          <div className="text-xs text-[#1F3954] font-medium flex items-center gap-1 pt-1 border-t border-[#EEE5DC] font-sans">
            <span>Inspect institutional queue</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Gateways Health */}
        <div
          onClick={() => onNavigateToTab('gateways')}
          className="bg-white rounded-2xl border border-[#EEE5DC] p-5 shadow-[0_2px_8px_rgba(27,20,17,0.03)] hover:border-[#1B1411]/30 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#536174]">
            <span className="text-xs font-medium font-sans">External Gateways</span>
            <div className="size-8 rounded-full bg-[#E8F8F0] text-[#1B804D] flex items-center justify-center border border-[#33CC7A]/30 group-hover:scale-105 transition-transform">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-[28px] font-display font-semibold text-[#202936] my-2 flex items-center gap-2">
            <span>4 / 4</span>
            <span className="text-xs rounded-full bg-[#E8F8F0] text-[#1B804D] font-sans px-2 py-0.5 font-medium">
              Healthy
            </span>
          </div>
          <div className="text-xs text-[#1B804D] font-medium flex items-center gap-1 pt-1 border-t border-[#EEE5DC] font-sans">
            <span>Inspect AISHE / NAD / UIDAI</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Audit Log Events */}
        <div
          onClick={() => onNavigateToTab('audit')}
          className="bg-white rounded-2xl border border-[#EEE5DC] p-5 shadow-[0_2px_8px_rgba(27,20,17,0.03)] hover:border-[#1B1411]/30 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[#536174]">
            <span className="text-xs font-medium font-sans">Recorded Audit Trail</span>
            <div className="size-8 rounded-full bg-[#FAF5F0] text-[#D97706] flex items-center justify-center border border-[#EEE5DC] group-hover:scale-105 transition-transform">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-[28px] font-display font-semibold text-[#202936] my-2">{auditEvents.length}+</div>
          <div className="text-xs text-[#D97706] font-medium flex items-center gap-1 pt-1 border-t border-[#EEE5DC] font-sans">
            <span>View tamper-evident records</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Governance Content: Portfolio Oversight & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Institutional Applications Oversight */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEE5DC] flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-display font-semibold text-[#202936]">Application Portfolio Oversight</h2>
                <p className="text-xs text-[#536174] font-sans">
                  High-level institutional status across active regulatory cycles
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('applications')}
                className="inline-flex items-center gap-1 text-[#202936] hover:text-[#33CC7A] text-xs font-medium transition-colors font-sans"
              >
                <span>View Full Portfolio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAF5F0] border-b border-[#EEE5DC] text-xs font-medium text-[#536174] font-sans tracking-normal">
                    <TableHead className="px-4 py-3 text-[#536174] font-medium text-xs font-sans">Reference &amp; Institution</TableHead>
                    <TableHead className="px-4 py-3 text-[#536174] font-medium text-xs font-sans">Category</TableHead>
                    <TableHead className="px-4 py-3 text-[#536174] font-medium text-xs font-sans">Lifecycle</TableHead>
                    <TableHead className="px-4 py-3 text-[#536174] font-medium text-xs font-sans">Pipeline Status</TableHead>
                    <TableHead className="px-4 py-3 text-right text-[#536174] font-medium text-xs font-sans">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {applications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-[#FAF5F0]/60 border-b border-[#EEE5DC]/60 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="font-medium text-sm text-[#202936] font-sans truncate max-w-[220px]">
                          {app.institution.institution_name}
                        </div>
                        <div className="text-xs text-[#536174] font-mono mt-0.5">
                          {app.application_reference}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <span className="font-sans text-xs rounded-full bg-[#EEE5DC] text-[#202936] px-2.5 py-0.5 font-medium">
                          {app.category_code}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={app.lifecycle_status} category="lifecycle" />
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={app.pipeline_status} category="pipeline" />
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectApplication(app.id);
                            onNavigateToTab('applications');
                          }}
                          className="text-xs font-medium text-[#202936] hover:text-[#33CC7A] bg-[#FAF5F0] hover:bg-[#EEE5DC] border border-[#EEE5DC] rounded-full px-3 py-1 transition-all font-sans"
                        >
                          Inspect
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Administrative Directives Notice */}
          <div className="bg-[#FAF5F0] rounded-2xl border border-[#EEE5DC] p-4 text-xs text-[#536174] flex items-start gap-3 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-[#33CC7A] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#202936] font-sans">Regulatory Governance Principle:</span>
              <p className="mt-0.5 leading-relaxed font-sans font-normal">
                Under institutional governance guidelines, administrative officers maintain system integrity, gateways,
                and user provisioning. <strong>All final statutory approval or rejection decisions</strong> remain strictly
                within the purview of designated statutory scrutiny committees. Administrative privileges do not grant unilateral
                approval power.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Platform Security & Governance Stream */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEE5DC]">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-[#FAF5F0] text-[#202936] flex items-center justify-center border border-[#EEE5DC]">
                  <History className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-display font-semibold text-[#202936]">Audit Trail Stream</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('audit')}
                className="text-xs font-medium text-[#202936] hover:text-[#33CC7A] transition-colors font-sans"
              >
                Full Trail
              </button>
            </div>

            <div className="space-y-2.5">
              {auditEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#536174] font-sans">
                  No audit events recorded yet
                </div>
              ) : (
                auditEvents.map((ev) => (
                  <div key={ev.id} className="text-xs space-y-0.5 pb-2 border-b border-[#EEE5DC]/60 last:border-none">
                    <div className="flex items-center justify-between">
                      <span className="font-medium font-mono text-xs text-[#202936]">
                        {ev.event_type}
                      </span>
                      <span className="text-xs text-[#536174] font-mono">
                        {new Date(ev.occurred_at).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-[#536174] flex items-center justify-between font-sans">
                      <span>Actor: {ev.actor_id || 'System'}</span>
                      <span className="text-xs font-mono text-[#536174]">
                        {ev.application_id ? `App: ${ev.application_id.slice(0, 8)}...` : 'GLOBAL'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Gateway Status Widget */}
          <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEE5DC]">
              <span className="text-sm font-display font-semibold text-[#202936]">Statutory Gateway Health</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('gateways')}
                className="text-xs font-medium text-[#202936] hover:text-[#33CC7A] transition-colors font-sans"
              >
                Configure
              </button>
            </div>

            <div className="space-y-2 text-xs font-sans">
              <div className="flex items-center justify-between py-1 border-b border-[#EEE5DC]/60">
                <span className="text-[#202936] font-medium">AISHE Institutional Directory</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B804D] bg-[#E8F8F0] rounded-full px-2.5 py-0.5 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#33CC7A]" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#EEE5DC]/60">
                <span className="text-[#202936] font-medium">DigiLocker / NAD Academic Records</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B804D] bg-[#E8F8F0] rounded-full px-2.5 py-0.5 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#33CC7A]" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#EEE5DC]/60">
                <span className="text-[#202936] font-medium">UIDAI Aadhaar Sign Verification</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B804D] bg-[#E8F8F0] rounded-full px-2.5 py-0.5 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#33CC7A]" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#202936] font-medium">MCA21 Society Registry</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B804D] bg-[#E8F8F0] rounded-full px-2.5 py-0.5 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-[#33CC7A]" /> Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
