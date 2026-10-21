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
  Layers,
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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
            DRAFT
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-800 border border-sky-300">
            SUBMITTED
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 border border-purple-300">
            UNDER REVIEW
          </span>
        );
      case 'REVIEW_COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
            REVIEW COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-[#D9DFE7] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === ''
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Submitted
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadApplications}
            disabled={loading}
            title="Refresh application list"
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#0B5F59] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Application
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold">Unable to Load Applications</div>
            <div className="text-red-700 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-xs border border-[#D9DFE7] overflow-hidden">
        <div className="px-6 py-3.5 border-b border-[#D9DFE7] bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0B2545] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0F766E]" />
            Registered Applications ({total})
          </div>
          <div className="text-[11px] text-slate-500">
            Showing records persisted in SQLite database
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
            Loading application records...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No applications found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery || statusFilter
                ? 'No application records match your current filter criteria.'
                : 'Get started by creating your first institutional application or running the seed script.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#0B5F59] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create First Application
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9DFE7] bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Application Reference</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4">Pipeline</th>
                  <th className="py-3 px-4 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0B2545]">
                      {app.application_reference}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {app.institution.institution_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono pl-5">
                        {app.institution.institution_identifier || app.institution.id}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {app.category_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {app.academic_year || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(app.lifecycle_status)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono text-slate-600">
                        {app.pipeline_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px]">
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
