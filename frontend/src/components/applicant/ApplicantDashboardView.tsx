import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  fetchApplications,
  fetchInstitutions,
  type ApplicationListItem,
  type UserProfile,
  type Institution,
} from '../../api/client';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Props {
  currentUser: UserProfile | null;
  onOpenNewApplication: () => void;
  onSelectApplication: (id: string) => void;
  onResumeDraft?: (id: string) => void;
}

export const ApplicantDashboardView: React.FC<Props> = ({
  currentUser,
  onOpenNewApplication,
  onSelectApplication,
  onResumeDraft,
}) => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appData, instList] = await Promise.all([
        fetchApplications({ page: 1, page_size: 50 }),
        fetchInstitutions(),
      ]);
      setApplications(appData.data || []);

      if (currentUser?.institution_id) {
        const found = instList.find(
          (i) => i.id === currentUser.institution_id || i.institution_identifier === currentUser.institution_id
        );
        if (found) setInstitution(found);
      } else if (appData.data.length > 0) {
        setInstitution(appData.data[0].institution as unknown as Institution);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load institutional applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Derived counts
  const stats = useMemo(() => {
    const total = applications.length;
    const drafts = applications.filter((a) => a.lifecycle_status === 'DRAFT').length;
    const submitted = applications.filter((a) => a.lifecycle_status === 'SUBMITTED').length;
    const underScrutiny = applications.filter((a) => a.lifecycle_status === 'UNDER_SCRUTINY').length;
    const completed = applications.filter(
      (a) => a.lifecycle_status === 'SCRUTINY_COMPLETED' || a.lifecycle_status === 'APPROVED'
    ).length;
    return { total, drafts, submitted, underScrutiny, completed };
  }, [applications]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        statusFilter === 'ALL' || app.lifecycle_status === statusFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        app.application_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category_code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7">
      {/* ── Institutional Header Banner (Refined & Spacious) ───────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1F3954] p-6 sm:p-8 text-[#FAF5F0] shadow-md border border-[#2E4F73]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#FAF5F0]/10 text-xs font-medium tracking-wide text-[#BACDE0] border border-[#FAF5F0]/15 font-sans">
              <Building2 className="w-3.5 h-3.5 text-[#33CC7A]" />
              <span>AICTE Institutional Portal</span>
            </div>
            <h1 className="text-2xl sm:text-[30px] font-display font-bold tracking-tight text-white leading-[1.15]">
              {institution?.institution_name || currentUser?.display_name || 'Institutional Applicant Portal'}
            </h1>
            {institution?.institution_identifier && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#BACDE0] font-sans">
                <span>ID: <strong className="text-white font-mono font-medium">{institution.institution_identifier}</strong></span>
                <span>•</span>
                <span>Category: <strong className="text-white font-medium">{institution.institution_type?.replace(/_/g, ' ') || 'ENGINEERING & TECHNOLOGY'}</strong></span>
                <span>•</span>
                <span>State: <strong className="text-white font-medium">{institution.state || 'National'}</strong></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenNewApplication}
              className="main-btn btn-hover !py-2.5 !px-5 text-xs font-medium gap-2 cursor-pointer shadow-sm font-sans"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>New Application</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              title="Refresh applications"
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF5F0] border border-white/20 inline-flex items-center justify-center transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#37C2CC]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Cards (Refined Linea Warm Paper) ──────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#E5DACF] p-4 sm:p-5 space-y-1 shadow-[0_2px_8px_rgba(27,20,17,0.03)]">
          <div className="flex items-center justify-between text-[#536174] text-xs font-semibold">
            <span>Total Portfolios</span>
            <Layers className="w-3.5 h-3.5 text-[#536174]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#202936] tracking-tight">{stats.total}</div>
          <div className="text-[11px] text-[#536174]">Active cycles</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5DACF] p-4 sm:p-5 space-y-1 shadow-[0_2px_8px_rgba(27,20,17,0.03)]">
          <div className="flex items-center justify-between text-[#536174] text-xs font-semibold">
            <span>Drafts</span>
            <Clock className="w-3.5 h-3.5 text-[#D97706]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#202936] tracking-tight">{stats.drafts}</div>
          <div className="text-[11px] text-[#536174]">In progress</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5DACF] p-4 sm:p-5 space-y-1 shadow-[0_2px_8px_rgba(27,20,17,0.03)]">
          <div className="flex items-center justify-between text-[#536174] text-xs font-semibold">
            <span>Submitted</span>
            <FileCheck2 className="w-3.5 h-3.5 text-[#1F3954]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F3954] tracking-tight">{stats.submitted}</div>
          <div className="text-[11px] text-[#536174]">Awaiting review</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5DACF] p-4 sm:p-5 space-y-1 shadow-[0_2px_8px_rgba(27,20,17,0.03)]">
          <div className="flex items-center justify-between text-[#536174] text-xs font-semibold">
            <span>Under Scrutiny</span>
            <span className="size-2 rounded-full bg-[#33CC7A] animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#202936] tracking-tight">{stats.underScrutiny}</div>
          <div className="text-[11px] text-[#1B804D] font-medium">In evaluation</div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-[#E5DACF] p-4 sm:p-5 space-y-1 shadow-[0_2px_8px_rgba(27,20,17,0.03)]">
          <div className="flex items-center justify-between text-[#536174] text-xs font-semibold">
            <span>Determinations</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1B804D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#202936] tracking-tight">{stats.completed}</div>
          <div className="text-[11px] text-[#536174]">Decided dossiers</div>
        </div>
      </div>

      {/* ── Applications Filter & List Table ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] shadow-[0_4px_24px_-4px_rgba(27,20,17,0.05)] overflow-hidden">
        {/* Table Header and Controls */}
        <div className="p-5 border-b border-[#E5DACF] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF5F0]/40">
          <div>
            <h2 className="text-[17px] sm:text-[18px] font-display font-bold tracking-tight text-[#202936]">Institutional Application Records</h2>
            <p className="text-xs text-[#536174] mt-0.5">
              Review and manage all statutory approval dossiers submitted by this institution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#536174] pointer-events-none" />
              <input
                id="applicant-dossier-search-input"
                name="dossier_search"
                aria-label="Search institutional dossiers by reference"
                type="text"
                placeholder="Search reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 text-xs h-9 rounded-full border border-[#E5DACF] bg-white focus:outline-hidden focus:border-[#1B1411] text-[#202936]"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center bg-[#EEE5DC] p-1 rounded-full border border-[#E5DACF] text-xs">
              {(['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`h-7 text-[11px] px-3 font-semibold rounded-full transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#1F3954] text-[#FAF5F0] shadow-sm'
                      : 'text-[#536174] hover:text-[#202936]'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF5F0] text-xs font-medium text-[#536174] border-b border-[#E5DACF] font-sans tracking-normal">
                <th className="py-3 px-5 font-medium text-xs font-sans text-[#536174]">Application Reference</th>
                <th className="py-3 px-4 font-medium text-xs font-sans text-[#536174]">Category</th>
                <th className="py-3 px-4 font-medium text-xs font-sans text-[#536174]">Academic Year</th>
                <th className="py-3 px-4 font-medium text-xs font-sans text-[#536174]">Lifecycle Status</th>
                <th className="py-3 px-4 font-medium text-xs font-sans text-[#536174]">Documents</th>
                <th className="py-3 px-4 font-medium text-xs font-sans text-[#536174]">Last Updated</th>
                <th className="py-3 px-5 text-right font-medium text-xs font-sans text-[#536174]">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#E5DACF]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#536174] font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#202936] mb-2" />
                    <span>Loading institutional applications...</span>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#536174]">
                    <div className="w-12 h-12 rounded-full bg-[#EEE5DC] text-[#202936] flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-display font-semibold text-[#202936]">No applications found</div>
                    <p className="text-xs text-[#536174] mt-1 max-w-sm mx-auto font-sans font-normal">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'No applications match the selected filter criteria.'
                        : 'Your institution has not created any applications yet. Click below to begin a new statutory approval dossier.'}
                    </p>
                    {!searchQuery && statusFilter === 'ALL' && (
                      <button
                        type="button"
                        onClick={onOpenNewApplication}
                        className="mt-4 gap-1.5 px-4 py-2 bg-[#33CC7A] text-[#202936] font-medium text-xs rounded-full inline-flex items-center cursor-pointer shadow-sm font-sans"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create First Application</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[#FAF5F0]/60 cursor-pointer transition-colors group"
                    onClick={() => onSelectApplication(app.id)}
                  >
                    <td className="py-3.5 px-5 font-mono font-medium text-[#202936]">
                      {app.application_reference}
                    </td>
                    <td className="py-3.5 px-4 text-[#202936]">
                      <span className="font-sans font-medium text-xs bg-[#EEE5DC] text-[#202936] px-2.5 py-0.5 rounded-full">
                        {app.category_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#536174] font-sans text-xs">
                      {app.academic_year || '2026-27'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.lifecycle_status} category="lifecycle" />
                    </td>
                    <td className="py-3.5 px-4 text-[#536174]">
                      <span className="inline-flex items-center gap-1 font-medium text-xs bg-[#EEE5DC]/70 border border-[#E5DACF] px-2.5 py-0.5 rounded-full text-[#202936] font-sans">
                        <FileCheck2 className="w-3 h-3 text-[#33CC7A]" />
                        {app.document_count || 0} attached
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#536174] font-sans">
                      {new Date(app.updated_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {app.lifecycle_status === 'DRAFT' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onResumeDraft) {
                              onResumeDraft(app.id);
                            } else {
                              onSelectApplication(app.id);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium h-8 px-3.5 bg-[#33CC7A] hover:bg-[#2EB86E] text-[#202936] rounded-full transition-all cursor-pointer shadow-xs font-sans"
                        >
                          <span>Resume Draft</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectApplication(app.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold h-8 px-3.5 border border-[#E5DACF] bg-[#FAF5F0] hover:bg-[#EEE5DC] text-[#202936] rounded-full transition-all cursor-pointer"
                        >
                          <span>View Dossier</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#536174]" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Statutory Guidance & Process Checklist ──────────────────────── */}
      <div className="bg-[#FAF5F0] rounded-2xl border border-[#E5DACF] p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-[#202936]">
          <ShieldCheck className="w-5 h-5 text-[#33CC7A]" />
          <h3 className="text-sm font-bold">AICTE Statutory Submission Procedure (APH 2024-27)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white border border-[#E5DACF] space-y-2 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-[#1F3954] text-[#33CC7A] font-bold flex items-center justify-center text-xs">
              1
            </div>
            <div className="font-bold text-[#202936]">Initiate Draft</div>
            <p className="text-[#536174] leading-relaxed">
              Select category and declare key infrastructure, land, and student intake numbers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E5DACF] space-y-2 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-[#1F3954] text-[#33CC7A] font-bold flex items-center justify-center text-xs">
              2
            </div>
            <div className="font-bold text-[#202936]">Dynamic Checklist</div>
            <p className="text-[#536174] leading-relaxed">
              System calculates required certificates based on land ownership, building age, and intake.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E5DACF] space-y-2 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-[#1F3954] text-[#33CC7A] font-bold flex items-center justify-center text-xs">
              3
            </div>
            <div className="font-bold text-[#202936]">Document Upload</div>
            <p className="text-[#536174] leading-relaxed">
              Upload mandatory certificates. Readability and digital signatures are verified automatically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E5DACF] space-y-2 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-[#1F3954] text-[#33CC7A] font-bold flex items-center justify-center text-xs">
              4
            </div>
            <div className="font-bold text-[#202936]">Formal Submission</div>
            <p className="text-[#536174] leading-relaxed">
              Submit once all mandatory items are verified. Dossier is permanently locked for scrutiny.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
