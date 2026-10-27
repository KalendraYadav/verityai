import React, { useState, useEffect } from 'react';
import {
  fetchApplications,
  fetchInstitutions,
  fetchCategories,
  type ApplicationListItem,
  type Institution,
  type ApplicationCategory,
} from '../api/client';
import { ApplicationCreateModal } from './ApplicationCreateModal';
import { DocumentUploadModal } from './documents/DocumentUploadModal';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  AlertCircle,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

interface Props {
  onSelectApplication?: (applicationId: string) => void;
  userRole?: string;
}

export function ApplicationList({ onSelectApplication, userRole }: Props = {}) {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [uploadModalAppId, setUploadModalAppId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1B1411]">
              Institutional Application Register
            </h1>
            <span className="text-xs font-bold bg-[#EBF7F0] text-[#1B1411] border border-[#33CC7A]/30 px-3 py-0.5 rounded-full">
              {total} Dossiers
            </span>
          </div>
          <p className="text-xs text-[#66574F] mt-1">
            Search, filter, and inspect regulatory applications and associated supporting documentation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={loadApplications}
            disabled={loading}
            title="Refresh application list"
            className="h-9 px-4 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#66574F] hover:text-[#1B1411] inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-[#33CC7A]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {userRole !== 'REVIEWER' && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="h-9 px-4 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#1B1411] inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-[0_2px_10px_rgba(51,204,122,0.25)] cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>New Application</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] p-3 sm:p-4 shadow-[0_4px_24px_-4px_rgba(27,20,17,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#EEE5DC] p-1 rounded-full border border-[#E5DACF] text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`h-7 px-3.5 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                statusFilter === ''
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
              }`}
            >
              All Applications
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DRAFT')}
              className={`h-7 px-3.5 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                statusFilter === 'DRAFT'
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
              }`}
            >
              Drafts
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`h-7 px-3.5 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
              }`}
            >
              Submitted
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UNDER_REVIEW')}
              className={`h-7 px-3.5 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                statusFilter === 'UNDER_REVIEW'
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
              }`}
            >
              Under Review
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex-1 md:max-w-xs">
          <Search className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66574F] pointer-events-none" />
          <input
            id="application-search-input"
            name="application_search"
            aria-label="Search applications by reference or institution"
            type="text"
            placeholder="Search reference or institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 text-xs pl-9 pr-4 rounded-full border border-[#E5DACF] bg-[#FAF5F0]/50 focus:bg-white focus:outline-hidden focus:border-[#1B1411] text-[#1B1411]"
          />
        </form>
      </div>

      {/* 3. Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle className="text-xs font-semibold">Unable to Load Applications</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* 4. Applications Table Card */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] shadow-[0_4px_24px_-4px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-5 border-b border-[#E5DACF] flex flex-row items-center justify-between bg-[#FAF5F0]/40">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2 text-[#1B1411]">
              <FileText className="size-4 text-[#1F3954] shrink-0" />
              Registered Application Dossiers
            </h2>
            <p className="text-xs text-[#66574F] mt-0.5">
              Showing {applications.length} of {total} records from the regulatory store.
            </p>
          </div>
          <span className="font-mono text-[10px] text-[#66574F] bg-[#EEE5DC] border border-[#E5DACF] px-2.5 py-0.5 rounded-full">
            SQLite WAL · Immutable Audit
          </span>
        </div>

        <div>
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : applications.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="No applications found"
                description={
                  searchQuery || statusFilter
                    ? 'No application dossiers match your active filter criteria.'
                    : 'Get started by creating your first institutional application dossier.'
                }
                actionLabel={userRole !== 'REVIEWER' ? 'Create First Application' : undefined}
                onAction={userRole !== 'REVIEWER' ? () => setIsModalOpen(true) : undefined}
              />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    APPLICATION REFERENCE
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    INSTITUTION
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    CATEGORY
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    ACADEMIC YEAR
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    LIFECYCLE STATUS
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    PIPELINE
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    LAST MODIFIED
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4 text-right">
                    ACTIONS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.id}
                    onClick={() => onSelectApplication?.(app.id)}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-md bg-secondary text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          APP
                        </div>
                        <span className="font-mono font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                          {app.application_reference}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <div className="font-medium text-xs text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[200px]" title={app.institution.institution_name}>
                          {app.institution.institution_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono pl-5">
                        {app.institution.institution_identifier || app.institution.id.slice(0, 8)}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <Badge variant="outline" className="font-mono text-[10px] bg-secondary text-primary border-primary/20">
                        {app.category_code}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="size-3 text-muted-foreground" />
                        {app.academic_year || '—'}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <StatusBadge status={app.lifecycle_status} category="lifecycle" />
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <StatusBadge status={app.pipeline_status} category="pipeline" showIcon={false} />
                    </TableCell>

                    <TableCell className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                      {new Date(app.updated_at).toLocaleDateString()} {new Date(app.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>

                    <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        {onSelectApplication && (
                          <button
                            type="button"
                            onClick={() => onSelectApplication(app.id)}
                            className="h-7 text-xs font-bold gap-1 px-3.5 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#1B1411] inline-flex items-center transition-all cursor-pointer shadow-xs"
                            title="Open Application Scrutiny Dossier"
                          >
                            <span>Scrutinize</span>
                            <ArrowRight className="size-3" />
                          </button>
                        )}
                        {userRole !== 'REVIEWER' && (
                          <button
                            type="button"
                            onClick={() => setUploadModalAppId(app.id)}
                            className="h-7 text-xs font-semibold gap-1 px-3 rounded-full border border-[#E5DACF] bg-[#FAF5F0] hover:bg-[#EEE5DC] text-[#1B1411] inline-flex items-center transition-colors cursor-pointer"
                            title="Upload Document"
                          >
                            <Upload className="size-3 text-[#1F3954]" />
                            <span className="hidden sm:inline">Upload</span>
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <ApplicationCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadApplications}
        institutions={institutions}
        categories={categories}
      />

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={!!uploadModalAppId}
        initialApplicationId={uploadModalAppId || undefined}
        onClose={() => setUploadModalAppId(null)}
        onSuccess={() => {
          setUploadModalAppId(null);
          loadApplications();
        }}
      />
    </div>
  );
}
