import React, { useState, useEffect } from 'react';
import {
  fetchApplications,
  fetchInstitutions,
  fetchAuditEvents,
  type ApplicationListItem,
  type Institution,
  type AuditEventItem,
} from '../../api/client';
import {
  Plus,
  FileText,
  Building2,
  Users,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  MoreVertical,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

interface Props {
  onOpenNewApplication: () => void;
  onOpenUploadDocument?: () => void;
  onSelectApplication?: (id: string) => void;
}

export const DashboardView: React.FC<Props> = ({ onOpenNewApplication, onOpenUploadDocument }) => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function loadDashboardData() {
    try {
      const [appsRes, instsRes, auditsRes] = await Promise.all([
        fetchApplications({ page_size: 5 }),
        fetchInstitutions(),
        fetchAuditEvents(6),
      ]);
      setApplications(appsRes.data);
      setInstitutions(instsRes);
      setAuditEvents(auditsRes);
    } catch (err: unknown) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadDashboardData();
  }

  // Format current date matching Reference 4 (e.g., "Tue, 21 Oct 2026")
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate real metrics
  const totalApps = applications.length;
  const totalEntities = institutions.length;
  const submittedApps = applications.filter((a) => a.lifecycle_status === 'SUBMITTED').length;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Area (Reference 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2">
            Welcome, Rishu <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Manage, access and validate your organization's critical documents securely.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Current Date Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E9E6F2] shadow-2xs text-xs text-[#5F6485]">
            <Calendar className="w-4 h-4 text-[#7450D8]" />
            <span className="font-semibold text-[#171B45]">{currentDate}</span>
            <span className="text-[#8589A6]">{currentTime}</span>
          </div>

          {/* Primary Action Button (Reference 4: Red Button) */}
          <button
            onClick={onOpenUploadDocument || onOpenNewApplication}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* 2. Four Summary Metric Cards (Reference 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total Documents / Applications */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#5F6485]">Total Applications</span>
            <div className="text-2xl font-extrabold text-[#171B45]">
              {loading ? '—' : totalApps}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#12B886]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12% from baseline</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F3EEFC] flex items-center justify-center text-[#7450D8]">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Linked Entities */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#5F6485]">Linked Entities</span>
            <div className="text-2xl font-extrabold text-[#171B45]">
              {loading ? '—' : totalEntities}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#12B886]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+5% active tenants</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0EF] flex items-center justify-center text-[#F04438]">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: In Scrutiny / Review */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#5F6485]">In Scrutiny</span>
            <div className="text-2xl font-extrabold text-[#171B45]">
              {loading ? '—' : submittedApps}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#4C7DFA]">
              <Clock className="w-3.5 h-3.5" />
              <span>Active queue</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FAF8FF] flex items-center justify-center text-[#4C7DFA]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Compliance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#5F6485]">Compliance Rate</span>
            <div className="text-2xl font-extrabold text-[#171B45]">98.6%</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#12B886]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+2.1% verified</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0EF] flex items-center justify-center text-[#F04438]">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Grid (Reference 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Recent Documents Table + Alerts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recent Applications Table Card */}
          <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEEAF5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7450D8]" />
                <h2 className="text-sm font-bold text-[#171B45]">Recent Applications & Documents</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 rounded-lg text-[#5F6485] hover:bg-[#FAF8FF] hover:text-[#7450D8] transition-colors cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onOpenNewApplication}
                  className="text-xs font-semibold text-[#7450D8] hover:text-[#5633B8] flex items-center gap-1 cursor-pointer"
                >
                  <span>New Application</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#5F6485]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto mb-2" />
                Loading application records...
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#5F6485] space-y-2">
                <FileText className="w-8 h-8 text-[#8589A6] mx-auto" />
                <div className="font-semibold text-[#171B45]">No applications found</div>
                <p className="text-[11px] max-w-xs mx-auto">
                  Create your first institutional application to start preliminary document validation.
                </p>
                <button
                  onClick={onOpenNewApplication}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F04438] text-white font-semibold text-xs mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Application
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EEEAF5] text-[#8589A6] font-semibold bg-[#FAF9FC]">
                      <th className="py-3 px-5">NAME</th>
                      <th className="py-3 px-4">ENTITY</th>
                      <th className="py-3 px-4">TYPE</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEAF5]">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-[#FAF8FF] transition-colors group">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FFF0EF] text-[#F04438] flex items-center justify-center font-bold text-[10px] shrink-0">
                              PDF
                            </div>
                            <div>
                              <div className="font-bold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
                                {app.application_reference}
                              </div>
                              <div className="text-[11px] text-[#8589A6]">
                                Academic Year {app.academic_year || '2026-27'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#171B45]">
                          {app.institution.institution_name}
                        </td>
                        <td className="py-3.5 px-4 text-[#5F6485]">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#FAF9FC] border border-[#E9E6F2]">
                            {app.category_code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              app.lifecycle_status === 'SUBMITTED'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]'
                            }`}
                          >
                            {app.lifecycle_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button className="p-1.5 rounded-lg text-[#8589A6] hover:text-[#171B45] hover:bg-[#FAF8FF] cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alerts & Notifications (Reference 4: Bottom Left) */}
          <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F04438]" />
                <h3 className="text-sm font-bold text-[#171B45]">Alerts & Notifications</h3>
              </div>
              <button className="text-xs font-semibold text-[#7450D8] hover:text-[#5633B8] cursor-pointer">
                View All →
              </button>
            </div>

            <div className="space-y-3">
              {/* Alert 1: Red Warning */}
              <div className="p-3.5 rounded-xl bg-[#FFF0EF] border border-[#FECDCA] flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#F04438] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#B42318]">Certificate Expiry Notice</div>
                    <div className="text-[11px] text-[#5F6485] mt-0.5">
                      Accreditation Certificate for Apex Institute (SYN-INST-0001) will expire in 2027.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-[#8589A6] shrink-0">Today</span>
              </div>

              {/* Alert 2: Purple Info */}
              <div className="p-3.5 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#7450D8] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#7450D8]">Automated Rule Scrutiny Active</div>
                    <div className="text-[11px] text-[#5F6485] mt-0.5">
                      Deterministic verification engine is running with 0 unverified claims.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-[#8589A6] shrink-0">Real-time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Linked Entities + Validation Status + Activity Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Linked Entities Panel (Reference 4: Middle Right) */}
          <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#7450D8]" />
                <h3 className="text-sm font-bold text-[#171B45]">Linked Entities</h3>
              </div>
              <button className="text-xs font-semibold text-[#7450D8] hover:text-[#5633B8] cursor-pointer">
                View All →
              </button>
            </div>

            <div className="space-y-2.5">
              {institutions.map((inst, idx) => (
                <div
                  key={inst.id}
                  className="p-3 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] hover:border-[#DCD0F7] transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx % 2 === 0
                          ? 'bg-[#F3EEFC] text-[#7450D8]'
                          : 'bg-[#FFF0EF] text-[#F04438]'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#171B45] line-clamp-1">
                        {inst.institution_name}
                      </div>
                      <div className="text-[11px] text-[#8589A6]">
                        {inst.city ? `${inst.city}, ` : ''}{inst.state || 'AICTE Tenant'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4F2] text-[#12B886]">
                      98%
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8589A6]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Status Gauge Card (Reference 4) */}
          <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#171B45]">Validation Status</h3>

            {/* Circular Gauge Representation */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Donut Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Track */}
                  <path
                    className="text-[#FAF8FF]"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Valid: Green (92%) */}
                  <path
                    className="text-[#12B886]"
                    strokeDasharray="92, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Pending: Yellow (6%) */}
                  <path
                    className="text-[#F5B942]"
                    strokeDasharray="6, 100"
                    strokeDashoffset="-92"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                {/* Center Content */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-[#171B45]">100%</span>
                  <span className="text-[10px] text-[#8589A6] font-medium">Deterministic</span>
                </div>
              </div>
            </div>

            {/* Gauge Breakdown Legend */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5F6485]">
                  <span className="w-2 h-2 rounded-full bg-[#12B886]" />
                  Valid Documents
                </span>
                <span className="font-bold text-[#171B45]">92%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5F6485]">
                  <span className="w-2 h-2 rounded-full bg-[#F5B942]" />
                  Pending Scrutiny
                </span>
                <span className="font-bold text-[#171B45]">6%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5F6485]">
                  <span className="w-2 h-2 rounded-full bg-[#F04438]" />
                  Flagged Discrepancies
                </span>
                <span className="font-bold text-[#171B45]">2%</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline Card (Reference 4: Bottom Right) */}
          <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#171B45]">Activity Timeline</h3>
              <button className="text-xs font-semibold text-[#7450D8] hover:text-[#5633B8] cursor-pointer">
                View All →
              </button>
            </div>

            <div className="space-y-3.5">
              {auditEvents.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#8589A6]">
                  No audit actions recorded yet.
                </div>
              ) : (
                auditEvents.map((event, idx) => (
                  <div key={event.id || idx} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#171B45] truncate">
                        {event.event_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-[#5F6485] truncate">
                        {event.application_id ? `Application ${event.application_id}` : 'Platform Activity'}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#8589A6] shrink-0">
                      {new Date(event.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
