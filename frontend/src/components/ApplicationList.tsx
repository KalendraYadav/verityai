import { useState, useEffect } from 'react';
import {
  fetchApplications,
  fetchInstitutions,
  fetchCategories,
  type ApplicationListItem,
  type Institution,
  type ApplicationCategory,
} from '../api/client';
import { ApplicationCreateModal } from './ApplicationCreateModal';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  Inbox,
  AlertCircle,
} from 'lucide-react';

export function ApplicationList() {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  async function loadMetadata() {
    try {
      const [insts, cats] = await Promise.all([
        fetchInstitutions(),
        fetchCategories(),
      ]);
      setInstitutions(insts);
      setCategories(cats);
    } catch (err: unknown) {
      console.error('Failed to load institutions or categories metadata', err);
    }
  }

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApplications({
        lifecycle_status: statusFilter || undefined,
        q: searchQuery.trim() || undefined,
      });
      setApplications(res.data);
      setTotal(res.meta.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadApplications();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8FF] text-[#7450D8] border border-[#DCD0F7]">
            DRAFT
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
            SUBMITTED
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3EEFC] text-[#5633B8] border border-[#CBB3E8]">
            UNDER REVIEW
          </span>
        );
      case 'REVIEW_COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4F2] text-[#12B886] border border-[#12B886]/30">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-5">
      {/* Action and Filter Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E9E6F2] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl border border-[#E9E6F2] bg-[#FAF8FF] p-1 text-xs">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === ''
                  ? 'bg-white text-[#7450D8] shadow-xs'
                  : 'text-[#5F6485] hover:text-[#171B45]'
              }`}
            >
              All Applications
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-[#7450D8] shadow-xs'
                  : 'text-[#5F6485] hover:text-[#171B45]'
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-white text-[#7450D8] shadow-xs'
                  : 'text-[#5F6485] hover:text-[#171B45]'
              }`}
            >
              Submitted
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8589A6]" />
            <input
              type="text"
              placeholder="Search reference or institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#E9E6F2] bg-[#FAF9FC] pl-9 pr-3 py-2 text-[#171B45] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7450D8]/20 focus:border-[#7450D8] transition-all"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadApplications}
            disabled={loading}
            title="Refresh application list"
            className="p-2 rounded-xl border border-[#E9E6F2] text-[#5F6485] hover:bg-[#FAF8FF] hover:text-[#7450D8] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Application
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FFF0EF] border border-[#FECDCA] text-[#B42318] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#F04438] shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold">Unable to Load Applications</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Applications Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E9E6F2] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EEEAF5] bg-white flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-[#171B45] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#7450D8]" />
            Registered Applications ({total})
          </div>
          <div className="text-[11px] text-[#8589A6]">
            SQLite Persistence · WAL Mode
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#5F6485] text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7450D8] mb-2" />
            Loading application records...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8FF] border border-[#DCD0F7] flex items-center justify-center mx-auto text-[#7450D8] mb-3">
              <Inbox className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-[#171B45]">No applications found</h4>
            <p className="text-xs text-[#5F6485] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
              {searchQuery || statusFilter
                ? 'No application records match your current filter criteria.'
                : 'Get started by creating your first institutional application or running the seed script.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create First Application
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold">
                  <th className="py-3 px-5">APPLICATION REFERENCE</th>
                  <th className="py-3 px-4">INSTITUTION</th>
                  <th className="py-3 px-4">CATEGORY</th>
                  <th className="py-3 px-4">ACADEMIC YEAR</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">PIPELINE</th>
                  <th className="py-3 px-4 text-right">LAST UPDATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAF5]">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-[#FAF8FF] transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#FFF0EF] text-[#F04438] flex items-center justify-center font-bold text-[10px] shrink-0">
                          PDF
                        </div>
                        <span className="font-mono font-bold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
                          {app.application_reference}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#171B45] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#8589A6] shrink-0" />
                        {app.institution.institution_name}
                      </div>
                      <div className="text-[11px] text-[#8589A6] font-mono pl-5">
                        {app.institution.institution_identifier || app.institution.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5F6485]">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#FAF9FC] border border-[#E9E6F2]">
                        {app.category_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5F6485]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#8589A6]" />
                        {app.academic_year || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(app.lifecycle_status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono text-[#5F6485]">
                        {app.pipeline_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#8589A6] text-[11px]">
                      {new Date(app.updated_at).toLocaleDateString()} {new Date(app.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <ApplicationCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadApplications}
        institutions={institutions}
        categories={categories}
      />
    </div>
  );
}
